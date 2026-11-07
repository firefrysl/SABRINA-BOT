const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const express = require('express');
const P = require('pino');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;
let qrDataURL = null;
let conectado = false;

app.get('/', (req, res) => {
  if (conectado) return res.send('<center><h1>✅ SABRINA CONECTADA 💋</h1></center>');
  if (qrDataURL) return res.send(`<center><h1>Escanea amor 💋</h1><img src="${qrDataURL}" style="width:330px"><p>WhatsApp > Dispositivos vinculados > Vincular</p><p><b>Actualiza cada 30 segundos</b></p></center>`);
  res.send('<center><h1>⏳ Iniciando... espera 20 seg y actualiza</h1></center>');
});

app.listen(PORT, '0.0.0.0', () => console.log('Web OK ' + PORT));

async function iniciar() {
  try {
    const { version } = await fetchLatestBaileysVersion();
    console.log('Usando WA version', version);

    const { state, saveCreds } = await useMultiFileAuthState('./auth_sabrina');
    const sock = makeWASocket({
      version,
      auth: state,
      logger: P({ level: 'fatal' }),
      printQRInTerminal: true,
      browser: ['Sabrina PRO', 'Chrome', '1.0'],
      markOnlineOnConnect: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u) => {
      const { connection, lastDisconnect, qr } = u;
      
      if (qr) {
        qrDataURL = await QRCode.toDataURL(qr);
        console.log('>>> QR LISTO - ABRE TU WEB .onrender.com <<<');
      }

      if (connection === 'open') {
        conectado = true;
        qrDataURL = null;
        console.log('>>> CONECTADA <<<');
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message;
        console.log('Cerrado codigo', code, reason);

        conectado = false;
        
        // Si es logout, borra credenciales
        if (code === DisconnectReason.loggedOut) {
          console.log('Logged out, borrando auth');
          qrDataURL = null;
          // No reconecta automatico, esperamos deploy
          return;
        }

        console.log('Reconectando en 5 seg...');
        setTimeout(iniciar, 5000);
      }
    });

  } catch (e) {
    console.log('Error fatal', e);
    setTimeout(iniciar, 5000);
  }
}

iniciar();
