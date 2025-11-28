// api/index.js - Dikerjakan oleh Vercel
import { VercelResponse, VercelRequest } from '@vercel/node';

export default async function handler(req, res) {
    // Pengaturan CORS agar bisa diakses dari frontend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { url, type } = req.body; // Menerima URL dan Tipe (video/audio)

    if (!url || !type || (type !== 'video' && type !== 'audio')) {
        return res.status(400).json({ error: 'URL and valid type (video/audio) are required' });
    }

    const isAudio = (type === 'audio');

    // --- 8 DAFTAR SERVER CADANGAN (MAXIMUM ROBUSTNESS) ---
    const API_SERVERS = [
        "https://cobalt.place/api/json",
        "https://api.cobalt.tools/api/json",
        "https://cobalt.xy24.eu/api/json",
        "https://api.server.social/api/json",
        "https://w.nesher.dev/api/json",
        "https://cobalt.cf/api/json",
        "https://res.cobalt.tools/api/json",
        "https://co.wuk.sh/api/json" // Cadangan terakhir
    ];

    let lastError = null;

    // --- LOGIKA CASCADE: LOOPING PENCARIAN SERVER ---
    for (const server of API_SERVERS) {
        try {
            console.log(`Mencoba server (${type}): ${server}`);
            
            // Payload disesuaikan untuk Video atau Audio
            const payload = {
                url: url,
                vQuality: isAudio ? "max" : "720", // Kualitas maksimal untuk audio
                isAudioOnly: isAudio,
                filenamePattern: "basic"
            };

            const response = await fetch(server, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Cek apakah sukses dan memiliki link download
            if (data && (data.url || data.status === 'stream' || data.status === 'redirect')) {
                // BERHASIL! Kembalikan data ke Frontend
                return res.status(200).json({
                    success: true,
                    server_used: new URL(server).hostname,
                    media_type: type,
                    data: data
                });
            }

        } catch (error) {
            console.error(`Gagal di ${server}:`, error.message);
            lastError = error;
            // Lanjut ke server berikutnya...
        }
    }

    // Jika semua server gagal
    return res.status(500).json({
        success: false,
        error: `Semua 8 server cadangan gagal mendapatkan media ${type}.`,
        details: lastError ? lastError.message : "Unknown error"
    });
}
