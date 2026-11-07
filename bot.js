// SABRINA PRO MAX - TODOS LOS COMANDOS INCLUIDOS
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const P = require('pino');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Sabrina PRO MAX activa - todos los comandos incluidos 💋'));
app.listen(PORT, () => console.log(`Render OK puerto ${PORT}`));

const ID_GRUPO = '1203630xxxxx@g.us'; // TU ID AQUI

const emocionesTTS = {
    coqueta: '--rate=+3% --pitch=+5Hz', juguetona: '--rate=+18% --pitch=+10Hz',
    susurro: '--rate=-8% --pitch=-3Hz', enojada: '--rate=+12% --pitch=+14Hz',
    timida: '--rate=-5% --pitch=+2Hz', feliz: '--rate=+10% --pitch=+6Hz'
};

const frasesSabrina = [
    { t: "Holaaa amorcito, me extrañaste? jeje yo si", e: "coqueta" },
    { t: "Holi bebé, por fin me hablas, estaba aburrida", e: "timida" },
    { t: "Mmm me encanta que me hablen así de lindo", e: "susurro" },
    { t: "Jajaja eres bien travieso, me caes bien", e: "juguetona" },
    { t: "Uy amor, me vas a enamorar si sigues así", e: "coqueta" },
    { t: "No me hagas enojar que me pongo celosa", e: "enojada" },
    { t: "Hola mi rey, te estaba esperando", e: "coqueta" },
    { t: "Ya llegue yo, la mas bonita del grupo", e: "juguetona" },
];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: ["Sabrina", "Chrome", "1.0"] });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => {
        if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
        if (u.connection === 'open') console.log('SABRINA CON TODOS LOS COMANDOS CONECTADA');
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        if (!from.endsWith('@g.us')) return;
        let texto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        let low = texto.toLowerCase().trim();
        
        const meta = await sock.groupMetadata(from).catch(()=>null);
        const parts = meta?.participants || [];
        const isAdmin = parts.find(p => p.id === msg.key.participant)?.admin;
        const isBotAdmin = parts.find(p => p.id === sock.user.id)?.admin;

        // ANTI-LINK
        if (low.includes('chat.whatsapp.com/')) {
            if (!isAdmin && isBotAdmin) {
                await sock.sendMessage(from, { text: `🚫 @${msg.key.participant.split('@')[0]} link no permitido`, mentions: [msg.key.participant] });
                await sock.groupParticipantsUpdate(from, [msg.key.participant], 'remove').catch(()=>{});
                return;
            }
        }

        // #VOZ
        if (low.startsWith('#voz')) {
            let r = frasesSabrina[Math.floor(Math.random()*frasesSabrina.length)];
            exec(`npx edge-tts --voice es-MX-DalilaNeural ${emocionesTTS[r.e]} --text "${r.t}" --write-media ./sabrina.mp3`, async () => {
                await sock.sendMessage(from, { audio: fs.readFileSync('./sabrina.mp3'), mimetype: 'audio/mpeg', ptt: true }, { quoted: msg });
            });
        }
        // #TODOS
        if (low.startsWith('#todos')) {
            if (!isAdmin) return;
            let txt = texto.slice(6) || "Atención mis cods 💋";
            let mentions = parts.map(p => p.id);
            await sock.sendMessage(from, { text: `📢 *SABRINA LLAMA A TODOS*\n\n${txt}\n\n` + mentions.map(m=>`@${m.split('@')[0]}`).join(' '), mentions });
        }
        // #ABRIR #CERRAR
        if (low === '#cerrar' && isAdmin) { await sock.groupSettingUpdate(from, 'announcement'); await sock.sendMessage(from, {text: '🌙 Cerr
