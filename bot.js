const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const express = require('express');
const P = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');

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

// ====== SISTEMA VIP ======
const VIP_FILE = './vips.json';
let vips = {};
if (fs.existsSync(VIP_FILE)) { try { vips = JSON.parse(fs.readFileSync(VIP_FILE)); } catch(e){ vips = {}; } }
function saveVips(){ fs.writeFileSync(VIP_FILE, JSON.stringify(vips)); }
function isVip(groupId, userId){ return vips[groupId] && vips[groupId].includes(userId); }

// ====== ADIVINANZAS ======
const adivinanzas = [
  "🎯 Tengo ojos y no veo, tengo agua y no bebo, tengo corona y no soy rey. ¿Qué soy? \n||Cocotero||",
  "🎯 Voy sin ser visto, lloro sin ojos. ¿Qué soy? \n||El humo||",
  "🎯 Cuanto más me quitas más grande soy. ¿Qué soy? \n||El hoyo||",
  "🎯 Tengo llaves y no abro puertas. ¿Qué soy? \n||El piano||",
  "🎯 Blanca por dentro, verde por fuera. Si no sabes, espera. ¿Qué es? \n||La palta||",
  "🎯 ¿Qué sube y nunca baja? \n||La edad||",
  "🎯 Va y viene, sube y baja, pero siempre se queda en el mismo sitio. ¿Qué es? \n||Las escaleras||"
];

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

  // AUTO CIERRE 10:30PM - 5AM HORA MX (UTC-6)
  setInterval(async () => {
    try {
      const nowMX = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
      const hour = nowMX.getHours();
      const min = nowMX.getMinutes();
      // 22:30 cerrar
      if (hour === 22 && min === 30) {
        const groups = await sock.groupFetchAllParticipating();
        for (let id in groups) { await sock.groupSettingUpdate(id, 'announcement'); await sock.sendMessage(id, { text: '🌙 *Auto-cierre 10:30PM MX* 🔒\nGrupo cerrado hasta las 5AM\nSolo admins pueden hablar' }); }
      }
      // 5:00 abrir
      if (hour === 5 && min === 0) {
        const groups = await sock.groupFetchAllParticipating();
        for (let id in groups) { await sock.groupSettingUpdate(id, 'not_announcement'); await sock.sendMessage(id, { text: '☀️ *Auto-apertura 5AM MX* ✅\nGrupo abierto de nuevo!' }); }
      }
    } catch(e){ console.log('auto error', e); }
  }, 60*1000);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message) return;
      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = isGroup ? msg.key.participant || msg.participant : from;
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || "";
      const cmd = texto.toLowerCase().trim();
      
      // ====== ANTI-LINK OTROS GRUPOS ======
      if (isGroup && texto.includes('chat.whatsapp.com')) {
        const metadata = await sock.groupMetadata(from);
        const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;
        if (!isAdmin && !isVip(from, sender)) {
          try {
            await sock.sendMessage(from, { delete: msg.key });
            await sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} Links de otros grupos prohibidos\n⭐ Solo VIPs pueden`, mentions: [sender] });
          } catch(e){ console.log('anti-link', e); }
          return;
        }
      }

      // #img - PRECIOS
      if (cmd === '#img' || cmd === '#precios') {
        await sock.sendMessage(from, { 
          text: `📸 *LISTA DE PRECIOS - EDITS* 📸\n\n🖼️ *FOTO SENCILLA:* $20 MXN\n✨ *FOTO HD:* $35 MXN\n🎨 *EDIT PRO:* $50 MXN\n👑 *PACK 5 FOTOS:* $80 MXN\n\n💳 Pago: Transferencia / PayPal\n📩 Mándame la foto y te la hago al momento\n\n_Pon #menu para ver todo_` 
        });
      }

      // #menu COMPLETO QUE PIDES
      if (cmd === '#menu' || cmd === '#help') {
        await sock.sendMessage(from, { 
          text: `*💋 MENU COMPLETO 🫦*\n\n📸 #img - Precios\n📋 #menu - Menu\n🆔 #id - ID grupo\n🔍 #pista - Adivinanza\n\n*SOLO ADMINS:*\n📢 #todos / #all\n🔒 #cerrar / #abrir\n👢 #kick @usuario\n⭐ #vip @usuario - Dar VIP (puede pasar links)\n❌ #novip @usuario - Quitar VIP\n📃 #vips - Ver VIPs\n\n🛡️ Anti-link otros grupos ACTIVO\n⭐ VIPs si pueden pasar links\n⏰ Auto 10:30PM-5AM MX` 
        });
      }

      // #id
      if (cmd === '#id') {
        await sock.sendMessage(from, { text: `🆔 *ID Grupo:*\n${from}\n\n👤 *Tu ID:*\n${sender}` });
      }

      // #pista
      if (cmd === '#pista' || cmd === '#adivinanza') {
        const random = adivinanzas[Math.floor(Math.random()*adivinanzas.length)];
        await sock.sendMessage(from, { text: `🔍 *ADIVINANZA:*\n\n${random}` });
      }

      // #todos / #all
      if (cmd.startsWith('#todos') || cmd.startsWith('#all')) {
        if (!isGroup) return;
        const metadata = await sock.groupMetadata(from);
        const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;
        if (!isAdmin) return;
        const participants = metadata.participants.map(p => p.id);
        let txt = texto.slice(texto.startsWith('#todos') ? 6 : 4).trim() || 'Atención a todos 💋';
        await sock.sendMessage(from, { text: `📢 *AVISO:*\n${txt}`, mentions: participants });
      }

      if (cmd === '#cerrar') { if (!isGroup) return; await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from, { text: '🔒 Grupo cerrado' }); }
      if (cmd === '#abrir') { if (!isGroup) return; await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from, { text: '🔓 Grupo abierto' }); }

      if (cmd.startsWith('#kick')) {
        if (!isGroup) return;
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
        if (mentioned && mentioned[0]) await sock.groupParticipantsUpdate(from, mentioned, 'remove');
      }

      // #vip
      if (cmd.startsWith('#vip ')) {
        if (!isGroup) return;
        const metadata = await sock.groupMetadata(from);
        const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;
        if (!isAdmin) return;
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentioned || !mentioned[0]) return sock.sendMessage(from, { text: 'Menciona a alguien: #vip @usuario' });
        if (!vips[from]) vips[from] = [];
        if (!vips[from].includes(mentioned[0])) { vips[from].push(mentioned[0]); saveVips(); }
        await sock.sendMessage(from, { text: `⭐ @${mentioned[0].split('@')[0]} ahora es VIP, puede pasar links`, mentions: mentioned });
      }

      // #novip
      if (cmd.startsWith('#novip ') || cmd.startsWith('#delvip ')) {
        if (!isGroup) return;
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentioned || !mentioned[0]) return;
        if (vips[from]) { vips[from] = vips[from].filter(id => id !== mentioned[0]); saveVips(); }
        await sock.sendMessage(from, { text: `❌ @${mentioned[0].split('@')[0]} ya no es VIP`, mentions: mentioned });
      }

      // #vips
      if (cmd === '#vips') {
        if (!isGroup) return;
        const list = vips[from] || [];
        if (list.length === 0) return sock.sendMessage(from, { text: '📃 No hay VIPs aún' });
        let text = '📃 *LISTA VIPs:*\n\n';
        list.forEach((id, i) => { text += `${i+1}. @${id.split('@')[0]}\n`; });
        await sock.sendMessage(from, { text, mentions: list });
      }

    } catch (e) { console.log('Error', e); }
  });
}
iniciar();
