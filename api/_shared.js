const crypto = require('crypto');
const admin = require('firebase-admin');

function firebase() {
  if (admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!raw || !databaseURL) {
    throw new Error('Firebase server is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_DATABASE_URL in Vercel.');
  }
  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.'); }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL
  });
  return admin;
}
function database() { return firebase().database(); }
async function userFromReq(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    const decoded = await firebase().auth().verifyIdToken(auth.slice(7));
    return { id: decoded.uid, uid: decoded.uid, email: decoded.email || '' };
  } catch { return null; }
}
function signAdmin() {
  if (!process.env.ADMIN_SESSION_SECRET) throw new Error('Admin session secret is not configured.');
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function isAdmin(req) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    const [p, s] = token.split('.');
    if (!p || !s || !process.env.ADMIN_SESSION_SECRET) return false;
    const want = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(p).digest();
    const got = Buffer.from(s, 'base64url');
    if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return false;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    return payload.role === 'admin' && payload.exp > Date.now();
  } catch { return false; }
}
function newId() { return crypto.randomUUID(); }
function isoNow() { return new Date().toISOString(); }
async function rootTransaction(updater) {
  const ref = database().ref('/');
  const result = await ref.transaction(current => updater(current || {}), undefined, false);
  if (!result.committed) throw new Error('Database update conflicted. Please retry.');
  return result.snapshot.val() || {};
}
module.exports = { firebase, database, userFromReq, signAdmin, isAdmin, newId, isoNow, rootTransaction };
