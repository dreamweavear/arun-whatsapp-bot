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
            dataPath: "./.wwebjs_auth"
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
                // ❌ '--max-old-space-size=256' HATA DIYA HAI
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || 
                           '/usr/bin/chromium'  // ✅ YEH ADD KIYA HAI
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
    });

    // ... REST OF YOUR ORIGINAL CODE (SAME) ...
    // QR Code event, Ready event, etc. - NO CHANGE
}

// ... REST OF FILE (NO CHANGE) ...
