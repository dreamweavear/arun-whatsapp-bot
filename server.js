// server.js - FIXED VERSION FOR RAILWAY
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

// Simple variables
let client = null;
let qrCode = null;
let isReady = false;

// Start WhatsApp
function startWhatsApp() {
    console.log('🚀 Starting WhatsApp Bot for Arun Computer...');
    
    // Clear old client
    if (client) {
        try { client.destroy(); } catch(e) {}
    }
    
    client = new Client({
        authStrategy: new LocalAuth({
            clientId: "arun-computer",
            dataPath: "./.wwebjs_auth"
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 
                           '/usr/bin/chromium'  // Railway compatible path
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
    });

    // QR Code
    client.on('qr', async (qr) => {
        console.log('📱 QR Code received');
        qrCode = await qrcode.toDataURL(qr);
        console.log('✅ QR Code ready for scan');
    });

    // Ready
    client.on('ready', () => {
        isReady = true;
        console.log('✅ WhatsApp Connected! Bot is ready.');
    });

    // Initialize
    client.initialize();
}

// Start server first, then WhatsApp
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Memory: ${process.memoryUsage().rss / 1024 / 1024} MB`);
    
    // Start WhatsApp after server is ready
    setTimeout(startWhatsApp, 2000);
});

// ========== SIMPLE API ENDPOINTS ==========

app.get('/', (req, res) => {
    res.json({ 
        app: 'Arun Computer WhatsApp Bot',
        status: isReady ? 'Connected' : 'Waiting for QR Scan',
        endpoint: {
            status: '/status',
            qr: '/qr',
            send: 'POST /send (phone, message)'
        }
    });
});

app.get('/status', (req, res) => {
    res.json({ ready: isReady });
});

app.get('/qr', (req, res) => {
    if (qrCode) {
        res.json({ qr: qrCode });
    } else {
        res.json({ qr: null, message: 'QR generating... Refresh in 10s' });
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
        
        // Clean phone number
        let cleanPhone = phone.toString().replace(/\D/g, '');
        if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
            cleanPhone = cleanPhone.substring(2);
        }
        
        const chatId = `${cleanPhone}@c.us`;
        await client.sendMessage(chatId, message);
        
        res.json({ success: true, to: cleanPhone });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check for Railway
app.get('/ping', (req, res) => {
    res.send('pong');
});
