const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')
const QRCode = require('qrcode')
const app = express()
let qrString = ''
let lastQR = Date.now()

app.get('/', async (req,res) => {
    if(qrString) {
        const qrImage = await QRCode.toDataURL(qrString)
        res.send(`<h1>ESCANEA QR - 92426533</h1><img src="${qrImage}" width="350"><br><a href="/">Actualizar</a>`)
    } else {
        res.send('Sabrina CONECTADA! Prueba #IMG en privado o grupo<br>Si no responde dale Clear cache & deploy en Render')
    }
})
app.listen(3000)

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ['Sabrina','Chrome','1.0'] })
    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('connection.update', u => {
        if(u.qr) { qrString = u.qr; lastQR = Date.now(); console.log('NUEVO QR - Ve a tu link de Render YA!') }
        if(u.connection === 'close') {
            const shouldReconnect = u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Desconectada, reconectando...', shouldReconnect)
            if(shouldReconnect) start()
        }
        if(u.connection === 'open') { qrString = ''; console.log('CONECTADA! Ya responde #IMG') }
    })
    
    sock.ev.on('messages.upsert', async m => {
        try {
            const msg = m.messages[0]
            if(!msg.message) return
            const from = msg.key.remoteJid
            const isGroup = from.endsWith('@g.us')
            const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '').toLowerCase().trim()
            
            console.log(`Mensaje de ${isGroup ? 'GRUPO' : 'PRIVADO'}: ${text} | de ${from}`)

            if(!text.includes('#img')) return
            
            console.log('SI ES #IMG! Mandando imagen...')
            
            if(fs.existsSync('./IMG.jpg')) {
                await sock.sendMessage(from, { image: fs.readFileSync('./IMG.jpg'), caption: `💰 *PRECIOS COD POINTS* 💰\n\n⚡ RÁPIDA: 1 a 12 HORAS\n🕒 NORMAL: 1 a 3 DÍAS` })
                console.log('Imagen enviada OK')
            } else {
                console.log('ERROR: No existe IMG.jpg en GitHub')
                await sock.sendMessage(from, { text: `No encuentro IMG.jpg amor, súbela a GitHub en la raíz` })
            }
        } catch(e) { console.log('Error:', e) }
    })
}
start()
