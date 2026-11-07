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

app.get('/', async (req, res) => {
  if (conectado) return res.send('<h1 style="text-align:center;margin-top:100px;font-family:sans-serif">✅ BOT VIP + ANTI-LINK ACTIVO</h1>')
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
        if(archivo) await sock.sendMessage(ID_GRUPO, { image: fs.readFileSync(archivo), caption: '🌙 *GRUPO CERRADO POR DESCANSO* 🌙\n\n⏰ Cierra 10:30PM MX / Abre 5AM MX\n💤' })
      }
      if (h === HORA_ABRE.h && m === HORA_ABRE.m) {
        await sock.groupSettingUpdate(ID_GRUPO, 'not_announcement')
        await sock.sendMessage(ID_GRUPO, { text: '☀️ *BUENOS DÍAS* ☀️\n\n🔓 Grupo abierto!\n#menu #img #pista' })
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

    // ANTI-LINK DE OTROS GRUPOS WHATSAPP
    if (esGrupo && texto.includes('chat.whatsapp.com')) {
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      const esAdmin = admins.includes(sender)
      const esVip = vips.includes(sender)
      if (!esAdmin && !esVip) {
        try {
          await sock.sendMessage(from, { delete: msg.key })
          await sock.sendMessage(from, { text: `🚫 @${sender.split('@')[0]} link de otro grupo borrado, solo admins y VIP pueden pasar links`, mentions: [sender] })
        } catch(e){}
        return
      }
    }

    if (texto.includes('#id')) {
      await esperar()
      await sock.sendMessage(from, { text: `🆔 ID: ${from}` })
      return
    }
    if (texto.includes('#img')) {
      await esperar()
      let archivo = null
      if (fs.existsSync('./IMG.jpg')) archivo = './IMG.jpg'
      else if (fs.existsSync('./IMG.JPG')) archivo = './IMG.JPG'
      else if (fs.existsSync('./img.jpg')) archivo = './img.jpg'
      else if (fs.existsSync('./IMG.png')) archivo = './IMG.png'
      if (archivo) await sock.sendMessage(from, { image: fs.readFileSync(archivo), caption: '💰 *PRECIOS* 💰' })
      return
    }
    if (texto.includes('#menu')) {
      await esperar()
      await sock.sendMessage(from, { text: '*🤖 MENU COMPLETO - COD 889*\n\n📸 #img - Precios\n📋 #menu - Menu\n🆔 #id - ID grupo\n🔍 #pista - Adivinanza\n\n*SOLO ADMINS:*\n📢 #todos / #all\n🔒 #cerrar / #abrir\n👢 #kick @usuario\n⭐ #vip @usuario - Dar VIP (puede pasar links)\n❌ #novip @usuario - Quitar VIP\n📃 #vips - Ver VIPs\n\n🛡️ Anti-link otros grupos ACTIVO\n⭐ VIPs si pueden pasar links\n⏰ Auto 10:30PM-5AM MX' })
      return
    }
    if (texto.startsWith('#pista')) {
      await esperar()
      await sock.sendMessage(from, { text: `*🔍 #PISTA - RECOMPENSA: PASE DE BATALLA PRÓXIMA TEMPORADA 🔍*\n\n📜 CIFRADO:\n\`19-9   12-15   4-5-19-3-9-6-18-1-19-20-5-19   5-19   16-15-18-17-21-5   5-18-5-19   21-14   8-21-18-7-9-4-15   4-5   20-18-9-16-1-19\`\n\nA=1, Z=26` })
      return
    }
    if (texto.startsWith('#vip')) {
      if (!esGrupo) return
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      if (!admins.includes(sender)) return sock.sendMessage(from, {text: '❌ Solo admins pueden dar VIP'})
      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
      if (!mentioned || mentioned.length==0) return sock.sendMessage(from, {text: 'Usa: #vip @usuario'})
      mentioned.forEach(jid => { if(!vips.includes(jid)) vips.push(jid) })
      guardarVips()
      await esperar()
      await sock.sendMessage(from, { text: `⭐ @${mentioned[0].split('@')[0]} ahora es VIP, ya puede pasar links de otros grupos`, mentions: mentioned })
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
      await sock.sendMessage(from, { text: `❌ VIP quitado a @${mentioned[0].split('@')[0]}`, mentions: mentioned })
      return
    }
    if (texto.startsWith('#vips')) {
      if (vips.length==0) return sock.sendMessage(from, {text: 'No hay VIPs aún'})
      let txt = '*⭐ LISTA VIPs:*\n'
      vips.forEach(v=> txt+=`@`+v.split('@')[0]+'\n')
      await sock.sendMessage(from, { text: txt, mentions: vips })
      return
    }
    if (texto.startsWith('#todos') || texto.startsWith('#all')) {
      if (!esGrupo) return
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      if (!admins.includes(sender)) return sock.sendMessage(from, {text: '❌ Solo admins'})
      await esperar()
      let mentions = metadata.participants.map(p=>p.id)
      await sock.sendMessage(from, { text: '📢 ATENCION TODOS 📢\n#img para precios', mentions })
      return
    }
    if (texto.startsWith('#cerrar') || texto.startsWith('#abrir')) {
      if (!esGrupo) return
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      if (!admins.includes(sender)) return sock.sendMessage(from, {text: '❌ Solo admins'})
      await esperar()
      if(texto.startsWith('#cerrar')){
        await sock.groupSettingUpdate(from, 'announcement')
        await sock.sendMessage(from, {text: '🔒 Grupo cerrado por admin'})
      } else {
        await sock.groupSettingUpdate(from, 'not_announcement')
        await sock.sendMessage(from, {text: '🔓 Grupo abierto por admin'})
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
      }
      return
    }
    if (texto.startsWith('#')) {
      if (!COMANDOS_VALIDOS.some(c => texto.startsWith(c))) {
        await esperar()
        await sock.sendMessage(from, { text: '❌ Comando no valido amor, escribe #menu' })
      }
    }
  })
}
start()
