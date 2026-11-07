const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const fs = require('fs')

const app = express()
let qrEnMemoria = null

app.get('/', (req,res)=>res.send('TOMATE-BOT ON - ve a /qr'))
app.get('/qr', async (req,res)=>{
  if(!qrEnMemoria) return res.send('<h1>Bot conectado o generando... recarga en 5 seg</h1><script>setTimeout(()=>location.reload(),5000)</script>')
  const qrcode = require('qrcode')
  const img = await qrcode.toDataURL(qrEnMemoria)
  res.send(`<center><img src="${img}" style="width:400px"><h1>ESCANEA RAPIDO</h1><script>setTimeout(()=>location.reload(),15000)</script></center>`)
})
app.listen(process.env.PORT || 3000)

let autorizados = []

async function start(){
  const { state, saveCreds } = await useMultiFileAuthState('./sesion')
  const { version } = await fetchLatestBaileysVersion()
  const sock = makeWASocket({ version, auth: state, logger: P({ level: 'silent' }), browser: ['TOMATE','Chrome','1.0'] })
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async(u)=>{
    const { connection, lastDisconnect, qr } = u
    if(qr){ qrEnMemoria = qr; console.log('QR NUEVO') }
    if(connection==='close'){
      const reconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if(reconnect) start()
    }
    if(connection==='open'){ console.log('CONECTADO ✅'); qrEnMemoria=null }
  })

  sock.ev.on('messages.upsert', async({messages})=>{
    const m = messages[0]
    if(!m.message || m.key.fromMe) return
    const jid = m.key.remoteJid
    if(!jid.endsWith('@g.us')) return
    const sender = m.key.participant || jid
    const text = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || '').trim()
    const t = text.toLowerCase()
    const isSticker = !!m.message.stickerMessage

    // #PRECIOS
    if(t==='#precios' || t==='#lista' || t==='#cp'){
      try{
        await sock.sendMessage(jid,{ image: fs.readFileSync('./precios.jpg'), caption: '🔥 *TOMATE STORE - PRECIOS* 🔥\nVia normal 1-3 dias / Rapida 1-12h\n#menu para ver comandos' })
      }catch{ await sock.sendMessage(jid,{ text: 'Sube precios.jpg a GitHub' }) }
      return
    }
    if(t==='#menu' || t==='#help'){
      await sock.sendMessage(jid,{ text: `📋 *MENU TOMATE BOT*\n\n#precios - Ver precios\n#aceptar - Aceptar todas las solis acumuladas\n#kick @user - Sacar\n#admin @user - Dar admin (solo admins)\n#quitaradmin @user - Quitar admin\n#autorizar @user - Autorizar anti-link/sticker` })
      return
    }

    // permisos admin
    let isSenderAdmin = false
    try{
      const meta = await sock.groupMetadata(jid)
      isSenderAdmin = !!meta.participants.find(p=>p.id===sender)?.admin
    }catch{}

    // #ACEPTAR SOLIS - ACEPTA TODAS DE UN SOLO
    if(t==='#aceptar'){
      if(!isSenderAdmin){ await sock.sendMessage(jid,{text:'❌ Solo admins'}); return }
      try{
        const pending = await sock.groupRequestParticipantsList(jid)
        if(pending.length===0){ await sock.sendMessage(jid,{text:'No hay solis acumuladas ✅'}); return }
        await sock.sendMessage(jid,{text:`🔥 Aceptando ${pending.length} solis de un solo...`})
        for(let p of pending){
          await sock.groupRequestParticipantsUpdate(jid, [p.jid], 'approve')
          await new Promise(r=>setTimeout(r,500))
        }
        await sock.sendMessage(jid,{text:`✅ Acepte ${pending.length} solis`})
      }catch(e){ await sock.sendMessage(jid,{text:'❌ Activa en el grupo: Info > Config > Aprobar nuevos participantes = SI'}) }
      return
    }

    // #KICK
    if(t.startsWith('#kick') || t.startsWith('#sacar') || t.startsWith('#ban')){
      if(!isSenderAdmin){ await sock.sendMessage(jid,{text:'❌ Solo admins'}); return }
      const menc = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
      if(!menc.length){ await sock.sendMessage(jid,{text:'Usa: #kick @persona'}); return }
      await sock.groupParticipantsUpdate(jid, menc, 'remove')
      return
    }
    // #ADMIN
    if(t.startsWith('#admin') || t.startsWith('#promover') || t.startsWith('#daradmin')){
      if(!isSenderAdmin){ await sock.sendMessage(jid,{text:'❌ Solo admins pueden dar admin'}); return }
      const menc = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
      if(!menc.length){ await sock.sendMessage(jid,{text:'Usa: #admin @persona'}); return }
      await sock.groupParticipantsUpdate(jid, menc, 'promote')
      await sock.sendMessage(jid,{text:`👑 Admin dado a @${menc[0].split('@')[0]}`, mentions:menc})
      return
    }
    if(t.startsWith('#quitaradmin') || t.startsWith('#demote')){
      if(!isSenderAdmin){ await sock.sendMessage(jid,{text:'❌ Solo admins'}); return }
      const menc = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
      await sock.groupParticipantsUpdate(jid, menc, 'demote')
      return
    }
    if(t.startsWith('#autorizar')){
      const menc = m.message.extendedTextMessage?.contextInfo?.mentionedJid || []
      if(menc[0] && !autorizados.includes(menc[0])) autorizados.push(menc[0])
      await sock.sendMessage(jid,{text:'✅ Autorizado'})
      return
    }

    // ANTI-LINK Y STICKER
    try{
      const meta = await sock.groupMetadata(jid)
      if(meta.participants.find(p=>p.id===sender)?.admin) return
    }catch{}
    const esAutorizado = autorizados.includes(sender)
    if(/chat\.whatsapp\.com/i.test(text) && !esAutorizado){
      try{ await sock.sendMessage(jid,{ delete: m.key }); await sock.sendMessage(jid,{text:`⚠️ Links prohibidos @${sender.split('@')[0]}`, mentions:[sender]}) }catch{}
      return
    }
    if(isSticker && !esAutorizado){
      try{ await sock.sendMessage(jid,{ delete: m.key }) }catch{}
    }
  })
}
start()
