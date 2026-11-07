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
  if (conectado) return res.send('<h1>✅ SABRINA GRUPOS OK 💋</h1>');
  if (qrDataURL) return res.send(`<center><img src="${qrDataURL}" style="width:320px"><h2>Escanea QR</h2></center>`);
  res.send('Iniciando...');
});
app.listen(10000, '0.0.0.0');

const VIP_FILE = './vips.json';
let vips = {};
if (fs.existsSync(VIP_FILE)) { try { vips = JSON.parse(fs.readFileSync(VIP_FILE)); } catch(e){} }
function saveVips(){ try{ fs.writeFileSync(VIP_FILE, JSON.stringify(vips)); }catch(e){} }
function isVip(g,u){ return vips[g] && vips[g].includes(u); }

const coquetas = ["Aquí estoy mi amor 💋", "Dime bebé 😏", "Aquí estoy corazón", "¿Qué quieres mi rey? 🫦", "A tus órdenes papi", "Aquí está tu Sabrina 💋"];
function coqueta(){ return coquetas[Math.floor(Math.random()*coquetas.length)]; }

let ultimoSabrina = {};
async function iniciar() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./auth_sabrina');
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'fatal' }), browser: ['Sabrina','Chrome','1.0'] });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    if (u.qr) qrDataURL = await QRCode.toDataURL(u.qr);
    if (u.connection === 'open') { conectado = true; qrDataURL = null; }
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) { conectado = false; setTimeout(iniciar, 3000); }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message || msg.key.fromMe) return;
      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = isGroup ? msg.key.participant || msg.participant : from;
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
      const cmd = texto.toLowerCase().trim();

      // ANTI-LINK (no borra si eres admin o VIP)
      if (isGroup && texto.includes('chat.whatsapp.com') && !texto.includes('#vip')) {
        try {
          const metadata = await sock.groupMetadata(from);
          const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;
          if (!isAdmin && !isVip(from, sender)) {
            await sock.sendMessage(from, { delete: msg.key });
            return;
          }
        } catch(e){}
      }

      // SABRINA - SOLO 1 MENSAJE
      if (texto.toLowerCase().includes('sabrina') && !cmd.startsWith('#')) {
        const ahora = Date.now();
        if (ultimoSabrina[from] && (ahora - ultimoSabrina[from] < 10000)) return;
        ultimoSabrina[from] = ahora;
        await sock.sendMessage(from, { text: `${coqueta()} soy tu Sabrina` });
        return;
      }

      if (cmd === '#menu' || cmd === '#help') {
        await sock.sendMessage(from, { text: `${coqueta()} aquí está mi menú 💋\n\n📸 #img - Precios COD\n📋 #menu\n🆔 #id\n🔍 #pista\n🏓 #ping\n🗣️ #voz [texto]\n\n*ADMINS:*\n📢 #todos / #all\n🔒 #cerrar / #abrir\n👢 #kick\n⭐ #vip / #novip / #vips\n\n*STICKERS:*\n🎨 #sticker\n🔄 #toimg\n✨ #hd` });
      }

      if (cmd === '#img') {
        if (fs.existsSync('./cod.jpg')) {
          await sock.sendMessage(from, { image: fs.readFileSync('./cod.jpg'), caption: `${coqueta()} aquí están los precios de COD Points 💋` });
        } else {
          await sock.sendMessage(from, { text: `${coqueta()} aquí están los precios, pero súbeme la foto como cod.jpg amor 💋` });
        }
      }

      if (cmd === '#id') await sock.sendMessage(from, { text: `${coqueta()} 🆔 Grupo: ${from}` });
      if (cmd === '#pista') await sock.sendMessage(from, { text: `${coqueta()} 🎯 Cuanto más me quitas más grande soy. ¿Qué soy? ||El hoyo||` });
      if (cmd === '#ping') await sock.sendMessage(from, { text: `${coqueta()} activa mi amor 💋` });
      if (cmd.startsWith('#voz ')) {
        let t = texto.slice(5);
        await sock.sendMessage(from, { text: `${coqueta()} ${t} 💋` });
      }

      if (cmd.startsWith('#todos') || cmd.startsWith('#all')) {
        if (!isGroup) return;
        try {
          const metadata = await sock.groupMetadata(from);
          const isAdmin = metadata.participants.find(p => p.id === sender)?.admin;
          if (!isAdmin) return;
          const txt = texto.slice(texto.startsWith('#todos') ? 6 : 4).trim() || 'Atención';
          await sock.sendMessage(from, { text: `📢 ${coqueta()} ${txt} 💋`, mentions: metadata.participants.map(p=>p.id) });
        } catch(e){}
      }

      if (cmd === '#cerrar') { if(isGroup) try{ await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from, { text: `${coqueta()} cerrado mi amor 🔒` }); }catch(e){} }
      if (cmd === '#abrir') { if(isGroup) try{ await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from, { text: `${coqueta()} abierto mi amor 🔓` }); }catch(e){} }
      if (cmd.startsWith('#kick')) { if(isGroup) try{ const m = msg.message.extendedTextMessage?.contextInfo?.mentionedJid; if(m) await sock.groupParticipantsUpdate(from, m, 'remove'); }catch(e){} }
      if (cmd.startsWith('#vip ')) { if(isGroup) try{ const m = msg.message.extendedTextMessage?.contextInfo?.mentionedJid; if(m && m[0]) { if(!vips[from]) vips[from]=[]; if(!vips[from].includes(m[0])){ vips[from].push(m[0]); saveVips(); } await sock.sendMessage(from, { text: `${coqueta()} @${m[0].split('@')[0]} ahora es VIP ⭐`, mentions: m }); } }catch(e){} }
      if (cmd.startsWith('#novip')) { if(isGroup) try{ const m = msg.message.extendedTextMessage?.contextInfo?.mentionedJid; if(m && m[0] && vips[from]) { vips[from]=vips[from].filter(id=>id!==m[0]); saveVips(); await sock.sendMessage(from, { text: `${coqueta()} quitado VIP ❌`, mentions: m }); } }catch(e){} }
      if (cmd === '#vips') { if(isGroup) try{ const list=vips[from]||[]; if(list.length===0) await sock.sendMessage(from,{text:`${coqueta()} no hay VIPs aún`}); else { let t=`${coqueta()} 📃 VIPs:\n`; list.forEach((id,i)=>t+=`${i+1}. @${id.split('@')[0]}\n`); await sock.sendMessage(from,{text:t,mentions:list}); } }catch(e){} }

      if (cmd === '#sticker' || cmd === '#stiker' || cmd === '#s' || cmd.startsWith('#sticker') || cmd.startsWith('#stiker')) {
        try { let q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; let tm = q ? { message: q } : msg; const b = await downloadMediaMessage(tm, 'buffer', {}); const w = await sharp(b).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp().toBuffer(); await sock.sendMessage(from, { sticker: w }); } catch(e){}
      }
      if (cmd === '#toimg') { try { let q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; if(!q?.stickerMessage) return; const b = await downloadMediaMessage({ message: q }, 'buffer', {}); const jpg = await sharp(b).jpeg().toBuffer(); await sock.sendMessage(from, { image: jpg, caption: `${coqueta()} aquí tienes mi amor` }); } catch(e){} }
      if (cmd === '#hd') { try { let q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; let tm = q ? { message: q } : msg; const b = await downloadMediaMessage(tm, 'buffer', {}); const hd = await sharp(b).resize({width:2048,height:2048,fit:'inside'}).sharpen().jpeg({quality:90}).toBuffer(); await sock.sendMessage(from, { image: hd, caption: `${coqueta()} en HD mi amor ✨` }); } catch(e){} }

    } catch(e){ console.log('Error:', e); }
  });
}
iniciar();
