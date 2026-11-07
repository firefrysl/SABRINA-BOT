const fs = require('fs')
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')
const app = express()

let qr = ''
let conectado = false

const COMANDOS_VALIDOS = ['#img', '#menu', '#todos', '#all', '#cerrar', '#abrir', '#kick']

app.get('/', async (req, res) => {
  if (conectado) return res.send('<h1 style="text-align:center;margin-top:100px;font-family:sans-serif">✅ SABRINA CONECTADA 92426533</h1>')
  if (qr) {
    const img = await QRCode.toDataURL(qr)
    return res.send(`<center style="font-family:sans-serif"><h2>ESCANEA QR CON 92426533</h2><img src="${img}" style="width:350px;border:10px solid #000"><p>Dale F5 si expira</p></center>`)
  }
  res.send('Iniciando... dale F5 en 30 seg')
})
app.listen(3000, () => console.log('Web lista'))

async function start() {
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'silent' }), browser: ['Chrome', 'Windows', '10'] })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', u => {
    if (u.qr) qr = u.qr
    if (u.connection === 'open') { qr = ''; conectado = true; console.log('✅ CONECTADA') }
    if (u.connection === 'close') { conectado = false; setTimeout(start, 3000) }
  })

  sock.ev.on('messages.upsert', async m => {
    const msg = m.messages[0]
    if (!msg.message || msg.key.fromMe) return
    const from = msg.key.remoteJid
    const textoRaw = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ''
    const texto = textoRaw.toLowerCase().trim()
    const esGrupo = from.endsWith('@g.us')
    const sender = esGrupo ? msg.key.participant : from
    const esDuena = sender.includes('92426533')

    // #IMG
    if (texto.includes('#img')) {
      let archivo = null
      if (fs.existsSync('./IMG.jpg')) archivo = './IMG.jpg'
      else if (fs.existsSync('./IMG.JPG')) archivo = './IMG.JPG'
      else if (fs.existsSync('./img.jpg')) archivo = './img.jpg'
      else if (fs.existsSync('./IMG.png')) archivo = './IMG.png'
      if (archivo) await sock.sendMessage(from, { image: fs.readFileSync(archivo), caption: '💰 *PRECIOS COD POINTS* 💰\n\n⚡ RAPIDA 1-12 HORAS\n🕒 NORMAL 1-3 DIAS\n\nEscribe *#menu*' })
      else await sock.sendMessage(from, { text: '❌ No encuentro IMG.jpg' })
      return
    }

    // #MENU
    if (texto.includes('#menu')) {
      await sock.sendMessage(from, { text: '*🤖 MENU SABRINA 92426533*\n\n📸 #img - Ver precios\n📋 #menu - Ver menu\n\n*SOLO ADMINS:*\n📢 #todos - Etiquetar a todos\n🔒 #cerrar - Cerrar grupo\n🔓 #abrir - Abrir grupo' })
      return
    }

    // #TODOS
    if (texto.startsWith('#todos') || texto.startsWith('#all')) {
      if (!esGrupo) return
      const metadata = await sock.groupMetadata(from)
      const admins = metadata.participants.filter(p => p.admin).map(p => p.id)
      if (!admins.includes(sender) && !esDuena) return
      let mentions = []
      let txt = '📢 *ATENCION A TODOS* 📢\n\n💰 ¡NUEVOS PRECIOS DISPONIBLES!\nEscribe #img\n\n'
      for (let p of metadata.participants) mentions.push(p.id)
      await sock.sendMessage(from, { text: txt, mentions })
      return
    }

    // #CERRAR / #ABRIR
    if (texto.startsWith('#cerrar')) {
      if (!esDuena) return sock.sendMessage(from, { text: '❌ Solo la dueña 92426533' })
      await sock.groupSettingUpdate(from, 'announcement')
      await sock.sendMessage(from, { text: '🔒 Grupo cerrado, solo admins pueden hablar' })
      return
    }
    if (texto.startsWith('#abrir')) {
      if (!esDuena) return
      await sock.groupSettingUpdate(from, 'not_announcement')
      await sock.sendMessage(from, { text: '🔓 Grupo abierto para todos' })
      return
    }

    // SI ESCRIBE UN COMANDO QUE NO EXISTE
    if (texto.startsWith('#')) {
      const esValido = COMANDOS_VALIDOS.some(c => texto.startsWith(c))
      if (!esValido) {
        await sock.sendMessage(from, { text: `❌ *Este comando no está en mi lista* ❌\n\nEscribe *#menu* para ver los comandos disponibles amor 💖` })
      }
    }
  })
}
start()
