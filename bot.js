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
  res.send('Activa...');
});
app.listen(PORT, '0.0.0.0', () => console.log('Web OK'));

const VIP_FILE = './vips.json';
let vips = {};
if (fs.existsSync(VIP_FILE)) { try { vips = JSON.parse(fs.readFileSync(VIP_FILE)); } catch(e){} }
function saveVips(){ fs.writeFileSync(VIP_FILE, JSON.stringify(vips)); }
function isVip(g,u){ return vips[g] && vips[g].includes(u); }

const adivinanzas = [
  "🎯 Tengo ojos y no veo, tengo agua y no bebo, tengo corona y no soy rey. ¿Qué soy? \n||El coco||",
  "🎯 Cuanto más me quitas más grande soy. ¿Qué soy? \n||El hoyo||",
  "🎯 Tengo llaves y no abro puertas. ¿Qué soy? \n||El piano||",
  "🎯 ¿Qué sube y nunca baja? \n||La edad||",
  "🎯 Blanca por dentro, verde por fuera. ¿Qué es? \n||La palta||"
];

async function iniciar() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./auth_sabrina');
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'fatal' }), browser: ['Sabrina PRO','Chrome','1.0'], markOnlineOnConnect: true });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    if (u.qr) qrDataURL = await QRCode.toDataURL(u.qr);
    if (u.connection === 'open') { conectado = true; qrDataURL = null; }
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) { conectado = false; setTimeout(iniciar, 4000); }
  });

  // AUTO 10:30PM-5AM MX
  setInterval(async () => {
    try {
      const nowMX = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
      if (nowMX.getHours() === 22 && nowMX.getMinutes() === 30) {
        const groups = await sock.groupFetchAllParticipating();
        for (let id in groups) { await sock.groupSettingUpdate(id, 'announcement'); await sock.sendMessage(id, { text: '🌙 Auto-cierre 10:30PM MX 🔒' }); }
      }
      if (nowMX.getHours() === 5 && nowMX.getMinutes() === 0) {
        const groups = await sock.groupFetchAllParticipating();
        for (let id in groups) { await sock.groupSettingUpdate(id, 'not_announcement'); await sock.sendMessage(id, { text: '☀️ Auto-apertura 5AM MX ✅' }); }
      }
    } catch(e){}
  }, 60000);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message) return;
      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = isGroup ? msg.key.participant || msg.participant : from;
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || "";
      const cmd = texto.toLowerCase().trim();

      // ANTI-LINK
      if (isGroup && texto.includes('chat.whatsapp.com')) {
        const metadata = await sock.groupMetadata(from);
        const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;
        if (!isAdmin && !isVip(from, sender)) {
          try { await sock.sendMessage(from, { delete: msg.key }); await sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} Links prohibidos, solo VIPs`, mentions: [sender] }); } catch(e){}
          return;
        }
      }

      if (cmd === '#menu' || cmd === '#help') {
        await sock.sendMessage(from, { text: `*💋 MENU COMPLETO 🫦*\n\n📸 #img - Precios\n📋 #menu - Este menu\n🆔 #id - ID grupo\n🔍 #pista - Adivinanza\n🏓 #ping - Prueba\n🗣️ #voz [texto] - Audio\n\n*SOLO ADMINS:*\n📢 #todos / #all - Menciona a todos\n🔒 #cerrar / #abrir\n👢 #kick @usuario\n⭐ #vip @usuario - Dar VIP (pasa links)\n❌ #novip @usuario - Quitar VIP\n📃 #vips - Ver VIPs\n\n*STICKERS:*\n🎨 #sticker / #stiker - Foto a sticker\n🔄 #toimg - Sticker a foto\n✨ #hd - Mejora foto\n\n🛡️ Anti-link ACTIVO\n⭐ VIPs si pueden pasar links\n⏰ Auto 10:30PM-5AM MX` });
      }

      if (cmd === '#img') await sock.sendMessage(from, { text: `📸 *LISTA PRECIOS - EDITS* 📸\n\n🖼️ Sencilla: $20 MXN\n✨ HD: $35 MXN\n🎨 PRO: $50 MXN\n👑 PACK 5: $80 MXN\n\n💳 Pago: Transferencia / PayPal` });
      if (cmd === '#id') await sock.sendMessage(from, { text: `🆔 Grupo: ${from}\n👤 Tú: ${sender}` });
      if (cmd === '#pista' || cmd === '#adivinanza') {
        const r = adivinanzas[Math.floor(Math.random()*adivinanzas.length)];
        await sock.sendMessage(from, { text: `🔍 *ADIVINANZA:*\n\n${r}` });
      }
      if (cmd === '#ping') await sock.sendMessage(from, { text: '🏓 Pong! Sabrina activa 💋' });

      if (cmd.startsWith('#todos') || cmd.startsWith('#all')) {
        if (!isGroup) return;
        const metadata = await sock.groupMetadata(from);
        const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;
        if (!isAdmin) return;
        const participants = metadata.participants.map(p => p.id);
        let txt = texto.slice(texto.startsWith('#todos') ? 6 : 4).trim() || 'Atención 💋';
        await sock.sendMessage(from, { text: `📢 ${txt}`, mentions: participants });
      }

      if (cmd === '#cerrar') { if(isGroup) { await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from, { text: '🔒 Cerrado' }); } }
      if (cmd === '#abrir') { if(isGroup) { await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from, { text: '🔓 Abierto' }); } }
      if (cmd.startsWith('#kick')) { if(isGroup) { const m = msg.message.extendedTextMessage?.contextInfo?.mentionedJid; if(m) await sock.groupParticipantsUpdate(from, m, 'remove'); } }
      if (cmd.startsWith('#vip ')) { if(isGroup) { const m = msg.message.extendedTextMessage?.contextInfo?.mentionedJid; if(m && m[0]) { if(!vips[from]) vips[from]=[]; if(!vips[from].includes(m[0])){ vips[from].push(m[0]); saveVips(); } await sock.sendMessage(from, { text: `⭐ @${m[0].split('@')[0]} es VIP`, mentions: m }); } } }
      if (cmd.startsWith('#novip')) { if(isGroup) { const m = msg.message.extendedTextMessage?.contextInfo?.mentionedJid; if(m && m[0] && vips[from]) { vips[from]=vips[from].filter(id=>id!==m[0]); saveVips(); await sock.sendMessage(from, { text: `❌ @${m[0].split('@')[0]} ya no VIP`, mentions: m }); } } }
      if (cmd === '#vips') { if(isGroup) { const list=vips[from]||[]; if(list.length===0) await sock.sendMessage(from,{text:'No hay VIPs'}); else { let t='📃 *VIPs:*\n'; list.forEach((id,i)=>t+=`${i+1}. @${id.split('@')[0]}\n`); await sock.sendMessage(from,{text:t,mentions:list}); } } }

      if (cmd.startsWith('#voz ')) {
        let ttsText = texto.slice(5).trim();
        if(!ttsText) return;
        const file='./voz.mp3';
        const gtts = new gTTS(ttsText, 'es');
        gtts.save(file, async () => { try { await sock.sendMessage(from, { audio: fs.readFileSync(file), mimetype: 'audio/mpeg' }); } catch(e){} });
      }

      if (['#sticker','#stiker','#stikers','#s'].includes(cmd) || cmd.startsWith('#sticker') || cmd.startsWith('#stiker')) {
        try { let q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; let tm = q ? { message: q } : msg; const b = await downloadMediaMessage(tm, 'buffer', {}); const w = await sharp(b).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp().toBuffer(); await sock.sendMessage(from, { sticker: w }); } catch(e){ await sock.sendMessage(from,{text:'Responde a foto con #sticker'}); }
      }

      if (cmd === '#toimg' || cmd === '#aimg') {
        try { let q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; if(!q?.stickerMessage) return; const b = await downloadMediaMessage({ message: q }, 'buffer', {}); const jpg = await sharp(b).jpeg().toBuffer(); await sock.sendMessage(from, { image: jpg }); } catch(e){}
      }

      if (cmd === '#hd') {
        try { let q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; let tm = q ? { message: q } : msg; const b = await downloadMediaMessage(tm, 'buffer', {}); const hd = await sharp(b).resize({width:2048,height:2048,fit:'inside'}).sharpen().jpeg({quality:90}).toBuffer(); await sock.sendMessage(from, { image: hd, caption: '✨ HD' }); } catch(e){ await sock.sendMessage(from,{text:'Responde a foto con #hd'}); }
      }

    } catch(e){ console.log(e); }
  });
}
iniciar();
