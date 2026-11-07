const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const P = require('pino')
const fs = require('fs')
const express = require('express')
const app = express()
app.get('/', (req,res) => res.send('Sabrina lista'))
app.listen(3000)

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) })
    sock.ev.on('creds.update', saveCreds)
    sock.ev.on('connection.update', u => { if(u.connection === 'open') console.log('CONECTADA LISTA CON #IMG!') })
    
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return
        const from = msg.key.remoteJid
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').toLowerCase().trim()
        
        if(text !== '#img') return // SOLO si escriben #img
        
        console.log('Piden #IMG en', from)
        
        try {
            if(fs.existsSync('./IMG.jpg')) {
                await sock.sendMessage(from, { 
                    image: fs.readFileSync('./IMG.jpg'),
                    caption: `💰 *PRECIOS COD POINTS* 💰\n\n⚡ VÍA RÁPIDA: 1 a 12 HORAS\n🕒 VÍA NORMAL: 1 a 3 DÍAS\n\nSolo acceso Activision ✅`
                })
            } else {
                await sock.sendMessage(from, { text: `Amor no encuentro IMG.jpg en GitHub, súbela!` })
            }
        } catch(e) { console.log(e) }
    })
}
start()
