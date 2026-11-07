const fs = require('fs')
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')
const https = require('https')
const app = express()

let qr = ''
let conectado = false
const COMANDOS_VALIDOS = ['#img', '#menu', '#todos', '#all', '#cerrar', '#abrir', '#id', '#kick', '#pista', '#vip', '#novip', '#vips']
const esperar = () => new Promise(r => setTimeout(r, 3000 + Math.random()*1000))

const ID_GRUPO = 'PEGAR_AQUI_EL_ID_DESPUE'
const HORA_CIERRE = { h: 22, m: 30 }
const HORA_ABRE = { h: 5, m: 0 }

let vips = []
if (fs.existsSync('./vips.json')) {
  try { vips = JSON.parse(fs.readFileSync('./vips.json')) } catch(e){ vips = [] }
}
const guardarVips = () => fs.writeFileSync('./vips.json', JSON.stringify(vips))

// LO COQUETO - 1 SOLA VEZ POR COMANDO
const coquetas = [
  "Aquí estoy mi amor 💋",
  "Dime bebé 😏", 
  "A tus órdenes mi rey 🫦",
  "Aquí está tu Sabrina 💋",
  "Dime corazón 😘",
  "A tus pies papi 🔥",
  "Aquí estoy precioso 💋",
  "Que quieres mi amor? 😏"
]
function coqueta(){ return coquetas[Math.floor(Math.random()*coquetas.length)] }

app.get('/', async (req, res) => {
  if (conectado) return res.send('<h1 style="text-align:center;margin-top:100px;font-family:sans-serif">✅ BOT VIP + COQUETA ACTIVO 💋</h1>')
  if (qr) {
    const img = await QRCode.toDataURL(qr)
    return res.send(`<center><h2>ESCANEA QR</h2><img src="${img}" style="width:350px;border:10px solid #000"></center>`)
  }
  res.send('Iniciando...')
})
app.listen(3000)
setInterval(() => { https.get('https://sabrina-bot-57mg.onrender.com').on('error',()=>{}) }, 600000)

