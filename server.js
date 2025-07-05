const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const purchaseLogs = [];

app.get('/', (req, res) => {
  res.json({ message: 'Spacelol backend is live' });
});

app.post('/api/purchase', (req, res) => {
  const { wallet, amount, txSig } = req.body;

  if (!wallet || !amount || !txSig) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  purchaseLogs.push({ wallet, amount, txSig, timestamp: Date.now() });
  console.log('📝 New Purchase:', wallet, amount, txSig);
  res.json({ success: true });
});

app.get('/api/purchases', (req, res) => {
  res.json(purchaseLogs);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
