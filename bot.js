const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const P = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;
let qrDataURL = null;
let conectado = false;

app.get('/', (req, res) => {
  if (conectado) return res.send('<h1>✅ SABRINA CONECTADA 💋</h1>');
  if (qrDataURL) return res.send(`<center><h1>Escanea amor</h1><img src="${qrDataURL}" style="width:320px"><p>WhatsApp > 3 puntitos > Dispositivos vinculados > Vincular</p></center>`);
  res.send('<h1>⏳ Iniciando Sabrina... espera 30 seg y actualiza</h1>');
});

app.listen(PORT, '0.0.0.0', () => console.log('Web OK en ' + PORT));

async function iniciar() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_sabrina');
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), printQRInTerminal: true });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u) => {
      if (u.qr) { qrDataURL = await QRCode.toDataURL(u.qr); console.log('QR LISTO'); }
      if (u.connection === 'open') { conectado = true; qrDataURL = null; console.log('CONECTADA'); }
      if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(iniciar, 3000);
    });
  } catch (e) { console.log('Error', e); setTimeout(iniciar, 5000); }
}
iniciar();
