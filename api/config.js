module.exports = (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    firebaseConfig: {
      apiKey: 'AIzaSyDS1D9g9dToIQbrRiMwvgQci7cQM9THykc',
      authDomain: 'sourajit-vfx.firebaseapp.com',
      projectId: 'sourajit-vfx',
      storageBucket: 'sourajit-vfx.firebasestorage.app',
      messagingSenderId: '255333519003',
      appId: '1:255333519003:web:31144d39df2ae22b56c03e',
      measurementId: 'G-6RH2T0ZNSJ'
    },
    databaseURL: 'https://sourajit-vfx-default-rtdb.firebaseio.com',
    configured: true
  });
};
