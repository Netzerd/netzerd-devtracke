// crearAdmin.js
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()   // o tu serviceAccountKey
});

admin.auth().createUser({
  email: 'admin@netzerd.com',
  password: '123456789'
}).then(user => {
  console.log('Administrador creado con UID:', user.uid);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
