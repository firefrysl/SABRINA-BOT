const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys');
const express = require('express');
const P = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 10000;
let qrDataURL = null;
let conectado = false;
app.get('/', (req, res) => {
  if (conectado) return res.send('<center><h1>✅ SABRINA FINAL 💋</h1></center>');
  if (qrDataURL) return res.send(`<center><h1>QR</h1><img src="${qrDataURL}" style="width:320px"></center>`);
  res.send('Activa...');
});
app.listen(PORT, '0.0.0.0', () => console.log('Web OK'));

const VIP_FILE = './vips.json';
let vips = {};
if (fs.existsSync(VIP_FILE)) { try { vips = JSON.parse(fs.readFileSync(VIP_FILE)); } catch(e){} }
function saveVips(){ fs.writeFileSync(VIP_FILE, JSON.stringify(vips)); }
function isVip(g,u){ return vips[g] && vips[g].includes(u); }

const coquetas = ["Aquí estoy mi amor 💋", "Dime bebé 😏", "Aquí estoy corazón", "¿Qué quieres mi rey? 🫦", "A tus órdenes papi", "Aquí está tu Sabrina 💋"];
function coquetaRandom(){ return coquetas[Math.floor(Math.random()*coquetas.length)]; }

let ultimoSabrina = {};
async function iniciar() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./auth_sabrina');
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'fatal' }), browser: ['Sabrina PRO','Chrome','1.0'] });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    if (u.qr) qrDataURL = await QRCode.toDataURL(u.qr);
    if (u.connection === 'open') { conectado = true; qrDataURL = null; }
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) { conectado = false; setTimeout(iniciar, 4000); }
  });

  setInterval(async () => {
    try {
      const nowMX = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
      if (nowMX.getHours() === 22 && nowMX.getMinutes() === 30) {
        const groups = await sock.groupFetchAllParticipating();
        for (let id in groups) { await sock.groupSettingUpdate(id, 'announcement'); }
      }
      if (nowMX.getHours() === 5 && nowMX.getMinutes() === 0) {
        const groups = await sock.groupFetchAllParticipating();
        for (let id in groups) { await sock.groupSettingUpdate(id, 'not_announcement'); }
      }
    } catch(e){}
  }, 60000);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message || msg.key.fromMe) return;
      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = isGroup ? msg.key.participant || msg.participant : from;
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
      const cmd = texto.toLowerCase().trim();

      if (isGroup && texto.includes('chat.whatsapp.com')) {
        const metadata = await sock.groupMetadata(from);
        const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;
        if (!isAdmin && !isVip(from, sender)) {
          try { await sock.sendMessage(from, { delete: msg.key }); } catch(e){}
          return;
        }
      }

      // SOLO 1 MENSAJE COQUETA CUANDO DICEN SABRINA
      if (texto.toLowerCase().includes('sabrina') && !cmd.startsWith('#')) {
        const ahora = Date.now();
        if (ultimoSabrina[from] && (ahora - ultimoSabrina[from] < 10000)) return;
        ultimoSabrina[from] = ahora;
        await sock.sendMessage(from, { text: `${coquetaRandom()}, soy tu Sabrina` });
        return;
      }

      if (cmd === '#menu' || cmd === '#help') {
        await sock.sendMessage(from, { text: `${coquetaRandom()} aquí está mi menú 💋\n\n📸 #img - Precios COD\n📋 #menu\n🆔 #id\n🔍 #pista\n🏓 #ping\n🗣️ #voz\n\n*ADMINS:*\n📢 #todos / #all\n🔒 #cerrar / #abrir\n👢 #kick\n⭐ #vip / #novip / #vips\n\n*STICKERS:*\n🎨 #sticker\n🔄 #toimg\n✨ #hd` });
      }

      if (cmd === '#img') {
        try {
          if (fs.existsSync('./cod.jpg')) {
            await sock.sendMessage(from, { image: fs.readFileSync('./cod.jpg'), caption: `${coquetaRandom()} aquí están los precios de COD Points 💋\n\nVía normal y rápida disponibles` });
          } else {
            await sock.sendMessage(from, { text: `${coquetaRandom()} no encuentro la foto cod.jpg, súbela a GitHub amor` });
          }
        } catch(e){ console.log(e); }
      }

      if (cmd === '#id') await sock.sendMessage(from, { text: `${coquetaRandom()} 🆔 Grupo: ${from}` });
      if (cmd === '#pista') await sock.sendMessage(from, { text: `${coquetaRandom()} 🎯 Cuanto más me quitas más grande soy. ¿Qué soy? ||El hoyo||` });
      if (cmd === '#ping') await sock.sendMessage(from, { text: `${coquetaRandom()} activa mi amor 💋` });

      if (cmd.startsWith('#todos') || cmd.startsWith('#all')) {
        if (!isGroup) return;
        const metadata = await sock.groupMetadata(from);
        if (!metadata.participants.find(p => p.id === sender)?.admin) return;
        await sock.sendMessage(from, { text: `📢 ${coquetaRandom()} atención a todos 💋`, mentions: metadata.participants.map(p=>p.id) });
      }
      if (cmd === '#cerrar') { if(isGroup) { await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from, { text: `${coquetaRandom()} cerrado mi amor 🔒` }); } }
      if (cmd === '#abrir') { if(isGroup) { await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from, { text: `${coquetaRandom()} abierto mi amor 🔓` }); } }
      if (cmd.startsWith('#kick')) { if(isGroup) { const m = msg.message.extendedTextMessage?.contextInfo?.mentionedJid; if(m) await sock.groupParticipantsUpdate(from, m, 'remove'); } }
      if (cmd.startsWith('#vip ')) { if(isGroup) { const m = msg.message.extendedTextMessage?.contextInfo?.mentionedJid; if(m && m[0]) { if(!vips[from]) vips[from]=[]; if(!vips[from].includes(m[0])){ vips[from].push(m[0]); saveVips(); } await sock.sendMessage(from, { text: `${coquetaRandom()} @${m[0].split('@')[0]} ahora es VIP ⭐`, mentions: m }); } } }
      if (cmd.startsWith('#novip')) { if(isGroup) { const m = msg.message.extendedTextMessage?.contextInfo?.mentionedJid; if(m && m[0] && vips[from]) { vips[from]=vips[from].filter(id=>id!==m[0]); saveVips(); await sock.sendMessage(from, { text: `${coquetaRandom()} quitado VIP ❌`, mentions: m }); } } }
      if (cmd === '#vips') { if(isGroup) { const list=vips[from]||[]; if(list.length===0) await sock.sendMessage(from,{text:`${coquetaRandom()} no hay VIPs aún`}); else { let t=`${coquetaRandom()} 📃 VIPs:\n`; list.forEach((id,i)=>t+=`${i+1}. @${id.split('@')[0]}\n`); await sock.sendMessage(from,{text:t,mentions:list}); } } }

      if (cmd.startsWith('#voz ')) {
        let t = texto.slice(5).trim();
        if(!t) return;
        await sock.sendMessage(from, { text: `${coquetaRandom()} ${t} 💋` });
      }

      if (cmd.startsWith('#sticker') || cmd.startsWith('#stiker') || cmd === '#s') {
        try { let q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; let tm = q ? { message: q } : msg; const b = await downloadMediaMessage(tm, 'buffer', {}); const w = await sharp(b).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp().toBuffer(); await sock.sendMessage(from, { sticker: w }); } catch(e){}
      }
      if (cmd === '#toimg') { try { let q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; if(!q?.stickerMessage) return; const b = await downloadMediaMessage({ message: q }, 'buffer', {}); const jpg = await sharp(b).jpeg().toBuffer(); await sock.sendMessage(from, { image: jpg, caption: `${coquetaRandom()} aquí tienes mi amor` }); } catch(e){} }
      if (cmd === '#hd') { try { let q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; let tm = q ? { message: q } : msg; const b = await downloadMediaMessage(tm, 'buffer', {}); const hd = await sharp(b).resize({width:2048,height:2048,fit:'inside'}).sharpen().jpeg({quality:90}).toBuffer(); await sock.sendMessage(from, { image: hd, caption: `${coquetaRandom()} en HD mi amor ✨` }); } catch(e){} }

    } catch(e){ console.log(e); }
  });
}
iniciar();
