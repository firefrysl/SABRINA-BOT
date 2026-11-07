const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')

async function startBot() {
    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    
    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Chrome', 'Chrome', '1.0'],
        syncFullHistory: false
    })

    sock.ev.on('creds.update', saveCreds)

    if(!sock.authState.creds.registered) {
        console.log('Generando codigo...')
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode('50492426533')
                console.log('=================================')
                console.log('CODIGO SABRINA: ' + code)
                console.log('=================================')
            } catch(e) {
                console.log('Error codigo, reintentando:', e.message)
                setTimeout(() => startBot(), 5000)
            }
        }, 8000)
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            console.log('Conexion cerrada codigo:', code)
            if(code !== DisconnectReason.loggedOut) {
                console.log('Reconectando en 5 seg...')
                setTimeout(() => startBot(), 5000)
            }
        } else if(connection === 'open') {
            console.log('¡SABRINA CONECTADA! YA FUNCIONA')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0]
            if(!msg.message || msg.key.fromMe) return
            const jid = msg.key.remoteJid
            const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase().trim()
            if(!text) return
            if(['hola','#hola','#menu','menu','buenas'].includes(text)) {
                await sock.sendMessage(jid, { text: 'Hola mi amor! 💖 Soy Sabrina\n\n#precios\n#catalogo\n#pedido' })
            }
        } catch(e) {}
    })
}

startBot()
