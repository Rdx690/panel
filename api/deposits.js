const { userFromReq, rootTransaction, newId, isoNow, database } = require('./_shared');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const user = await userFromReq(req);
    if (!user) return res.status(401).json({ error: 'Please log in first.' });
    if (req.method === 'POST') {
      const amount = Number(req.body?.amount);
      const transaction_id = String(req.body?.transaction_id || '').trim();
      if (!Number.isFinite(amount) || amount < 100 || amount > 100000) return res.status(400).json({ error: 'Deposit amount must be between Rs 100 and Rs 100,000.' });
      if (transaction_id.length < 6 || transaction_id.length > 100) return res.status(400).json({ error: 'Enter a valid transaction ID.' });
      const id = newId(), created_at = isoNow();
      let created = false;
      await rootTransaction(root => {
        root = root || {}; root.deposits = root.deposits || {}; root.transactionIds = root.transactionIds || {};
        const transactionKey = Buffer.from(transaction_id.toLowerCase()).toString('base64url');
        if (root.transactionIds[transactionKey]) return;
        root.deposits[id] = { id, user_id: user.id, amount, transaction_id, status: 'pending', created_at, reviewed_at: null, admin_note: '' };
        root.transactionIds[transactionKey] = id;
        root.wallets = root.wallets || {}; root.wallets[user.id] = root.wallets[user.id] || { balance: 0 };
        created = true; return root;
      });
      if (!created) return res.status(409).json({ error: 'This transaction ID has already been submitted.' });
      return res.status(201).json({ ok: true, deposit: { id, user_id: user.id, amount, transaction_id, status: 'pending', created_at }, message: 'Request submitted. Wallet updates only after admin verifies payment.' });
    }
    if (req.method === 'GET') {
      const root = (await database().ref('/').get()).val() || {};
      const wallet = root.wallets?.[user.id] || {};
      const deposits = Object.values(root.deposits || {}).filter(x => x.user_id === user.id).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0,50);
      return res.status(200).json({ balance: Number(wallet.balance || 0), deposits });
    }
    res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Use GET or POST' });
  } catch (e) { return res.status(500).json({ error: e.message || 'Deposit request failed.' }); }
};
