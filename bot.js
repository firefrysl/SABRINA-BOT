const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const P = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;
let qrDataURL = null;
let conectado = false;

app.get('/', (req, res) => {
  if (conectado) return res.send('<center><h1>✅ SABRINA CONECTADA 💋</h1><p>Bot funcionando</p></center>');
  if (qrDataURL) return res.send(`<center><h1>Escanea amor</h1><img src="${qrDataURL}" style="width:320px"></center>`);
  res.send('<center><h1>⏳ Sabrina activa...</h1></center>');
});

app.listen(PORT, '0.0.0.0', () => console.log('Web OK ' + PORT));

async function iniciar() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./auth_sabrina');
  
  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'fatal' }),
    printQRInTerminal: true,
    browser: ['Sabrina PRO', 'Chrome', '1.0'],
    markOnlineOnConnect: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;
    if (qr) qrDataURL = await QRCode.toDataURL(qr);
    if (connection === 'open') { conectado = true; qrDataURL = null; console.log('>>> CONECTADA <<<'); }
    if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      conectado = false;
      setTimeout(iniciar, 4000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message) return;
      
      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
      const cmd = texto.toLowerCase().trim();

      console.log(`Mensaje: ${texto} de ${from}`);

      if (cmd === '#menu' || cmd === '#help' || cmd === 'menu' || cmd === '#menu ') {
        await sock.sendMessage(from, { 
          text: `💋 *SABRINA PRO - MENU* 💋\n\n*GRUPOS:*\n#todos - Menciona a todos\n#abrir - Abre grupo\n#cerrar - Cierra grupo\n#kick @user\n\n*DIVERSIÓN:*\n#ping\n#voz + texto\n#sticker\n\n_¡Escribe el comando!_`
        });
      }
      
      if (cmd === '#ping') {
        await sock.sendMessage(from, { text: '🏓 Pong! Sabrina activa bb 💋' });
      }

      if (cmd.startsWith('#todos')) {
        if (!isGroup) return;
        const metadata = await sock.groupMetadata(from);
        const participants = metadata.participants.map(p => p.id);
        let txt = texto.slice(6).trim() || 'Atención a todos 💋';
        await sock.sendMessage(from, { text: `*AVISO:*\n${txt}`, mentions: participants });
      }

    } catch (e) { console.log('Error msg', e); }
  });
}

iniciar();
