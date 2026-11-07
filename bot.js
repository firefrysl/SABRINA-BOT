const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    })

    sock.ev.on('creds.update', saveCreds)

    if(!sock.authState.creds.registered) {
        const number = '50492426533' // <--- PON TU NUMERO AQUI SIN ESPACIOS
        setTimeout(async () => {
            const code = await sock.requestPairingCode(number)
            console.log('TU CODIGO ES: ' + code)
        }, 3000)
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                startBot()
            }
        } else if(connection === 'open') {
            console.log('SABRINA CONECTADA')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message) return
        const jid = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""
        const t = text.toLowerCase()

        if(t === 'hola' || t === '#hola' || t === '#menu' || t === 'menu') {
            await sock.sendMessage(jid, { text: 'Hola mi amor! 💖 Soy Sabrina lista!\n\n#precios\n#catalogo\n#pedido\n#horario\n#ubicacion' })
        }
    })
}
startBot()
