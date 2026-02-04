// Arun Computer WhatsApp Bot
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

let client = null;
let qrCode = null;
let isReady = false;

// WhatsApp Initialize
function startWhatsApp() {
    client = new Client({
        authStrategy: new LocalAuth({ clientId: "arun-computer" }),
        puppeteer: { 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    client.on('qr', async (qr) => {
        qrCode = await qrcode.toDataURL(qr);
        console.log('QR Code ready for scan');
    });

    client.on('ready', () => {
        isReady = true;
        console.log('✅ WhatsApp Connected for Arun Computer');
    });

    client.initialize();
}

startWhatsApp();

// API Routes
app.get('/', (req, res) => {
    res.json({ 
        app: 'Arun Computer WhatsApp Bot',
        status: isReady ? 'Connected' : 'Waiting for QR Scan',
        institute: 'Arun Computer Institute, Rewa',
        endpoints: ['/qr', '/send', '/status']
    });
});

app.get('/status', (req, res) => {
    res.json({ ready: isReady });
});

app.get('/qr', (req, res) => {
    res.json({ qr: qrCode, ready: isReady });
});

app.post('/send', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!isReady) {
            return res.json({ 
                success: false, 
                error: 'WhatsApp not connected. Scan QR first.' 
            });
        }
        
        // Format phone
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('91')) {
            cleanPhone = cleanPhone.substring(2);
        }
        
        const chatId = cleanPhone + '@c.us';
        await client.sendMessage(chatId, message);
        
        res.json({ 
            success: true, 
            message: 'Message sent successfully',
            to: phone 
        });
        
    } catch (error) {
        res.json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Arun Computer WhatsApp API'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Arun Computer WhatsApp Server running on port ${PORT}`);
});
