require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const port = process.env.PORT || 3000;

// Use multer to handle multipart/form-data. We'll store the file in memory temporarily.
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload-media', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Please send a file in the "file" field.' });
        }

        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';

        if (!phoneNumberId || !accessToken) {
            return res.status(500).json({ error: 'Server misconfiguration: WhatsApp credentials missing.' });
        }

        // Construct the FormData to send to WhatsApp Graph API
        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        
        // Pass the buffer, along with original filename and mime type to form-data
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        // Make the POST request to WhatsApp API
        const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`;
        
        const response = await axios.post(url, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        // Return the successful response which includes the media_id
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error uploading media to WhatsApp:', error?.response?.data || error.message);
        res.status(error?.response?.status || 500).json({
            error: 'Failed to upload media to WhatsApp',
            details: error?.response?.data || error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`WhatsApp Media Upload proxy server listening on port ${port}`);
});
