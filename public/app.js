let firebaseAppPromise = null;
async function getAuth() {
  if (!firebaseAppPromise) firebaseAppPromise = (async () => {
    const response = await fetch('/api/config', { cache: 'no-store' });
    const config = await response.json();
    if (!config.configured || !config.firebaseConfig) throw new Error('Firebase is not configured.');
    if (!window.firebase) throw new Error('Firebase SDK did not load. Check your internet connection.');
    const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(config.firebaseConfig);
    return app.auth();
  })();
  return firebaseAppPromise;
}
function showMsg(text, ok = false, selector = '.msg') {
  const el = document.querySelector(selector); if (!el) return;
  el.textContent = text; el.style.display = 'block';
  el.style.border = '1px solid ' + (ok ? '#24d6a577' : '#ff6b7a77');
  el.style.padding = '10px'; el.style.borderRadius = '9px';
}
async function handleAuth(e) {
  e.preventDefault();
  const form = e.currentTarget, mode = form.dataset.mode, btn = form.querySelector('button[type=submit]');
  btn.disabled = true; const old = btn.textContent; btn.textContent = 'Please wait…';
  try {
    const auth = await getAuth(), data = Object.fromEntries(new FormData(form).entries());
    if (mode === 'login') {
      await auth.signInWithEmailAndPassword(data.email, data.password);
      showMsg('Login successful. Opening dashboard…', true); setTimeout(() => location.href = '/dashboard', 500);
    } else if (mode === 'signup') {
      const cred = await auth.createUserWithEmailAndPassword(data.email, data.password);
      if (data.name) await cred.user.updateProfile({ displayName: data.name });
      showMsg('Account created successfully.', true); setTimeout(() => location.href = '/dashboard', 600);
    } else {
      await auth.sendPasswordResetEmail(data.email, { url: location.origin + '/login', handleCodeInApp: false });
      showMsg('If an account exists, a password-reset link has been sent.', true);
    }
  } catch (err) { showMsg(err.message || 'Something went wrong.'); }
  finally { btn.disabled = false; btn.textContent = old; }
}
document.querySelectorAll('form[data-mode]').forEach(form => form.addEventListener('submit', handleAuth));
function waitForAuth(auth) {
  return new Promise(resolve => {
    const unsubscribe = auth.onAuthStateChanged(user => { unsubscribe(); resolve(user); });
  });
}
async function initDashboard() {
  if (!document.body.dataset.dashboard) return;
  try {
    const auth = await getAuth(), user = await waitForAuth(auth);
    if (!user) { location.href = '/login'; return; }
    const welcome = document.querySelector('#welcome'); if (welcome) welcome.textContent = user.email || user.displayName || user.uid;
    const logout = document.querySelector('#logout');
    if (logout) logout.addEventListener('click', async () => { await auth.signOut(); location.href = '/login'; });
    const getToken = async () => { const current = auth.currentUser; if (!current) throw new Error('Session expired. Log in again.'); return current.getIdToken(); };
    async function loadDeposits() {
      const token = await getToken(), r = await fetch('/api/deposits', { headers: { Authorization: 'Bearer ' + token } }), d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not load wallet');
      const wb = document.getElementById('walletBalance'); if (wb) wb.textContent = Number(d.balance || 0).toFixed(2);
      const body = document.getElementById('depositHistory'); if (!body) return; body.replaceChildren();
      if (!d.deposits.length) { body.innerHTML = '<tr><td colspan="4">No deposits submitted yet.</td></tr>'; return; }
      for (const x of d.deposits) { const tr = document.createElement('tr'); for (const val of [Number(x.amount).toFixed(2), x.transaction_id, x.status, new Date(x.created_at).toLocaleDateString()]) { const td = document.createElement('td'); td.textContent = val; tr.appendChild(td); } body.appendChild(tr); }
    }
    async function loadOrders() {
      const token = await getToken(), r = await fetch('/api/order', { headers: { Authorization: 'Bearer ' + token } }), d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not load order history');
      const body = document.getElementById('orderHistory'); if (!body) return; body.replaceChildren();
      if (!d.orders.length) { body.innerHTML = '<tr><td colspan="5">No orders yet.</td></tr>'; return; }
      for (const x of d.orders) { const tr = document.createElement('tr'); for (const val of [x.service_name || x.service_id, x.quantity, 'Rs ' + Number(x.charge).toFixed(2), x.status, new Date(x.created_at).toLocaleDateString()]) { const td = document.createElement('td'); td.textContent = val; tr.appendChild(td); } body.appendChild(tr); }
    }
    const df = document.getElementById('depositForm');
    if (df) {
      df.addEventListener('submit', async e => {
        e.preventDefault(); const btn = df.querySelector('button'); btn.disabled = true; showMsg('Submitting deposit request…', true, '#depositMsg');
        try {
          const token = await getToken(), v = Object.fromEntries(new FormData(df).entries()); v.amount = Number(v.amount);
          const r = await fetch('/api/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(v) }), d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Deposit request failed');
          showMsg('Request submitted. Admin will verify payment before adding wallet balance.', true, '#depositMsg'); df.reset(); await loadDeposits();
        } catch (err) { showMsg(err.message, false, '#depositMsg'); } finally { btn.disabled = false; }
      });
      try { await loadDeposits(); } catch (e) { showMsg(e.message, false, '#depositMsg'); }
    }
    const form = document.querySelector('#orderForm');
    if (form) form.addEventListener('submit', async e => {
      e.preventDefault(); const button = form.querySelector('button'); button.disabled = true; showMsg('Submitting order…');
      try {
        const token = await getToken(), payload = Object.fromEntries(new FormData(form).entries()); payload.quantity = Number(payload.quantity);
        const r = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(payload) }), out = await r.json();
        if (!r.ok) throw new Error(out.error || 'Order failed');
        showMsg('Order placed. Provider order ID: ' + out.provider_order_id + ' · Charge: Rs ' + Number(out.charge).toFixed(2), true); form.reset(); await loadOrders(); await loadDeposits();
      } catch (err) { showMsg(err.message); } finally { button.disabled = false; }
    });
    try { await loadOrders(); } catch (e) { const h = document.getElementById('orderHistory'); if (h) h.innerHTML = '<tr><td colspan="5">Order history could not be loaded. Check backend setup.</td></tr>'; }
  } catch (err) { showMsg(err.message); }
}
initDashboard();
