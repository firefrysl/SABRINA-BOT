const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')
const QRCode = require('qrcode')
const app = express()
let qrString = ''

app.get('/', async (req,res) => {
    if(qrString) {
        const qrImage = await QRCode.toDataURL(qrString)
        res.send(`<h1>QR NUEVO - Escanea YA 92426533</h1><img src="${qrImage}" width="400"><br><h2>Si expira dale F5</h2>`)
    } else {
        res.send('Sabrina CONECTADA! Ya puedes probar #IMG')
    }
})
app.listen(3000)

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) })
    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('connection.update', async u => {
        if(u.qr) { qrString = u.qr; console.log('QR NUEVO! Ve a https://sabrina-bot-57mg.onrender.com') }
        if(u.connection === 'close') {
            const reason = u.lastDisconnect?.error?.output?.statusCode
            console.log('Desconectada codigo:', reason)
            if(reason === DisconnectReason.loggedOut) {
                console.log('Sesion invalida, borrando auth...')
                if(fs.existsSync('./auth')) fs.rmSync('./auth', { recursive: true, force: true })
                qrString = ''
                start()
            } else {
                console.log('Reconectando...')
                start()
            }
        }
        if(u.connection === 'open') { qrString = ''; console.log('CONECTADA LISTA #IMG FUNCIONA!') }
    })
    
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return
        const from = msg.key.remoteJid
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim()
        console.log('Mensaje recibido:', text)
        if(!text.includes('#img')) return
        console.log('Es #IMG, enviando!')
        if(fs.existsSync('./IMG.jpg')) {
            await sock.sendMessage(from, { image: fs.readFileSync('./IMG.jpg'), caption: `💰 PRECIOS COD POINTS 💰\n⚡ RAPIDA: 1 a 12 HORAS\n🕒 NORMAL: 1 a 3 DIAS` })
        } else {
            await sock.sendMessage(from, { text: 'No encuentro IMG.jpg en GitHub amor' })
        }
    })
}
start()
