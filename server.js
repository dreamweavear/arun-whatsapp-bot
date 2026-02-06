const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const app = express();

// ========== MIDDLEWARE ==========
// CORS Headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Body Parser with increased limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== WHATSAPP CONNECTION ==========
const PORT = process.env.PORT || 3000;
let sock = null;
let qr = null;
let isReady = false;

async function connectWhatsApp() {
    console.log('🚀 Starting WhatsApp Bot...');
    
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
        });
        
        sock.ev.on('connection.update', (update) => {
            const { connection, qr: qrCode } = update;
            
            if (qrCode) {
                qr = qrCode;
                console.log('📱 QR Code Received');
                qrcode.generate(qrCode, { small: true });
            }
            
            if (connection === 'open') {
                isReady = true;
                console.log('✅ WhatsApp Connected! Bot is ready.');
            }
            
            if (connection === 'close') {
                console.log('❌ WhatsApp Disconnected. Reconnecting in 5s...');
                isReady = false;
                setTimeout(connectWhatsApp, 5000);
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
        
    } catch (error) {
        console.error('❌ WhatsApp Connection Error:', error.message);
        setTimeout(connectWhatsApp, 5000);
    }
}

// ========== API ROUTES ==========

// Home/Status Page
app.get('/', (req, res) => {
    res.json({
        app: 'Arun Computer WhatsApp Bot',
        status: isReady ? 'Connected ✅' : 'Disconnected ❌',
        has_qr: !!qr,
        uptime: Math.floor(process.uptime()) + ' seconds',
        memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB',
        instructions: 'Scan QR at /qr, Send messages via POST /send'
    });
});

// QR Code Page
app.get('/qr', (req, res) => {
    if (qr) {
        qrcode.generate(qr, { small: true }, (qrcodeText) => {
            res.send(`
                <html>
                <head>
                    <title>Arun Computer Bot - QR Code</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 30px; }
                        pre { font-size: 8px; line-height: 0.8; background: #f5f5f5; padding: 20px; display: inline-block; }
                        .status { margin: 20px; padding: 10px; border-radius: 5px; }
                        .connected { background: #d4edda; color: #155724; }
                        .disconnected { background: #f8d7da; color: #721c24; }
                    </style>
                </head>
                <body>
                    <h2>📱 Scan QR Code with WhatsApp</h2>
                    <pre>${qrcodeText}</pre>
                    <div class="status ${isReady ? 'connected' : 'disconnected'}">
                        Status: ${isReady ? '✅ Connected' : '⏳ Waiting for scan'}
                    </div>
                    <p>1. Open WhatsApp Mobile App<br>
                    2. Tap Settings → Linked Devices<br>
                    3. Tap "Link a Device"<br>
                    4. Scan QR code above</p>
                </body>
                </html>
            `);
        });
    } else {
        res.json({ 
            success: false, 
            message: 'QR code not generated yet. Wait 10 seconds and refresh.' 
        });
    }
});

// Send Message Endpoint (FIXED)
app.post('/send', async (req, res) => {
    try {
        console.log('📥 API Request received at:', new Date().toISOString());
        
        // Check if request body exists
        if (!req.body || Object.keys(req.body).length === 0) {
            console.log('❌ Empty request body');
            return res.status(400).json({
                success: false,
                error: 'Request body is empty. Send JSON with phone and message.'
            });
        }
        
        console.log('📥 Request body:', JSON.stringify(req.body));
        
        const { phone, message } = req.body;
        
        // Validate required fields
        if (!phone || phone.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
        }
        
        if (!message || message.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Message text is required'
            });
        }
        
        // Check WhatsApp connection
        if (!isReady) {
            return res.status(400).json({
                success: false,
                error: 'WhatsApp is not connected. Please scan QR code first at /qr endpoint.'
            });
        }
        
        // Clean and format phone number
        const cleanedPhone = phone.toString().replace(/\D/g, '');
        console.log('🔢 Phone - Original:', phone, 'Cleaned:', cleanedPhone);
        
        if (cleanedPhone.length < 10) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number. Must be at least 10 digits.'
            });
        }
        
        // Add country code for India if missing
        let formattedPhone = cleanedPhone;
        if (cleanedPhone.length === 10) {
            formattedPhone = '91' + cleanedPhone;
            console.log('➕ Added country code:', formattedPhone);
        }
        
        const jid = formattedPhone + '@s.whatsapp.net';
        console.log('📤 Sending to JID:', jid);
        console.log('📝 Message length:', message.length, 'characters');
        
        // Send WhatsApp message
        await sock.sendMessage(jid, { text: message });
        console.log('✅ Message sent successfully to', formattedPhone);
        
        // Success response
        res.json({
            success: true,
            message: 'WhatsApp message sent successfully',
            to: formattedPhone,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Send Message Error:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
            details: 'Check server logs for more information'
        });
    }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.rss / 1024 / 1024;
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        whatsapp: isReady ? 'connected' : 'disconnected',
        memory: Math.round(memoryMB) + ' MB',
        uptime: Math.floor(process.uptime()) + ' seconds'
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        available_endpoints: {
            GET: ['/', '/qr', '/health'],
            POST: ['/send']
        }
    });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`🌐 Base URL: https://arun-whatsapp-bot-production.up.railway.app`);
    console.log(`📱 QR Code: https://arun-whatsapp-bot-production.up.railway.app/qr`);
    console.log(`📤 Send API: POST https://arun-whatsapp-bot-production.up.railway.app/send`);
    
    // Start WhatsApp connection after 2 seconds
    setTimeout(connectWhatsApp, 2000);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('👋 Shutting down gracefully...');
    process.exit(0);
});