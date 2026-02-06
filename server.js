const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
let sock = null;
let qr = null;
let isReady = false;

async function connectWhatsApp() {
    console.log('🚀 Starting WhatsApp Bot...');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
    });
    
    sock.ev.on('connection.update', (update) => {
        const { connection, qr: qrCode } = update;
        
        if (qrCode) {
            qr = qrCode;
            console.log('📱 QR Code:');
            qrcode.generate(qrCode, { small: true });
        }
        
        if (connection === 'open') {
            isReady = true;
            console.log('✅ WhatsApp Connected!');
        }
        
        if (connection === 'close') {
            console.log('❌ Disconnected. Reconnecting...');
            setTimeout(connectWhatsApp, 3000);
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
}

app.get('/', (req, res) => {
    res.json({
        app: 'Arun Computer WhatsApp Bot',
        status: isReady ? 'Connected' : 'Disconnected',
        has_qr: !!qr
    });
});

app.get('/qr', (req, res) => {
    if (qr) {
        qrcode.generate(qr, { small: true }, (qrcodeText) => {
            res.send(`<pre>${qrcodeText}</pre>`);
        });
    } else {
        res.json({ message: 'QR generating... Refresh page.' });
    }
});

app.post('/send', async (req, res) => {
    if (!isReady) {
        return res.json({ error: 'WhatsApp not connected' });
    }
    
    try {
        const { phone, message } = req.body;
        const jid = phone.replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true });
    } catch (error) {
        res.json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    setTimeout(connectWhatsApp, 2000);
});