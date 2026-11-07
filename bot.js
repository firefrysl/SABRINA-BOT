const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const express = require('express');
const P = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const sharp = require('sharp');

const app = express();
let qrDataURL = null;
let conectado = false;
app.get('/', (req, res) => {
  if (conectado) return res.send('<h1>✅ CONECTADA</h1>');
  if (qrDataURL) return res.send(`<center><img src="${qrDataURL}" style="width:320px"></center>`);
  res.send('Iniciando...');
});
app.listen(10000, '0.0.0.0');

async function iniciar() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./auth_sabrina');
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'fatal' }), browser: ['Sabrina','Chrome','1.0'] });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    if (u.qr) qrDataURL = await QRCode.toDataURL(u.qr);
    if (u.connection === 'open') { conectado = true; qrDataURL = null; console.log('CONECTADA'); }
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) { conectado = false; setTimeout(iniciar, 3000); }
  });

  setInterval(async () => {
    try { const groups = await sock.groupFetchAllParticipating(); for (let id in groups) { await sock.groupSettingUpdate(id, 'not_announcement'); } } catch(e){}
  }, 20000);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
    const cmd = texto.toLowerCase().trim();
    console.log(`Mensaje: ${cmd} de ${from}`);

    try {
      if (cmd === '#menu') {
        console.log('Intentando responder #menu...');
        await sock.sendMessage(from, { text: `Aquí estoy mi amor 💋\n\n📸 #img\n📋 #menu\n🏓 #ping` });
        console.log('Respuesta #menu enviada OK');
      }
      if (cmd === '#img') {
        console.log('Intentando responder #img...');
        if (fs.existsSync('./cod.jpg')) {
          await sock.sendMessage(from, { image: fs.readFileSync('./cod.jpg'), caption: `Aquí estoy mi amor, precios COD 💋` });
        } else {
          await sock.sendMessage(from, { text: `Aquí estoy mi amor, súbeme la foto cod.jpg 💋` });
        }
        console.log('Respuesta #img enviada OK');
      }
      if (cmd === '#ping') {
        await sock.sendMessage(from, { text: `Activa mi amor 💋` });
        console.log('Ping enviado');
      }
      if (cmd === '#abrir') {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await sock.sendMessage(from, { text: `Abierto mi amor 🔓` });
      }
    } catch (err) {
      console.log('ERROR AL ENVIAR:', err.message, err.stack);
    }
  });
}
iniciar();
