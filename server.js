require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Connection, PublicKey, Keypair, clusterApiUrl, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, transfer } = require('@solana/spl-token');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Setup connection
const connection = new Connection(process.env.SOLANA_RPC || clusterApiUrl('mainnet-beta'), 'confirmed');

// Load mint authority wallet from private key array
const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.MINT_AUTHORITY_SECRET_KEY)));
const mintAddress = new PublicKey(process.env.MINT_ADDRESS);
const receiverWallet = new PublicKey(process.env.PRESALE_RECEIVER_WALLET);
const tokenPricePerSplol = parseFloat(process.env.TOKEN_PRICE_PER_SPLOL);

// Endpoint to verify tx and send tokens
app.post('/api/purchase', async (req, res) => {
  try {
    const { buyerWallet, txSignature } = req.body;

    if (!buyerWallet || !txSignature) {
      return res.status(400).json({ error: 'Missing buyerWallet or txSignature' });
    }

    const buyerPublicKey = new PublicKey(buyerWallet);
    const tx = await connection.getParsedTransaction(txSignature, { maxSupportedTransactionVersion: 0 });

    if (!tx || !tx.meta || !tx.meta.postBalances) {
      return res.status(400).json({ error: 'Invalid or unconfirmed transaction' });
    }

    const txReceiver = tx.transaction.message.accountKeys.find(acc => acc.pubkey.equals(receiverWallet));
    if (!txReceiver) {
      return res.status(400).json({ error: 'Transaction did not send to presale wallet' });
    }

    const lamportsSent = tx.meta.postBalances[0] - tx.meta.preBalances[0];
    const solSent = lamportsSent / LAMPORTS_PER_SOL;

    if (solSent <= 0) {
      return res.status(400).json({ error: 'No SOL sent' });
    }

    const splolToSend = Math.floor(solSent / tokenPricePerSplol);

    // Get or create token account for buyer
    const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      mintAddress,
      buyerPublicKey
    );

    // Transfer SPLOL
    const transferSig = await transfer(
      connection,
      mintAuthority,
      mintAuthority.publicKey, // sender (mint wallet)
      buyerTokenAccount.address,
      mintAuthority,
      splolToSend
    );

    return res.status(200).json({
      message: 'Success',
      tokensSent: splolToSend,
      transferSignature: transferSig
    });

  } catch (error) {
    console.error('❌ Error in /api/purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`✅ Spacelol backend running at http:/
