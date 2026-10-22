const { userFromReq, database, rootTransaction, newId, isoNow } = require('./_shared');
const PROVIDER_URL = () => process.env.SMM_PROVIDER_URL || '';
async function provider(payload) {
  const r = await fetch(PROVIDER_URL(), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ key: process.env.SMM_PROVIDER_KEY, ...payload }), signal: AbortSignal.timeout(20000) });
  const raw = await r.text(); let d; try { d = JSON.parse(raw); } catch { d = { error: raw.slice(0,300) }; }
  if (!r.ok || d.error) throw new Error(String(d.error || 'Provider request failed').slice(0,300));
  return d;
}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const user = await userFromReq(req);
    if (!user) return res.status(401).json({ error: 'Please sign in first.' });
    if (req.method === 'GET') {
      const root = (await database().ref('/').get()).val() || {};
      const orders = Object.values(root.orders || {}).filter(x => x.user_id === user.id).sort((a,b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0,50);
      return res.status(200).json({ orders });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Use GET or POST' }); }
    if (!PROVIDER_URL() || !process.env.SMM_PROVIDER_KEY) return res.status(503).json({ error: 'Provider is not configured. Add SMM_PROVIDER_URL and SMM_PROVIDER_KEY as private server environment variables.' });
    const b = req.body || {}, service = String(b.service || '').trim(), link = String(b.link || '').trim(), quantity = Number(b.quantity);
    if (!service || service.length > 100 || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000000) return res.status(400).json({ error: 'Enter a valid service ID, link and quantity.' });
    let u; try { u = new URL(link); } catch { return res.status(400).json({ error: 'Enter a valid target URL.' }); }
    if (!['http:','https:'].includes(u.protocol)) return res.status(400).json({ error: 'Target link must use HTTP or HTTPS.' });
    const list = await provider({ action: 'services' });
    if (!Array.isArray(list)) return res.status(502).json({ error: 'Provider did not return a valid services list.' });
    const svc = list.find(x => String(x.service) === service);
    if (!svc) return res.status(400).json({ error: 'Service ID was not found at the provider.' });
    const min = Number(svc.min || 1), max = Number(svc.max || 10000000);
    if (quantity < min || quantity > max) return res.status(400).json({ error: `Quantity must be between ${min} and ${max} for this service.` });
    const rate = Number(svc.rate);
    if (!Number.isFinite(rate) || rate < 0) return res.status(502).json({ error: 'Provider service has an invalid rate.' });
    const markup = Number(process.env.SMM_MARKUP_PERCENT || 0);
    if (!Number.isFinite(markup) || markup < 0 || markup > 500) return res.status(503).json({ error: 'SMM_MARKUP_PERCENT must be between 0 and 500.' });
    const charge = Math.round((rate * quantity / 1000) * (1 + markup / 100) * 100) / 100;
    const orderId = newId(), created_at = isoNow(); let reserved = null;
    await rootTransaction(root => {
      root = root || {}; root.wallets = root.wallets || {}; root.orders = root.orders || {}; root.walletTransactions = root.walletTransactions || {};
      const wallet = root.wallets[user.id] || { balance: 0 }, balance = Number(wallet.balance || 0);
      if (balance < charge) throw new Error(`Insufficient wallet balance. Required Rs ${charge}; available Rs ${balance}`);
      wallet.balance = Math.round((balance - charge) * 100) / 100; root.wallets[user.id] = wallet;
      root.orders[orderId] = { id: orderId, user_id: user.id, service_id: service, service_name: String(svc.name || '').slice(0,200), target_link: link, quantity, charge, provider_order_id: null, status: 'processing', error_message: null, created_at, updated_at: created_at };
      const txId = newId(); root.walletTransactions[txId] = { id: txId, user_id: user.id, order_id: orderId, kind: 'order_charge', amount: -charge, note: 'Order charge reserved', created_at };
      reserved = { id: orderId, charge, balance: wallet.balance }; return root;
    });
    try {
      const result = await provider({ action: 'add', service, link, quantity: String(quantity) });
      if (!result.order) throw new Error(String(result.error || 'Provider response did not include an order ID.'));
      await rootTransaction(root => { root = root || {}; const order = root.orders?.[orderId]; if (!order || order.status !== 'processing') return root; order.provider_order_id = String(result.order).slice(0,200); order.status = 'pending'; order.updated_at = isoNow(); return root; });
      return res.status(201).json({ ok: true, order_id: orderId, provider_order_id: result.order, charge, balance: reserved.balance, status: 'pending' });
    } catch (e) {
      await rootTransaction(root => {
        root = root || {}; const order = root.orders?.[orderId]; if (!order || order.status !== 'processing') return root;
        root.wallets = root.wallets || {}; const wallet = root.wallets[user.id] || { balance: 0 };
        wallet.balance = Math.round((Number(wallet.balance || 0) + charge) * 100) / 100; root.wallets[user.id] = wallet;
        order.status = 'failed'; order.error_message = String(e.message || 'Provider error').slice(0,500); order.updated_at = isoNow();
        root.walletTransactions = root.walletTransactions || {}; const txId = newId();
        root.walletTransactions[txId] = { id: txId, user_id: user.id, order_id: orderId, kind: 'order_refund', amount: charge, note: 'Automatic refund: provider rejected order', created_at: order.updated_at }; return root;
      });
      return res.status(502).json({ error: 'Provider rejected the order; the reserved wallet amount has been refunded.', details: String(e.message || 'Provider error') });
    }
  } catch (e) {
    const msg = String(e.message || 'Order request failed.');
    return res.status(msg.includes('Insufficient wallet balance') ? 400 : 500).json({ error: msg });
  }
};
