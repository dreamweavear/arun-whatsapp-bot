// server.js - OPTIMIZED FOR RAILWAY
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

// Memory optimization
let client = null;
let qrCode = null;
let isReady = false;
let restartCount = 0;

// Function to start WhatsApp with memory limits
function startWhatsApp() {
    console.log(`🚀 Starting WhatsApp Bot (Attempt: ${restartCount + 1})`);
    
    // Clear previous client if exists
    if (client) {
        try {
            client.destroy();
        } catch (e) {}
        client = null;
    }
    
    // Create new client with optimized settings
    client = new Client({
        authStrategy: new LocalAuth({
            clientId: "arun-computer",
            dataPath: "./.wwebjs_auth"  // Smaller path
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',  // Uses less memory
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',  // Single process saves memory
                '--disable-gpu',
                '--max-old-space-size=256'  // Limit Node.js memory
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
    });

    // QR Code event
    client.on('qr', async (qr) => {
        console.log('📱 QR Code received');
        qrCode = await qrcode.toDataURL(qr);
        console.log('✅ QR Code generated. Scan with WhatsApp.');
    });

    // Ready event
    client.on('ready', () => {
        isReady = true;
        console.log('✅ WhatsApp Connected! Bot is ready.');
        restartCount = 0; // Reset restart count on success
    });

    // Disconnected event
    client.on('disconnected', (reason) => {
        console.log('❌ WhatsApp disconnected:', reason);
        isReady = false;
        
        // Auto-restart after 5 seconds
        setTimeout(() => {
            if (restartCount < 3) { // Max 3 retries
                restartCount++;
                startWhatsApp();
            }
        }, 5000);
    });

    // Error event
    client.on('auth_failure', (msg) => {
        console.error('❌ Auth failure:', msg);
    });

    // Initialize
    client.initialize().catch(err => {
        console.error('❌ Initialization failed:', err);
    });
}

// Start WhatsApp
startWhatsApp();

// ========== API ENDPOINTS ==========

// Health check (simple response)
app.get('/', (req, res) => {
    res.json({ 
        app: 'Arun Computer WhatsApp Bot',
        status: isReady ? 'Connected' : 'Connecting...',
        memory: process.memoryUsage().rss / 1024 / 1024 + ' MB',
        uptime: process.uptime() + ' seconds'
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({ 
        ready: isReady,
        qr_available: qrCode !== null,
        restarts: restartCount
    });
});

// Get QR Code
app.get('/qr', (req, res) => {
    if (qrCode) {
        res.json({ qr: qrCode, ready: isReady });
    } else {
        res.json({ 
            qr: null, 
            ready: false, 
            message: 'QR Code generating. Wait 10 seconds and refresh.' 
        });
    }
});

// Send message (with timeout)
app.post('/send', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Phone and message are required'
            });
        }
        
        if (!isReady) {
            return res.status(400).json({
                success: false,
                error: 'WhatsApp is not connected. Scan QR code first.'
            });
        }
        
        // Format phone number (simple)
        let formattedPhone = phone.toString().replace(/\D/g, '');
        if (formattedPhone.startsWith('91') && formattedPhone.length > 10) {
            formattedPhone = formattedPhone.substring(2);
        }
        
        const chatId = `${formattedPhone}@c.us`;
        
        console.log(`📤 Sending to: ${formattedPhone.substring(0, 3)}...`);
        
        // Send with timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000);
        });
        
        const sendPromise = client.sendMessage(chatId, message.substring(0, 1000)); // Limit message length
        
        await Promise.race([sendPromise, timeoutPromise]);
        
        console.log('✅ Message sent successfully');
        
        res.json({
            success: true,
            message: 'WhatsApp message sent successfully'
        });
        
    } catch (error) {
        console.error('❌ Send Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check for Railway
app.get('/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const memoryMB = memoryUsage.rss / 1024 / 1024;
    
    res.json({
        status: memoryMB < 400 ? 'healthy' : 'warning', // Alert if memory > 400MB
        timestamp: new Date().toISOString(),
        memory: Math.round(memoryMB) + ' MB',
        uptime: Math.round(process.uptime()) + ' seconds',
        whatsapp: isReady ? 'connected' : 'disconnected'
    });
});

// Simple ping endpoint (for uptime robots)
app.get('/ping', (req, res) => {
    res.send('pong');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
    console.log(`📱 Memory limit: 512MB`);
    console.log(`💾 Auth path: ./.wwebjs_auth`);
});
