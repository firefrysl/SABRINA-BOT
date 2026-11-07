const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')

const app = express()
let lastQR = null

app.get('/', async (req, res) => {
    if(!lastQR) return res.send('<h1 style="text-align:center;margin-top:50px">✅ SABRINA CONECTADA 💅</h1>')
    const img = await QRCode.toDataURL(lastQR)
    res.send(`<center><h1>Escanea 92426533</h1><img src="${img}" style="width:90%;max-width:380px"><script>setTimeout(()=>location.reload(),20000)</script></center>`)
})
app.listen(process.env.PORT || 3000)

async function startBot() {
    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ version, auth: state, logger: P({ level: 'silent' }), browser: ['Sabrina','Chrome','1.0'] })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', async (u) => {
        if(u.qr) { lastQR = u.qr; console.log('Nuevo QR') }
        if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(startBot, 3000)
        if(u.connection === 'open') { lastQR = null; console.log('SABRINA CONECTADA!') }
    })

    // AQUI ES DONDE VA - ESTA PARTE ES LA DEL GRUPO
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0]
            if(!msg.message || msg.key.fromMe) return
            const jid = msg.key.remoteJid
            const isGroup = jid.endsWith('@g.us')
            const txt = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase().trim()
            if(!txt) return
            console.log(isGroup ? 'Grupo:' : 'Privado:', txt)

            // En grupo solo responde si dicen sabrina, hola o #
            if(isGroup && !txt.includes('#') && !txt.includes('sabrina') && !txt.includes('hola')) return

            if(['hola','buenas','#menu','menu','sabrina'].some(x=>txt.includes(x))) {
                await sock.sendMessage(jid, { text: `Hola! 💖 Soy *Sabrina* ${isGroup ? 'del grupo' : ''}\n\n#precios\n#catalogo\n#pedido\n#horario` })
            } else if(txt.includes('precio')) {
                await sock.sendMessage(jid, { text: `💅 *PRECIOS*\nAcrílicas: L350\nSemi: L250\nSoft Gel: L400\nRetoque: L200` })
            } else if(txt.includes('pedido') || txt.includes('agendar') || txt.includes('cita')) {
                await sock.sendMessage(jid, { text: `¡Anotado! 💖 Dime que diseño quieres y que día puedes` })
            }
        } catch(e){ console.log(e) }
    })
}
startBot()
