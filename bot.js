const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { exec } = require('child_process');
const fs = require('fs');
const P = require('pino');

// PON AQUI EL ID DE TU GRUPO - si no sabes cual es, escribeme y te digo como sacarlo
const ID_GRUPO = '1203630xxxxx@g.us';

const emocionesTTS = {
    coqueta: '--rate=+5% --pitch=+4Hz',
    juguetona: '--rate=+15% --pitch=+8Hz',
    susurro: '--rate=-10% --pitch=-2Hz',
    enojada: '--rate=+10% --pitch=+12Hz'
};

const sabrinaRespuestas = [
    { texto: "Holaaa amorcito, me extrañaste? jeje, yo si te extrañe", emocion: "coqueta" },
    { texto: "Holi bebé, por fin me hablas, estaba bien aburrida sin ti", emocion: "coqueta" },
    { texto: "Mmm me encanta cuando me hablan así de lindo, me sonrojas", emocion: "susurro" },
    { texto: "Jajajaja eres bien travieso, me caes super bien, juguemos un ratito?", emocion: "juguetona" },
    { texto: "Uy amor, si sigues así me vas a enamorar eh, te lo advierto", emocion: "coqueta" },
    { texto: "Ayyy no me hagas enojar que me pongo celosa, jeje", emocion: "enojada" },
    { texto: "Hola mi rey, te estaba esperando, que hacemos?", emocion: "coqueta" },
    { texto: "Bueno y a mi quien me saluda? ya llegue yo", emocion: "juguetona" },
    { texto: "Mmm que rico hablas, sigue sigue, te escucho", emocion: "susurro" },
    { texto: "Ay amor, me puse nerviosa, hablame bonito", emocion: "coqueta" },
];

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect } = u;
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
        } else if (connection === 'open') console.log('Sabrina PRO conectada con emociones');
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        let texto = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        let textoLower = texto.toLowerCase().trim();

        // SOLO RESPONDE EN GRUPOS
        if (!from.endsWith('@g.us')) return;

        // COMANDO #VOZ
        if (textoLower.startsWith('#voz')) {
            let random = sabrinaRespuestas[Math.floor(Math.random() * sabrinaRespuestas.length)];
            let textoVoz = random.texto;
            let emocion = emocionesTTS[random.emocion];

            console.log(`Sabrina dice: ${textoVoz} [${random.emocion}]`);

            const filePath = './sabrina.mp3';
            // Comando edge-tts con emocion
            const cmd = `npx edge-tts --voice es-MX-DalilaNeural ${emocion} --text "${textoVoz}" --write-media ${filePath}`;

            exec(cmd, async (err) => {
                if (err) {
                    console.log("Error TTS", err);
                    await sock.sendMessage(from, { text: `💋 ${textoVoz}` });
                    return;
                }
                try {
                    await sock.sendMessage(from, { 
                        audio: fs.readFileSync(filePath), 
                        mimetype: 'audio/mpeg', 
                        ptt: true 
                    }, { quoted: msg });
                    await sock.sendMessage(from, { text: `💋 ${textoVoz}` });
                } catch (e) { console.log(e); }
            });
        }

        // Tus otros comandos #todos etc los puedes poner aqui abajo
    });

    // CIERRE AUTOMATICO 10:30PM - 5AM HORA HONDURAS
    setInterval(async () => {
        try {
            let ahora = new Date().toLocaleString("en-US", { timeZone: "America/Tegucigalpa" });
            let d = new Date(ahora);
            let h = d.getHours(); let m = d.getMinutes();
            if (h === 22 && m === 30) {
                await sock.groupSettingUpdate(ID_GRUPO, 'announcement');
                await sock.sendMessage(ID_GRUPO, { text: '🌙 Grupo cerrado mis amores, descansen 💤' });
            }
            if (h === 5 && m === 0) {
                await sock.groupSettingUpdate(ID_GRUPO, 'not_announcement');
                await sock.sendMessage(ID_GRUPO, { text: '☀️ Buenos días mis cods, grupo abierto 🔥' });
            }
        } catch {}
    }, 60000);
}
startBot();
