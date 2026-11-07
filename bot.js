const fs = require('fs')
if (fs.existsSync('./auth')) {
  fs.rmSync('./auth', { recursive: true, force: true })
  console.log('BORRE AUTH VIEJA')
}
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')
const app = express()
let qrString = ''
let isConnected = false

app.get('/', async (req,res) => {
    if(isConnected) return res.send('Sabrina CONECTADA! Ya funciona #IMG - prueba en privado al 92426533')
    if(qrString) {
        const qrImage = await QRCode.toDataURL(qrString)
        return res.send(`<h1>ESCANEA YA 92426533</h1><img src="${qrImage}" width="380"><br><br><h2>Si expira dale F5</h2>`)
    } else {
        res.send('Iniciando... Espera 20 seg y dale F5. Si no sale QR ve a Logs en Render')
    }
})
app.listen(3000, () => console.log('Web en 3000'))

async function start() {
    console.log('Iniciando bot...')
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), printQRInTerminal: true })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u) => {
        if(u.qr) { 
          qrString = u.qr; 
          isConnected = false
          console.log('>>>> QR GENERADO! Ve a https://sabrina-bot-57mg.onrender.com <<<<') 
        }
        if(u.connection === 'close') {
            isConnected = false
            console.log('Cerrado, reiniciando en 3 seg...')
            setTimeout(start, 3000)
        }
        if(u.connection === 'open') { 
          qrString = ''; 
          isConnected = true
          console.log('>>>> CONECTADA! #IMG YA FUNCIONA <<<<') 
        }
    })
    sock.ev.on('messages.upsert', async m => {
        try {
          const msg = m.messages[0]
          if(!msg.message || msg.key.fromMe) return
          const from = msg.key.remoteJid
          const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase()
          console.log('RECIBI:', text, 'de', from)
          if(text.includes('#img')) {
            console.log('DETECTO #IMG, MANDANDO')
            if(fs.existsSync('./IMG.jpg')) {
                await sock.sendMessage(from, { image: fs.readFileSync('./IMG.jpg'), caption: '💰 PRECIOS COD 💰' })
            } else {
                await sock.sendMessage(from, { text: 'Sube IMG.jpg a GitHub' })
            }
          }
        } catch(e){ console.log('error msg', e) }
    })
}
start()
