const fs = require('fs')
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')
const app = express()

let qr = ''
let conectado = false

app.get('/', async (req, res) => {
  if (conectado) {
    return res.send('<h1 style="text-align:center;margin-top:100px;font-family:sans-serif">✅ SABRINA CONECTADA 92426533<br><br>#IMG FUNCIONANDO<br>EN PRIVADO Y GRUPOS</h1>')
  }
  if (qr) {
    const img = await QRCode.toDataURL(qr)
    return res.send(`<center style="font-family:sans-serif"><h2>ESCANEA ESTE QR CON EL 92426533</h2><img src="${img}" style="width:350px;border:10px solid #000"><p>Si expira dale F5</p></center>`)
  }
  res.send('Iniciando... espera 30 seg y dale F5')
})

app.listen(3000, () => console.log('Web lista'))

async function start() {
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    browser: ['Chrome', 'Windows', '10'],
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (u) => {
    if (u.qr) qr = u.qr
    if (u.connection === 'open') {
      qr = ''
      conectado = true
      console.log('✅ CONECTADA!')
    }
    if (u.connection === 'close') {
      conectado = false
      setTimeout(start, 3000)
    }
  })

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0]
    if (!msg.message || msg.key.fromMe) return
    
    const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '').toLowerCase()
    
    if (texto.includes('#img')) {
      const de = msg.key.remoteJid
      console.log('Mando IMG a', de)
      if (fs.existsSync('./IMG.jpg')) {
        await sock.sendMessage(de, {
          image: fs.readFileSync('./IMG.jpg'),
          caption: '💰 *PRECIOS COD POINTS* 💰\n\n⚡ *RAPIDA:* 1 a 12 HORAS\n🕒 *NORMAL:* 1 a 3 DIAS\n\nEscribe *#menu*'
        })
      }
    }
    
    if (texto.includes('#menu')) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: '*🤖 COMANDOS SABRINA*\n\n📸 #img - Ver precios\n📋 #menu - Ver menu'
      })
    }
  })
}

start()
