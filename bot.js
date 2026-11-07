const fs = require('fs')
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const app = express()
let conectado = false
app.get('/', (req,res)=> res.send(conectado ? '✅ SABRINA CONECTADA - #IMG OK' : 'Iniciando...'))
app.listen(3000)

async function start(){
  const {version} = await fetchLatestBaileysVersion()
  const {state, saveCreds} = await useMultiFileAuthState('auth')
  const sock = makeWASocket({version, auth: state, logger: P({level:'silent'}), browser:['Chrome','Windows','10']})
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', u=>{
    if(u.connection==='open'){ conectado=true; console.log('CONECTADA!')}
    if(u.connection==='close'){ conectado=false; setTimeout(start,3000) }
  })
  sock.ev.on('messages.upsert', async m=>{
    const msg = m.messages[0]
    if(!msg.message || msg.key.fromMe) return
    const from = msg.key.remoteJid
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '').toLowerCase().trim()

    // --- COMANDOS ---

    if(text.includes('#img') || text.includes('#precios') || text.includes('#puntos')){
      if(fs.existsSync('./IMG.jpg')){
        await sock.sendMessage(from, { image: fs.readFileSync('./IMG.jpg'), caption: '💰 *PRECIOS COD POINTS* 💰\n\n⚡ *RAPIDA:* 1 a 12 HORAS\n🕒 *NORMAL:* 1 a 3 DIAS\n\nEscribe *#menu* para ver todo' })
      }
    }
    else if(text === '#menu' || text === '#ayuda' || text === '#help'){
      await sock.sendMessage(from, { text: `*🤖 SABRINA BOT - COMANDOS* 🤖\n\n📸 *#img* - Ver imagen de precios\n💰 *#precios* - Ver precios\n⚡ *#rapida* - Info recarga rapida\n🕒 *#normal* - Info recarga normal\n💳 *#pago* - Metodos de pago\n📞 *#contacto* - Hablar con admin\n\nEscribe cualquier comando en el grupo o privado` })
    }
    else if(text.includes('#rapida')){
      await sock.sendMessage(from, { text: `⚡ *RECARGA RAPIDA* ⚡\n\n✅ 1 a 12 HORAS MAXIMO\n✅ 100% segura\n✅ Precios en #img` })
    }
    else if(text.includes('#normal')){
      await sock.sendMessage(from, { text: `🕒 *RECARGA NORMAL* 🕒\n\n✅ 1 a 3 DIAS\n✅ Mas barata\n✅ Precios en #img` })
    }
    else if(text.includes('#pago')){
      await sock.sendMessage(from, { text: `💳 *METODOS DE PAGO* 💳\n\nPon aqui tu info:\n- Banco: ...\n- Tigo Money: ...\n- etc` })
    }
    else if(text.includes('#contacto') || text.includes('#admin')){
      await sock.sendMessage(from, { text: `📞 *CONTACTO ADMIN* 📞\n\nEscribe al 92426533` })
    }
  })
}
start()
