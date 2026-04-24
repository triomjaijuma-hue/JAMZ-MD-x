import express from 'express';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startServer(getContext) {
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../public')));

    app.get('/api/qr', async (req, res) => {
        const { qr } = getContext();
        if (!qr) {
            return res.status(404).json({ error: 'QR code not available' });
        }
        try {
            const qrImageUrl = await QRCode.toDataURL(qr);
            res.json({ qrImageUrl });
        } catch (err) {
            res.status(500).json({ error: 'Failed to generate QR code' });
        }
    });

    app.post('/api/pairing-code', async (req, res) => {
        const { phoneNumber } = req.body;
        const { sock } = getContext();

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        if (!sock) {
            return res.status(503).json({ error: 'WhatsApp socket not initialized' });
        }

        try {
            const code = await sock.requestPairingCode(phoneNumber);
            res.json({ code });
        } catch (err) {
            console.error('Error requesting pairing code:', err);
            res.status(500).json({ error: 'Failed to request pairing code' });
        }
    });

    app.get('/api/status', (req, res) => {
        const { sock, qr } = getContext();
        res.json({
            connected: sock?.ws?.isOpen || false,
            hasQr: !!qr,
            loggedIn: sock?.authState?.creds?.registered || false
        });
    });

    app.listen(port, () => {
        console.log(`Web interface running on http://localhost:${port}`);
    });
}
