// ADD AT THE VERY TOP OF server.js
const crypto = require('crypto');
global.crypto = crypto;

const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
let sock = null;
let qrCode = null;
let isReady = false;

// WhatsApp connection function
async function connectToWhatsApp() {
    console.log('🚀 Starting WhatsApp Bot (Baileys with Crypto fix)');
    
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state,
        defaultQueryTimeoutMs: 60_000,
        browser: ['Arun Computer Bot', 'Chrome', '1.0.0']
    });
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCode = qr;
            console.log('📱 QR Code received - Scan with WhatsApp:');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            isReady = true;
            console.log('✅ WhatsApp Connected Successfully!');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to:', lastDisconnect?.error?.message || 'unknown');
            
            if (shouldReconnect) {
                console.log('🔄 Reconnecting in 3 seconds...');
                setTimeout(connectToWhatsApp, 3000);
            }
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const text = msg.message.conversation || 
                    msg.message.extendedTextMessage?.text || 
                    msg.message.imageMessage?.caption || '';
        
        const sender = msg.key.remoteJid;
        console.log(`📩 Message from ${sender}: ${text.substring(0, 50)}...`);
        
        // Auto-reply for testing
        if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
            await sock.sendMessage(sender, { 
                text: 'Namaste! Welcome to Arun Computer Center.\nI am your admission assistant. How can I help you?' 
            });
        }
    });
}

// API Endpoints
app.get('/', (req, res) => {
    res.json({
        app: 'Arun Computer WhatsApp Bot',
        status: isReady ? 'Connected ✅' : 'Disconnected ❌',
        qr_available: !!qrCode,
        uptime: Math.round(process.uptime()) + ' seconds',
        memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
        note: 'Scan QR at /qr endpoint'
    });
});

app.get('/qr', (req, res) => {
    if (qrCode) {
        qrcode.generate(qrCode, { small: true }, (qrcode) => {
            res.send(`
                <html>
                <head><title>Arun Computer Bot - QR Code</title></head>
                <body style="text-align:center; padding:20px;">
                    <h2>📱 Scan QR Code with WhatsApp</h2>
                    <pre style="font-size:8px; line-height:1;">${qrcode}</pre>
                    <p>1. Open WhatsApp Mobile<br>2. Tap Settings → Linked Devices<br>3. Tap Link a Device<br>4. Scan this QR code</p>
                    <p>Status: ${isReady ? '✅ Connected' : '⏳ Waiting for scan'}</p>
                </body>
                </html>
            `);
        });
    } else {
        res.json({ 
            qr: null, 
            message: 'QR code not generated yet. Wait 10-15 seconds and refresh.',
            status: 'initializing' 
        });
    }
});

// Send message API (for website integration)
app.post('/send', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Phone number and message required' 
            });
        }
        
        if (!isReady) {
            return res.status(400).json({ 
                success: false, 
                error: 'WhatsApp not connected. Please scan QR code first.' 
            });
        }
        
        // Format phone number
        const cleanedPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanedPhone + '@s.whatsapp.net';
        
        console.log(`📤 Sending to ${cleanedPhone}: ${message.substring(0, 30)}...`);
        
        await sock.sendMessage(formattedPhone, { text: message });
        
        res.json({ 
            success: true, 
            message: 'WhatsApp message sent successfully',
            to: cleanedPhone
        });
        
    } catch (error) {
        console.error('Send error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        whatsapp: isReady ? 'connected' : 'disconnected'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`🌐 Open: http://localhost:${PORT}`);
    console.log(`📱 QR Code: http://localhost:${PORT}/qr`);
    
    // Start WhatsApp connection
    setTimeout(connectToWhatsApp, 2000);
});