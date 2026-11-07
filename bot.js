const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;
let qrImage = null;
let isConnected = false;

app.get('/', async (req, res) => {
  if (isConnected) {
    return res.send('<h1>✅ Sabrina CONECTADA 💋</h1><p>Ya puedes usar #menu en WhatsApp</p>');
  }
  if (qrImage) {
    res.send(`<h1>Escanea este QR amor</h1><img src="${qrImage}" width="300"><p>Actualiza la pagina si expira - WhatsApp > Dispositivos vinculados > Vincular</p>`);
  } else {
    res.send('<h1>Sabrina iniciando... espera 20 segundos y actualiza</h1>');
  }
});

app.listen(PORT, () => console.log(`Web en puerto ${PORT}`));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_sabrina');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'silent' }), printQRInTerminal: true, browser: ["Sabrina", "Chrome", "1.0"] });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, qr } = u;
    if (qr) {
      qrImage = await QRCode.toDataURL(qr);
      console.log('QR generado, ve a tu web .onrender.com');
    }
    if (connection === 'open') {
      isConnected = true;
      qrImage = null;
      console.log('>>> CONECTADA <<<');
    }
    if (connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      startBot();
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    let t = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    if (t.toLowerCase() === '#menu') {
      await sock.sendMessage(from, { text: '💋 Sabrina PRO CONECTADA\n\n#voz\n#todos\n#abrir\n#cerrar' });
    }
  });
}
startBot();
