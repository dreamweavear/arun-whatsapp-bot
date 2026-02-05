// TEMPORARY FIX - WhatsApp ko comment karein
const express = require('express');
// const { Client, LocalAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode');

const app = express();
app.use(express.json());

let isReady = false;

// SIMPLE SERVER ONLY
app.get('/', (req, res) => {
    res.json({ 
        status: 'OK', 
        app: 'Arun Computer WhatsApp Bot',
        whatsapp: 'Temporarily disabled for debugging'
    });
});

app.get('/ping', (req, res) => {
    res.send('pong');
});

app.get('/status', (req, res) => {
    res.json({ ready: isReady });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Health check available at /ping`);
    isReady = true;
});

// WhatsApp code ko comment karein
/*
// WhatsApp initialization code yahan rahega
// Pehle server chal jaye, fir WhatsApp add karenge
*/
