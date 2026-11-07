const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');
const express = require('express');
const qrcode = require('qrcode-terminal');

// Servidor para Render
const app = express();
const PORT = process.env.PORT || 10000;
let lastQR = null;

app.get('/', (req, res) => {
  if (lastQR) {
    res.send(`<h1>Sabrina PRO - Escanea el QR en los logs de Render</h1><p>QR: ${lastQR}</p><p>Ve a Logs -> Live tail para ver el QR grande</p>`);
  } else {
    res.send('Sabrina PRO activa - esperando QR... revisa los logs');
  }
});
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_sabrina');
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ["Sabrina PRO", "Chrome", "1.0"]
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      lastQR = qr;
      console.log('========== ESCANEA ESTE QR ==========');
      qrcode.generate(qr, { small: true });
      console.log('=====================================');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexion cerrada, reconectando...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('>>> SABRINA CONECTADA CON EXITO <<<');
      lastQR = null;
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    let texto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
    let low = texto.toLowerCase();

    if (low === '#menu' || low === '#help') {
      await sock.sendMessage(from, { text: '💋 *SABRINA PRO ACTIVA* 💋\n\n#voz\n#todos\n#abrir\n#cerrar\n#menu\n\nBot conectado correctamente!' });
    }
    if (low.startsWith('#voz')) {
      await sock.sendMessage(from, { text: 'Hola amorcito 💋 ya estoy activa, soy Sabrina' });
    }
  });
}
startBot
