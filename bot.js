const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
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
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            if(shouldReconnect) {
                startBot()
            }
        } else if(connection === 'open') {
            console.log('BOT CONECTADO - SABRINA')
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        // if (m.key.fromMe) return; // DESACTIVADO PARA QUE TE RESPONDA A TI MISMA
        
        const jid = m.key.remoteJid
        const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || "").toLowerCase().trim()
        
        if(!text) return

        console.log(`Mensaje de ${jid}: ${text}`)

        // 1. SALUDO
        if(text === 'hola' || text === '#hola' || text === '#menu' || text === 'buenas' || text === '#inicio' || text === 'menu') {
            await sock.sendMessage(jid, { text: `¡Hola mi amor! 💖 Soy Sabrina

✨ *COMANDOS:*
#precios - Ver precios
#catalogo - Ver catálogo
#pedido - Hacer pedido
#horario - Horario
#ubicacion - Ubicación
#pago - Datos de pago
#promo - Promos` })
        }

        // 2. PRECIOS CON FOTO
        if(text === '#precios' || text === 'precios' || text === 'precio') {
            if(fs.existsSync('./IMG-20261103-WA0341.jpg')) {
                await sock.sendMessage(jid, { 
                    image: fs.readFileSync('./IMG-20261103-WA0341.jpg'),
                    caption: '💖 *LISTA DE PRECIOS SABRINA* 💖' 
                })
            } else {
                await sock.sendMessage(jid, { text: 'Precios: Mándame qué producto quieres y te digo precio 💖' })
            }
        }

        // 3. CATALOGO
        if(text === '#catalogo' || text === 'catalogo') {
            await sock.sendMessage(jid, { text: '📸 *CATÁLOGO SABRINA*\nAquí están todos nuestros productos disponibles 💖\n\nEscríbeme qué te gusta' })
        }

        // 4. PEDIDO
        if(text === '#pedido' || text === 'quiero pedir' || text === 'hacer pedido') {
            await sock.sendMessage(jid, { text: '🛒 Para hacer pedido dime:\n1. Qué producto quieres\n2. Tu nombre\n3. Dirección\n\n¡Y te lo aparto!' })
        }

        // 5. HORARIO
        if(text === '#horario' || text === 'horario') {
            await sock.sendMessage(jid, { text: '⏰ *HORARIO*\nLunes a Domingo\n9am - 8pm' })
        }

        // 6. UBICACION
        if(text === '#ubicacion' || text === 'ubicacion' || text === 'direccion') {
            await sock.sendMessage(jid, { text: '📍 Estamos en Tegucigalpa\nEnvíos a toda Honduras 🇭🇳' })
        }

        // 7. PAGO
        if(text === '#pago' || text === '#transferencia' || text === 'datos de pago') {
            await sock.sendMessage(jid, { text: '💳 *DATOS DE PAGO*\n\nPON AQUÍ TU CUENTA BAC / TIGO MONEY' })
        }

        // 8. PROMO
        if(text === '#promo' || text === '#oferta' || text === '#ofertas') {
            await sock.sendMessage(jid, { text: '🔥 *PROMOS DE HOY*\n¡Pregúntame por las ofertas disponibles!' })
        }
    })
}

startBot()
