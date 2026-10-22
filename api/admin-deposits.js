const crypto = require('crypto');
const { isAdmin, database, rootTransaction, isoNow } = require('./_shared');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAdmin(req)) return res.status(401).json({ error: 'Admin session expired. Log in again.' });
  try {
    if (req.method === 'GET') {
      const root = (await database().ref('/').get()).val() || {};
      const deposits = Object.values(root.deposits || {}).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0,100);
      return res.status(200).json({ deposits });
    }
    if (req.method === 'POST') {
      const id = String(req.body?.id || ''), status = String(req.body?.status || ''), note = String(req.body?.note || '').slice(0,500);
      if (!id || !['approved','rejected'].includes(status)) return res.status(400).json({ error: 'Invalid deposit or status.' });
      let result = null;
      await rootTransaction(root => {
        root = root || {};
        const deposit = root.deposits?.[id];
        if (!deposit) throw new Error('Deposit not found.');
        if (deposit.status !== 'pending') throw new Error('Deposit already reviewed.');
        deposit.status = status; deposit.reviewed_at = isoNow(); deposit.admin_note = note;
        if (status === 'approved') {
          root.wallets = root.wallets || {};
          const wallet = root.wallets[deposit.user_id] || { balance: 0 };
          wallet.balance = Math.round((Number(wallet.balance || 0) + Number(deposit.amount)) * 100) / 100;
          root.wallets[deposit.user_id] = wallet;
          root.walletTransactions = root.walletTransactions || {};
          const txId = crypto.randomUUID();
          root.walletTransactions[txId] = { id: txId, user_id: deposit.user_id, deposit_id: id, kind: 'deposit', amount: Number(deposit.amount), note: 'Admin-approved manual deposit', created_at: deposit.reviewed_at };
        }
        result = { ok: true, status, amount: deposit.amount, user_id: deposit.user_id };
        return root;
      });
      return res.status(200).json(result);
    }
    res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Use GET or POST' });
  } catch (e) { return res.status(400).json({ error: e.message || 'Admin request failed.' }); }
};
