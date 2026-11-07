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
  if (conectado) return res.send('<h1>✅ BOT ACTIVO - RESPONDE EN GRUPOS 💋</h1>');
  if (qrDataURL) return res.send(`<center><img src="${qrDataURL}" style="width:320px"><h2>Escanea con Mio Tigo</h2></center>`);
  res.send('Iniciando...');
});
app.listen(10000, '0.0.0.0');

const VIP_FILE = './vips.json';
let vips = {};
if (fs.existsSync(VIP_FILE)) { try { vips = JSON.parse(fs.readFileSync(VIP_FILE)); } catch(e){} }
function saveVips(){ try{ fs.writeFileSync(VIP_FILE, JSON.stringify(vips)); }catch(e){} }

const coquetas = ["Aquí estoy mi amor 💋", "Dime bebé 😏", "Aquí estoy corazón", "¿Qué quieres mi rey? 🫦", "Aquí está tu Sabrina 💋"];
function coqueta(){ return coquetas[Math.floor(Math.random()*coquetas.length)]; }

async function iniciar() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./auth_sabrina');
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'fatal' }), browser: ['Sabrina','Chrome','1.0'] });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    if (u.qr) qrDataURL = await QRCode.toDataURL(u.qr);
    if (u.connection === 'open') { conectado = true; qrDataURL = null; console.log('CONECTADA');
      // AL CONECTAR, ABRE TODOS LOS GRUPOS AUTOMATICAMENTE
      try {
        const groups = await sock.groupFetchAllParticipating();
        for (let id in groups) { await sock.groupSettingUpdate(id, 'not_announcement'); console.log('Grupo abierto:', id); }
      } catch(e){}
    }
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) { conectado = false; setTimeout(iniciar, 3000); }
  });

  // AUTO-ABRIR CADA 20 SEGUNDOS SI ALGUIEN LO CERRÓ
  setInterval(async () => {
    try {
      const groups = await sock.groupFetchAllParticipating();
      for (let id in groups) { await sock.groupSettingUpdate(id, 'not_announcement'); }
    } catch(e){}
  }, 20000);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message || msg.key.fromMe) return;
      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = isGroup ? msg.key.participant || msg.participant : from;
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || "";
      const cmd = texto.toLowerCase().trim();
      console.log('Mensaje:', cmd, 'de', from, 'isGroup:', isGroup);

      if (texto.toLowerCase().includes('sabrina') && !cmd.startsWith('#')) {
        await sock.sendMessage(from, { text: `${coqueta()} soy tu Sabrina` });
        return;
      }

      if (cmd === '#menu' || cmd === '#help' || cmd === '#menu ') {
        await sock.sendMessage(from, { text: `${coqueta()} aquí está mi menú 💋\n\n📸 #img - Precios COD\n📋 #menu\n🆔 #id\n🏓 #ping\n📢 #todos\n🔒 #cerrar / #abrir\n\nDi Sabrina y respondo` });
        return;
      }

      if (cmd === '#img' || cmd.startsWith('#img')) {
        try {
          if (fs.existsSync('./cod.jpg')) {
            await sock.sendMessage(from, { image: fs.readFileSync('./cod.jpg'), caption: `${coqueta()} aquí están los precios de COD Points 💋` });
          } else {
            await sock.sendMessage(from, { text: `${coqueta()} aquí están los precios, súbeme la foto como cod.jpg amor 💋` });
          }
        } catch(e){ console.log(e); await sock.sendMessage(from, { text: `${coqueta()} error con la foto` }); }
        return;
      }

      if (cmd === '#ping') { await sock.sendMessage(from, { text: `${coqueta()} activa mi amor 💋` }); return; }
      if (cmd === '#id') { await sock.sendMessage(from, { text: `${coqueta()} ID: ${from}` }); return; }

      if (cmd === '#abrir' || cmd.startsWith('#abrir')) {
        if (isGroup) {
          try { await sock.groupSettingUpdate(from, 'not_announcement'); await sock.sendMessage(from, { text: `${coqueta()} grupo abierto mi amor 🔓` }); } catch(e){ console.log(e); }
        }
        return;
      }
      if (cmd === '#cerrar' || cmd.startsWith('#cerrar')) {
        if (isGroup) {
          try { await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from, { text: `${coqueta()} cerrado mi amor 🔒 se abre solo en 20 seg` }); } catch(e){}
        }
        return;
      }

      if (cmd.startsWith('#todos') || cmd.startsWith('#all')) {
        if (!isGroup) return;
        try {
          const metadata = await sock.groupMetadata(from);
          await sock.sendMessage(from, { text: `📢 ${coqueta()} atención a todos 💋`, mentions: metadata.participants.map(p=>p.id) });
        } catch(e){}
        return;
      }

      if (cmd === '#sticker' || cmd === '#s' || cmd.startsWith('#sticker')) {
        try { let q = msg.message.extendedTextMessage?.contextInfo?.quotedMessage; let tm = q ? { message: q } : msg; const b = await downloadMediaMessage(tm, 'buffer', {}); const w = await sharp(b).resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp().toBuffer(); await sock.sendMessage(from, { sticker: w }); } catch(e){}
      }

    } catch(e){ console.log('Error general:', e); }
  });
}
iniciar();
