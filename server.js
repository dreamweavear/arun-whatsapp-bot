// server.js - BAILEYS VERSION (NO PUPPETEER)
const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
let sock = null;
let qrCode = null;
let isReady = false;

// WhatsApp connection function
async function connectToWhatsApp() {
    console.log('🚀 Starting WhatsApp Bot (Baileys)');
    
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        printQRInTerminal: false,
        auth: state,
        defaultQueryTimeoutMs: 60_000
    });
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCode = qr;
            console.log('📱 QR Code received:');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            isReady = true;
            console.log('✅ WhatsApp Connected!');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed:', lastDisconnect?.error);
            
            if (shouldReconnect) {
                console.log('🔄 Reconnecting...');
                setTimeout(connectToWhatsApp, 5000);
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
        console.log(`📩 From: ${sender}, Message: ${text}`);
        
        // Auto-reply
        if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
            await sock.sendMessage(sender, { text: 'Hello! Welcome to Arun Computer Center. How can I help you?' });
        }
    });
}

// API Endpoints
app.get('/', (req, res) => {
    res.json({
        app: 'Arun Computer WhatsApp Bot (Baileys)',
        status: isReady ? 'Connected' : 'Disconnected',
        qr_available: !!qrCode,
        uptime: process.uptime() + ' seconds',
        memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB'
    });
});

app.get('/qr', (req, res) => {
    if (qrCode) {
        qrcode.generate(qrCode, { small: true }, (qrcode) => {
            res.send(`<pre>${qrcode}</pre>`);
        });
    } else {
        res.json({ qr: null, message: 'No QR generated yet. Wait 10 seconds.' });
    }
});

app.post('/send', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone and message required' });
        }
        
        if (!isReady) {
            return res.status(400).json({ error: 'WhatsApp not connected' });
        }
        
        const formattedPhone = phone.replace(/\D/g, '') + '@s.whatsapp.net';
        await sock.sendMessage(formattedPhone, { text: message });
        
        res.json({ success: true, message: 'Sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server and WhatsApp
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`📱 Using Baileys library (no puppeteer)`);
    console.log(`💾 Auth path: ./auth_info`);
    
    connectToWhatsApp();
});