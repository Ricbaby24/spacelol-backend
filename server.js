// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const {
  getOrCreateAssociatedTokenAccount,
  transfer,
  getMint,
} = require('@solana/spl-token');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
});
app.use(limiter);

// Solana Config
const connection = new Connection(process.env.SOLANA_RPC, 'confirmed');
const mintAuthority = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.MINT_AUTHORITY_SECRET_KEY))
);
const MINT = new PublicKey(process.env.MINT_ADDRESS);
const PRICE = parseFloat(process.env.TOKEN_PRICE_PER_SPLOL);

// In-memory leaderboard
const leaderboard = [];

// === Purchase Route ===
app.post('/api/purchase', async (req, res) => {
  const { wallet, amount, txSig } = req.body;

  if (!wallet || !amount || !txSig) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const buyer = new PublicKey(wallet);

  try {
    const mintInfo = await getMint(connection, MINT);
    const tokensToSend = Math.floor((amount / PRICE) * 10 ** mintInfo.decimals);

    const buyerATA = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      MINT,
      buyer
    );
    const senderATA = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      MINT,
      mintAuthority.publicKey
    );

    await transfer(
      connection,
      mintAuthority,
      senderATA.address,
      buyerATA.address,
      mintAuthority,
      tokensToSend
    );

    const log = `✅ ${new Date().toISOString()} - Sent ${tokensToSend} SPLOL to ${wallet} | TX: ${txSig}`;
    console.log(log);
    fs.appendFileSync('logs.txt', log + '\n');

    leaderboard.push({
      wallet,
      amount,
      txSig,
      time: new Date().toISOString(),
    });

    res.json({ success: true, tokensSent: tokensToSend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Token transfer failed' });
  }
});

// === Verify Transaction ===
app.post('/api/verify', async (req, res) => {
  const { txSig, wallet, amount } = req.body;

  if (!txSig || !wallet || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const tx = await connection.getTransaction(txSig, {
      commitment: 'confirmed',
    });

    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const paid = tx.meta?.postBalances[0] < tx.meta?.preBalances[0];
    const fromPubkey = tx.transaction.message.accountKeys[0].toString();

    if (paid && fromPubkey === wallet) {
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: 'Invalid transaction' });
    }
  } catch (err) {
    console.error('❌ Backend error:', err);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

// === Leaderboard Route ===
app.get('/api/leaderboard', (req, res) => {
  const sorted = leaderboard.sort((a, b) => b.amount - a.amount);
  res.json(sorted);
});

// === Health Check ===
app.get('/', (req, res) => {
  res.json({ message: 'Spacelol backend is live' });
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
