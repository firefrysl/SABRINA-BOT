const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')

const app = express()
let lastQR = null

app.get('/', async (req, res) => {
    if(!lastQR) return res.send('<h1>Esperando QR... recarga en 5 seg</h1><script>setTimeout(()=>location.reload(),5000)</script>')
    const qrImage = await QRCode.toDataURL(lastQR)
    res.send(`<html><body style="text-align:center; padding:20px"><h1>Escanea con 50492426533</h1><img src="${qrImage}" style="width:90%; max-width:400px"><p>Recarga si expira</p><script>setTimeout(()=>location.reload(),20000)</script></body></html>`)
})

app.listen(process.env.PORT || 3000, () => console.log('Web lista'))

async function startBot() {
    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    
    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: 'silent' }),
        browser: ['Sabrina','Chrome','1.0']
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        if(qr) {
            lastQR = qr
            console.log('QR Generado - Ve a tu link de Render para escanearlo')
        }
        if(connection === 'close') {
            if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot()
            }
        } else if(connection === 'open') {
            lastQR = null
            console.log('SABRINA CONECTADA!')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return
        const t = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase().trim()
        if(['hola','#hola','menu','#menu','buenas'].includes(t)) {
            await sock.sendMessage(msg.key.remoteJid, { text: 'Hola mi amor! 💖 Soy Sabrina lista!\n\n#precios\n#catalogo' })
        }
    })
}
startBot()
