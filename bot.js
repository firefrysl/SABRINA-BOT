const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')
const fs = require('fs')
const app = express()
let qr = ''
let status = 'Iniciando...'

app.get('/', async (req,res)=>{
  if(status==='CONECTADA') return res.send('<h1>SABRINA CONECTADA! Ya puedes usar #IMG</h1>')
  if(qr){
    const img = await QRCode.toDataURL(qr)
    res.send(`<html><body style="text-align:center"><h1>ESCANEA QR 92426533</h1><img src="${img}" style="width:350px"><h2>Expira en 20 seg, dale F5</h2></body></html>`)
  } else {
    res.send(`<h1>${status} - Espera 10 seg y dale F5</h1>`)
  }
})
app.listen(3000)

async function start(){
  const {version} = await fetchLatestBaileysVersion()
  const {state, saveCreds} = await useMultiFileAuthState('auth')
  const sock = makeWASocket({version, auth: state, logger: P({level:'silent'}), browser:['Chrome','Windows','10']})
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async(u)=>{
    if(u.qr){ qr=u.qr; status='QR LISTO'; console.log('QR LISTO') }
    if(u.connection==='open'){ qr=''; status='CONECTADA'; console.log('CONECTADA') }
    if(u.connection==='close'){ status='Reconectando...'; console.log(u.lastDisconnect?.error); setTimeout(start,2000) }
  })
}
start()
