
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, transfer, getMint } = require('@solana/spl-token');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const connection = new Connection(process.env.SOLANA_RPC, 'confirmed');
const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.MINT_AUTHORITY_SECRET_KEY)));
const MINT = new PublicKey(process.env.MINT_ADDRESS);
const PRICE = parseFloat(process.env.TOKEN_PRICE_PER_SPLOL); // 0.0008

// --- Purchase Route ---
app.post('/api/purchase', async (req, res) => {
  const { wallet, amount, txSig } = req.body;

  if (!wallet || !amount || !txSig) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const buyer = new PublicKey(wallet);
  const mintInfo = await getMint(connection, MINT);

  const tokensToSend = Math.floor((amount / PRICE) * 10 ** mintInfo.decimals);

  try {
    const buyerATA = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      MINT,
      buyer
    );

    await transfer(
      connection,
      mintAuthority,
      await getOrCreateAssociatedTokenAccount(connection, mintAuthority, MINT, mintAuthority.publicKey),
      buyerATA.address,
      mintAuthority,
      tokensToSend
    );

    console.log(`✅ Sent ${tokensToSend} SPLOL to ${wallet}`);
    res.json({ success: true, tokensSent: tokensToSend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Token transfer failed' });
  }
});

// Health check and logs
app.get('/', (req, res) => {
  res.json({ message: 'Spacelol backend is live' });
});

// Final route
app.listen(process.env.PORT || 5000, () => {
  console.log(`✅ Server running on port ${process.env.PORT || 5000}`);
});

=======
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, transfer, getMint } = require('@solana/spl-token');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const connection = new Connection(process.env.SOLANA_RPC, 'confirmed');
const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.MINT_AUTHORITY_SECRET_KEY)));
const MINT = new PublicKey(process.env.MINT_ADDRESS);
const PRICE = parseFloat(process.env.TOKEN_PRICE_PER_SPLOL); // 0.0008

// --- Purchase Route ---
app.post('/api/purchase', async (req, res) => {
  const { wallet, amount, txSig } = req.body;

  if (!wallet || !amount || !txSig) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const buyer = new PublicKey(wallet);
  const mintInfo = await getMint(connection, MINT);

  const tokensToSend = Math.floor((amount / PRICE) * 10 ** mintInfo.decimals);

  try {
    const buyerATA = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      MINT,
      buyer
    );

    await transfer(
      connection,
      mintAuthority,
      await getOrCreateAssociatedTokenAccount(connection, mintAuthority, MINT, mintAuthority.publicKey),
      buyerATA.address,
      mintAuthority,
      tokensToSend
    );

    console.log(`✅ Sent ${tokensToSend} SPLOL to ${wallet}`);
    res.json({ success: true, tokensSent: tokensToSend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Token transfer failed' });
  }
});

// Health check and logs
app.get('/', (req, res) => {
  res.json({ message: 'Spacelol backend is live' });
});

// Final route
app.listen(process.env.PORT || 5000, () => {
  console.log(`✅ Server running on port ${process.env.PORT || 5000}`);
});

