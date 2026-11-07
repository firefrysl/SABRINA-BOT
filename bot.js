const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const Boom = require('@hapi/boom')
const fs = require('fs')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if(shouldReconnect) {
                startBot()
            }
        } else if(connection === 'open') {
            console.log('BOT CONECTADO - SABRINA')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        // if (m.key.fromMe) return;
        
        const jid = m.key.remoteJid
        const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || "").toLowerCase().trim()
        
        if(!text) return

        if(text === 'hola' || text === '#hola' || text === '#menu' || text === 'menu' || text === 'buenas') {
            await sock.sendMessage(jid, { text: `¡Hola mi amor! 💖 Soy Sabrina\n\n✨ COMANDOS:\n#precios - Ver precios\n#catalogo - Catalogo\n#pedido - Hacer pedido\n#horario - Horario\n#ubicacion - Ubicacion\n#pago - Datos de pago\n#promo - Promos` })
        }

        if(text === '#precios' || text === 'precios' || text === 'precio') {
            await sock.sendMessage(jid, { text: '💖 LISTA DE PRECIOS SABRINA 💖\nMandame que producto quieres' })
        }

        if(text === '#catalogo' || text === 'catalogo') {
            await sock.sendMessage(jid, { text: '📸 CATALOGO SABRINA\nAqui estan todos nuestros productos 💖' })
        }

        if(text === '#pedido' || text === 'pedido') {
            await sock.sendMessage(jid, { text: '🛒 Para pedido dime:\n1. Producto\n2. Nombre\n3. Direccion' })
        }

        if(text === '#horario' || text === 'horario') {
            await sock.sendMessage(jid, { text: '⏰ HORARIO\nLunes a Domingo 9am - 8pm' })
        }

        if(text === '#ubicacion' || text === 'ubicacion') {
            await sock.sendMessage(jid, { text: '📍 Tegucigalpa - Envios a toda Honduras 🇭🇳' })
        }

        if(text === '#pago' || text === 'pago') {
            await sock.sendMessage(jid, { text: '💳 DATOS DE PAGO\nPon aqui tu cuenta' })
        }

        if(text === '#promo' || text === 'promo') {
            await sock.sendMessage(jid, { text: '🔥 PROMOS DE HOY\nPreguntame por ofertas!' })
        }
    })
}

startBot()
