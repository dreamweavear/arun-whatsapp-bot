// server.js - SIMPLE WORKING VERSION
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
let sock = null;
let qr = null;
let isReady = false;

// Connect to WhatsApp
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

// API Routes
app.get('/', (req, res) => {
    res.json({
        app: 'Arun Computer WhatsApp Bot',
        status: isReady ? 'Connected ✅' : 'Disconnected ❌',
        has_qr: !!qr,
        message: isReady ? 'Bot is ready!' : 'Scan QR at /qr'
    });
});

app.get('/qr', (req, res) => {
    if (qr) {
        qrcode.generate(qr, { small: true }, (qrcodeText) => {
            res.send(`
                <html>
                <body style="text-align:center; padding:50px;">
                    <h2>📱 Scan QR Code</h2>
                    <pre style="font-size:10px;">${qrcodeText}</pre>
                    <p>1. Open WhatsApp → Settings → Linked Devices</p>
                    <p>2. Tap "Link a Device"</p>
                    <p>3. Scan QR code above</p>
                    <p><strong>Status:</strong> ${isReady ? '✅ Connected' : 'Waiting for scan...'}</p>
                </body>
                </html>
            `);
        });
    } else {
        res.json({ message: 'QR generating... Refresh in 5 seconds.' });
    }
});

app.post('/send', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!isReady) {
            return res.json({ error: 'WhatsApp not connected' });
        }
        
        const jid = phone.replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(jid, { text: message });
        
        res.json({ success: true, message: 'Sent!' });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`🌐 Open: https://arun-whatsapp-bot-production.up.railway.app`);
    
    // Start WhatsApp after 2 seconds
    setTimeout(connectWhatsApp, 2000);
});