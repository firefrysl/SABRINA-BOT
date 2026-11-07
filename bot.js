const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const P = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;
let qrDataURL = null;
let conectado = false;

app.get('/', (req, res) => {
  if (conectado) {
    return res.send('<center><h1>✅ SABRINA CONECTADA 💋</h1><p>Ya puedes usar el bot en WhatsApp</p></center>');
  }
  if (qrDataURL) {
    return res.send(`<center><h1>Escanea este QR amor 💋</h1><img src="${qrDataURL}" style="width:320px;border:10px solid #000;border-radius:10px"><p><b>WhatsApp > 3 puntitos > Dispositivos vinculados > Vincular</b></p><p>El QR se renueva cada 30 seg, actualiza si expira</p></center>`);
  }
  res.send('<center><h1>⏳ Iniciando Sabrina... espera 30 segundos y actualiza la página</h1></center>');
});

app.listen(PORT, '0.0.0.0', () => console.log('Web OK en puerto ' + PORT));

async function iniciar() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_sabrina');
    const sock = makeWASocket({ 
      auth: state, 
      logger: P({ level: 'fatal' }),
      printQRInTerminal: true 
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (u) => {
      const { connection, lastDisconnect, qr } = u;
      
      if (qr) { 
        qrDataURL = await QRCode.toDataURL(qr); 
        console.log('QR LISTO - VE A TU WEB'); 
      }
      
      if (connection === 'open') { 
        conectado = true; 
        qrDataURL = null; 
        console.log('>>> SABRINA CONECTADA <<<'); 
      }
      
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) {
          console.log('Reconectando...');
          setTimeout(iniciar, 3000);
        }
      }
    });

  } catch (e) { 
    console.log('Error iniciando', e); 
    setTimeout(iniciar, 5000); 
  }
}

iniciar();