async function start() {
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'silent' }), browser: ['Chrome', 'Windows', '10'] })
  global.sockGlobal = sock
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', u => {
    if (u.qr) qr = u.qr
    if (u.connection === 'open') { qr = ''; conectado = true }
    if (u.connection === 'close') { conectado = false; setTimeout(start, 3000) }
  })

  setInterval(async () => {
    try{
      const ahoraMX = new Date().toLocaleString("en-US", {timeZone: "America/Mexico_City"})
      const d = new Date(ahoraMX)
      const h = d.getHours()
      const m = d.getMinutes()
      if(ID_GRUPO.includes('PEGAR_AQUI')) return
      let archivo = null
      if (fs.existsSync('./IMG.jpg')) archivo = './IMG.jpg'
      else if (fs.existsSync('./IMG.JPG')) archivo = './IMG.JPG'
      else if (fs.existsSync('./img.jpg')) archivo = './img.jpg'
      if (h === HORA_CIERRE.h && m === HORA_CIERRE.m) {
        await sock.groupSettingUpdate(ID_GRUPO, 'announcement')
        if(archivo) await sock.sendMessage(ID_GRUPO, { image: fs.readFileSync(archivo), caption: `🌙 *GRUPO CERRADO POR DESCANSO* 🌙\n\n${coqueta()} nos vemos mañana papi 💤` })
      }
      if (h === HORA_ABRE.h && m === HORA_ABRE.m) {
        await sock.groupSettingUpdate(ID_GRUPO, 'not_announcement')
        await sock.sendMessage(ID_GRUPO, { text: `☀️ *BUENOS DÍAS* ☀️\n\n${coqueta()} 🔓 Grupo abierto!\n#menu #img #pista` })
      }
    }catch(e){}
  }, 60000)

  sock.ev.on('messages.upsert', async m => {
    const msg = m.messages[0]
    if (!msg.message || msg.key.fromMe) return
    const from = msg.key.remoteJid
    const textoRaw = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    const texto = textoRaw.toLowerCase().trim()
    const esGrupo = from.endsWith('@g.us')
    const sender = esGrupo ? msg.key.participant : from

    if (esGrupo && texto.includes('chat.whatsapp.com')) {
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      const esAdmin = admins.includes(sender)
      const esVip = vips.includes(sender)
      if (!esAdmin && !esVip) {
        try {
          await sock.sendMessage(from, { delete: msg.key })
          await sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} ${coqueta()} ese link no mi amor, solo admins y VIPs pueden`, mentions: [sender] })
        } catch(e){}
        return
      }
    }

    if (texto.includes('#id')) {
      await esperar()
      await sock.sendMessage(from, { text: `${coqueta()} 🆔 ID: ${from}` })
      return
    }
    if (texto.includes('#img')) {
      await esperar()
      let archivo = null
      if (fs.existsSync('./IMG.jpg')) archivo = './IMG.jpg'
      else if (fs.existsSync('./IMG.JPG')) archivo = './IMG.JPG'
      else if (fs.existsSync('./img.jpg')) archivo = './img.jpg'
      else if (fs.existsSync('./IMG.png')) archivo = './IMG.png'
      else if (fs.existsSync('./cod.jpg')) archivo = './cod.jpg'
      if (archivo) await sock.sendMessage(from, { image: fs.readFileSync(archivo), caption: `${coqueta()} 💰 *PRECIOS* 💋` })
      else await sock.sendMessage(from, { text: `${coqueta()} súbeme la foto como IMG.jpg amor 💋` })
      return
    }
    if (texto.includes('#menu')) {
      await esperar()
      await sock.sendMessage(from, { text: `${coqueta()} *🤖 MENU COMPLETO - COD 889* 💋\n\n📸 #img - Precios\n📋 #menu - Menu\n🆔 #id - ID grupo\n🔍 #pista - Adivinanza\n\n*SOLO ADMINS:*\n📢 #todos / #all\n🔒 #cerrar / #abrir\n👢 #kick @usuario\n⭐ #vip @usuario\n❌ #novip @usuario\n📃 #vips\n\n🛡️ Anti-link ACTIVO` })
      return
    }
    if (texto.startsWith('#pista')) {
      await esperar()
      await sock.sendMessage(from, { text: `${coqueta()} *🔍 #PISTA* 💋\n\n📜 CIFRADO:\n\`19-9   12-15   4-5-19-3-9-6-18-1-19-20-5-19   5-19   16-15-18-17-21-5   18-5-19   21-14   8-21-18-7-9-4-15   4-5   20-18-9-16-1-19\`\n\nA=1, Z=26` })
      return
    }
    if (texto.startsWith('#vip')) {
      if (!esGrupo) return
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      if (!admins.includes(sender)) return sock.sendMessage(from, {text: `${coqueta()} solo admins pueden dar VIP papi ❌`})
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
      if (!mentioned || mentioned.length==0) return sock.sendMessage(from, {text: `${coqueta()} Usa: #vip @usuario 💋`})
      mentioned.forEach(jid => { if(!vips.includes(jid)) vips.push(jid) })
      guardarVips()
      await esperar()
      await sock.sendMessage(from, { text: `${coqueta()} ⭐ @${mentioned[0].split('@')[0]} ahora es VIP papi, ya puede pasar links 💋`, mentions: mentioned })
      return
    }
    if (texto.startsWith('#novip')) {
      if (!esGrupo) return
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      if (!admins.includes(sender)) return
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
      if (!mentioned) return
      vips = vips.filter(v => !mentioned.includes(v))
      guardarVips()
      await sock.sendMessage(from, { text: `${coqueta()} ❌ VIP quitado a @${mentioned[0].split('@')[0]} mi amor`, mentions: mentioned })
      return
    }
    if (texto.startsWith('#vips')) {
      if (vips.length==0) return sock.sendMessage(from, {text: `${coqueta()} No hay VIPs aún mi amor 💋`})
      let txt = `${coqueta()} *⭐ LISTA VIPs:* 💋\n`
      vips.forEach(v=> txt+=`@`+v.split('@')[0]+'\n')
      await sock.sendMessage(from, { text: txt, mentions: vips })
      return
    }
    if (texto.startsWith('#todos') || texto.startsWith('#all')) {
      if (!esGrupo) return
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      if (!admins.includes(sender)) return sock.sendMessage(from, {text: `${coqueta()} solo admins papi ❌`})
      await esperar()
      let mentions = metadata.participants.map(p=>p.id)
      await sock.sendMessage(from, { text: `${coqueta()} 📢 ATENCION TODOS 📢 💋\n#img para precios`, mentions })
      return
    }
    if (texto.startsWith('#cerrar') || texto.startsWith('#abrir')) {
      if (!esGrupo) return
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      if (!admins.includes(sender)) return sock.sendMessage(from, {text: `${coqueta()} solo admins papi ❌`})
      await esperar()
      if(texto.startsWith('#cerrar')){
        await sock.groupSettingUpdate(from, 'announcement')
        await sock.sendMessage(from, {text: `${coqueta()} 🔒 Grupo cerrado por admin mi amor`})
      } else {
        await sock.groupSettingUpdate(from, 'not_announcement')
        await sock.sendMessage(from, {text: `${coqueta()} 🔓 Grupo abierto por admin mi amor 💋`})
      }
      return
    }
    if (texto.startsWith('#kick')) {
      if (!esGrupo) return
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      if (!admins.includes(sender)) return
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
      if(mentioned && mentioned.length>0){
        await esperar()
        await sock.groupParticipantsUpdate(from, mentioned, 'remove')
        await sock.sendMessage(from, { text: `${coqueta()} fuera papi 🔥` })
      }
      return
    }
    if (texto.startsWith('#')) {
      if (!COMANDOS_VALIDOS.some(c => texto.startsWith(c))) {
        await esperar()
        await sock.sendMessage(from, { text: `${coqueta()} comando no valido amor, escribe #menu 💋` })
      }
    }
  })
}
start()
