const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const express = require('express');
const P = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const gTTS = require('gtts');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 10000;
let qrDataURL = null;
let conectado = false;

app.get('/', (req, res) => {
  if (conectado) return res.send('<center><h1>✅ SABRINA CONECTADA 💋</h1></center>');
  if (qrDataURL) return res.send(`<center><h1>QR</h1><img src="${qrDataURL}" style="width:320px"></center>`);
  res.send('<h1>Sabrina activa</h1>');
});
app.listen(PORT, '0.0.0.0', () => console.log('Web OK'));

async function iniciar() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./auth_sabrina');
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'fatal' }), browser: ['Sabrina PRO','Chrome','1.0'], markOnlineOnConnect: true });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    if (u.qr) qrDataURL = await QRCode.toDataURL(u.qr);
    if (u.connection === 'open') { conectado = true; qrDataURL = null; console.log('CONECTADA'); }
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) { conectado = false; setTimeout(iniciar, 4000); }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message) return;
      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      let texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || "";
      let cmd = texto.toLowerCase().trim();

      console.log(cmd);

      // MENU
      if (cmd === '#menu' || cmd === '#help' || cmd === 'menu') {
        await sock.sendMessage(from, { text: `💋 *SABRINA PRO - MENU* 💋\n\n*GRUPOS:*\n#todos - Menciona a todos\n#abrir - Abre grupo\n#cerrar - Cierra grupo\n#kick @user - Saca\n\n*DIVERSIÓN:*\n#ping\n#voz hola como estas\n#sticker (responde a una foto)\n#stikers (igual)\n\n_¡Escribe el comando!_` });
      }

      // PING
      if (cmd === '#ping') {
        await sock.sendMessage(from, { text: '🏓 Pong! Activa bb 💋' });
      }

      // TODOS
      if (cmd.startsWith('#todos')) {
        if (!isGroup) return;
        const metadata = await sock.groupMetadata(from);
        const participants = metadata.participants.map(p => p.id);
        let txt = texto.slice(6).trim() || 'Atención a todos 💋';
        await sock.sendMessage(from, { text: `*AVISO:*\n${txt}`, mentions: participants });
      }

      // ABRIR / CERRAR
      if (cmd === '#abrir') {
        if (!isGroup) return;
        await sock.groupSettingUpdate(from, 'not_announcement');
        await sock.sendMessage(from, { text: '✅ Grupo abierto' });
      }
      if (cmd === '#cerrar') {
        if (!isGroup) return;
        await sock.groupSettingUpdate(from, 'announcement');
        await sock.sendMessage(from, { text: '🔒 Grupo cerrado' });
      }

      // KICK
      if (cmd.startsWith('#kick')) {
        if (!isGroup) return;
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
        if (mentioned && mentioned[0]) {
          await sock.groupParticipantsUpdate(from, mentioned, 'remove');
          await sock.sendMessage(from, { text: `Eliminado` });
        }
      }

      // VOZ - #voz hola
      if (cmd.startsWith('#voz ')) {
        let ttsText = texto.slice(5).trim();
        if (!ttsText) return;
        const gtts = new gTTS(ttsText, 'es');
        const file = './voz.mp3';
        gtts.save(file, async () => {
          await sock.sendMessage(from, { audio: fs.readFileSync(file), mimetype: 'audio/mp4', ptt: true });
        });
      }

      // STICKER - acepta #sticker #stikers #s #stiker
      if (['#sticker','#stiker','#stikers','#s'].includes(cmd) || cmd.startsWith('#sticker ') ) {
        let quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        let targetMsg = quoted ? { message: quoted, key: msg.key } : msg;
        try {
          const buffer = await downloadMediaMessage(targetMsg, 'buffer', {});
          const webp = await sharp(buffer).resize(512,512).webp().toBuffer();
          await sock.sendMessage(from, { sticker: webp });
        } catch (e) { console.log('sticker error', e); await sock.sendMessage(from, { text: 'Responde a una foto con #sticker amor' }); }
      }

    } catch (e) { console.log(e); }
  });
}
iniciar();
