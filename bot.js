const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const P = require('pino')
const qrcode = require('qrcode-terminal')

async function startBot() {
    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    
    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Sabrina','Chrome','1.0']
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if(qr) {
            console.log('=== ESCANEA ESTE QR CON WHATSAPP 50492426533 ===')
            qrcode.generate(qr, { small: true })
            console.log('===============================================')
        }

        if(connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if(shouldReconnect) {
                startBot()
            }
        } else if(connection === 'open') {
            console.log('SABRINA CONECTADA! YA ESTA LISTA')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return
        const jid = msg.key.remoteJid
        const t = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase().trim()
        if(['hola','#hola','menu','#menu','buenas'].includes(t)) {
            await sock.sendMessage(jid, { text: 'Hola mi amor! 💖 Soy Sabrina lista!\n\n#precios\n#catalogo' })
        }
    })
}

startBot()
