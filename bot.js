const fs = require('fs')
if (fs.existsSync('./auth')) fs.rmSync('./auth', { recursive: true, force: true })

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')

const app = express()
let qrString = ''
let conectado = false

app.get('/', async (req,res) => {
    if(conectado) return res.send('<h1>Sabrina CONECTADA! Ya prueba #IMG</h1>')
    if(qrString) {
        const qr = await QRCode.toDataURL(qrString)
        return res.send(`<h1>ESCANEA 92426533 YA</h1><img src="${qr}" width="350"><br><p>Dale F5 si expira</p>`)
    }
    res.send('Iniciando... espera 15 seg y dale F5')
})
app.listen(3000)

async function start() {
  console.log('Iniciando bot...')
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async (u) => {
      if(u.qr) { 
        qrString = u.qr 
        console.log('¡QR GENERADO! Ve a tu link de Render')
      }
      if(u.connection === 'close') {
        const error = u.lastDisconnect?.error
        console.log('ERROR COMPLETO:', error)
        console.log('Codigo:', error?.output?.statusCode)
        conectado = false
        setTimeout(start, 3000)
      }
      if(u.connection === 'open') {
        qrString = ''
        conectado = true
        console.log('CONECTADA OK #IMG FUNCIONA')
      }
  })
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0]
    if(!msg.message || msg.key.fromMe) return
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase()
    console.log('Mensaje:', text)
    if(text.includes('#img')) {
        const from = msg.key.remoteJid
        if(fs.existsSync('./IMG.jpg')) {
            await sock.sendMessage(from, { image: fs.readFileSync('./IMG.jpg'), caption: '💰 PRECIOS COD POINTS 💰' })
        } else {
            await sock.sendMessage(from, { text: 'No encuentro IMG.jpg' })
        }
    }
  })
}
start()
