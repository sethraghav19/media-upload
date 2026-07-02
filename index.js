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

app.post('/upload-template-media', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Please send a file in the "file" field.' });
        }

        const appId = process.env.WHATSAPP_APP_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';

        if (!appId || !accessToken) {
            return res.status(500).json({ error: 'Server misconfiguration: WHATSAPP_APP_ID or WHATSAPP_ACCESS_TOKEN missing.' });
        }

        // Step 1: Create an Upload Session
        const sessionUrl = `https://graph.facebook.com/${apiVersion}/${appId}/uploads?file_length=${req.file.size}&file_type=${req.file.mimetype}`;
        const sessionResponse = await axios.post(sessionUrl, {}, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const uploadSessionId = sessionResponse.data.id;

        // Step 2: Upload the binary data to the session
        const uploadUrl = `https://graph.facebook.com/${apiVersion}/${uploadSessionId}`;
        const uploadResponse = await axios.post(uploadUrl, req.file.buffer, {
            headers: {
                'Authorization': `OAuth ${accessToken}`,
                'file_offset': 0
            }
        });

        // Return the {"h": "h::..."} handle
        res.status(200).json(uploadResponse.data);

    } catch (error) {
        console.error('Error in Resumable Upload API:', error?.response?.data || error.message);
        res.status(error?.response?.status || 500).json({
            error: 'Failed to upload media via Resumable Upload API',
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
