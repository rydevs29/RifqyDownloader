// api/index.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
    // 1. CORS Configuration (Agar bisa diakses dari web kamu)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

    // Handle Preflight Request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Ambil URL dari body atau query
    const { url } = req.body || req.query;

    if (!url) {
        return res.status(400).json({ status: 'error', message: 'URL wajib diisi' });
    }

    console.log(`[Processing] URL: ${url}`);

    // 2. Daftar Server Cobalt (Diurutkan dari yang paling sakti untuk YouTube)
    const cobaltInstances = [
        "https://co.wuk.sh/api/json",                // Sangat stabil untuk YT
        "https://api.cobalt.tools/api/json",         // Official (Sering rate limit, tapi akurat)
        "https://cobalt.api.kwiatekmiki.pl/api/json", // Backup Eropa
        "https://api.server.lunes.host/api/json",    // Backup US
        "https://cobalt.adeprolin.com/api/json"      // Cadangan akhir
    ];

    // 3. Header Penyamaran (Supaya tidak dideteksi sebagai Bot Vercel)
    const fakeHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": "https://cobalt.tools",
        "Referer": "https://cobalt.tools/"
    };

    let finalResult = null;
    let success = false;
    let errorMessage = "";

    // 4. Logic Loop: Coba satu per satu server
    for (const server of cobaltInstances) {
        if (success) break; // Jika sudah berhasil, stop loop

        try {
            console.log(`Trying server: ${server}`);
            
            // Konfigurasi Payload (Data yang dikirim)
            const payload = {
                url: url,
                vQuality: "720",        // Target kualitas HD
                filenamePattern: "basic",
                isAudioOnly: false,
                disableMetadata: true   // Mengurangi beban request
            };

            const response = await fetch(server, {
                method: "POST",
                headers: fakeHeaders,
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Cek apakah response valid
            if (data && (data.url || data.stream || data.picker)) {
                
                // KASUS KHUSUS: Youtube Picker (Kadang Cobalt minta milih video/audio)
                if (data.picker) {
                    // Ambil item pertama dari picker jika ada
                    const item = data.picker.find(p => p.type === 'video') || data.picker[0];
                    finalResult = {
                        url: item.url,
                        title: "Video Downloaded (Picker)",
                        audio: null
                    };
                } else {
                    finalResult = {
                        url: data.url || data.stream,
                        title: data.filename || "Video Result",
                        audio: data.audio || null // Kadang Cobalt misahin audio
                    };
                }
                
                success = true;
                console.log(`Success on ${server}`);
            } else {
                // Simpan error message dari server terakhir untuk debug
                if (data && data.text) errorMessage = data.text;
            }

        } catch (e) {
            console.error(`Failed on ${server}: ${e.message}`);
        }
    }

    // 5. Response ke Web Kamu
    if (success && finalResult) {
        return res.status(200).json({
            status: 'success',
            data: finalResult
        });
    } else {
        // Gagal total di semua server
        return res.status(500).json({
            status: 'error',
            message: errorMessage || 'Gagal mengambil data. Server YouTube mungkin sedang memblokir akses.'
        });
    }
}
