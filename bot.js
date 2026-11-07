const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const Boom = require('@hapi/boom')
const qrcode = require('qrcode-terminal')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if(qr) {
            console.log('ESCANEA ESTE QR:')
            qrcode.generate(qr, { small: true })
        }

        if(connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if(shouldReconnect) {
                startBot()
            }
        } else if(connection === 'open') {
            console.log('BOT CONECTADO - SABRINA LISTA')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        const jid = m.key.remoteJid
        const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || "").toLowerCase().trim()
        
        if(!text) return

        if(text === 'hola' || text === '#hola' || text === '#menu' || text === 'menu' || text === 'buenas') {
            await sock.sendMessage(jid, { text: `¡Hola mi amor! 💖 Soy Sabrina\n\n✨ COMANDOS:\n#precios\n#catalogo\n#pedido\n#horario\n#ubicacion\n#pago\n#promo` })
        }
        if(text === '#precios' || text === 'precios') {
            await sock.sendMessage(jid, { text: '💖 LISTA DE PRECIOS SABRINA 💖' })
        }
        if(text === '#catalogo' || text === 'catalogo') {
            await sock.sendMessage(jid, { text: '📸 CATALOGO SABRINA' })
        }
    })
}

startBot()
