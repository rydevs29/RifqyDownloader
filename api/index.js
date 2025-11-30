import fetch from 'node-fetch';

export default async function handler(req, res) {
    // 1. CORS Headers (Agar bisa diakses dari frontend mana saja)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle Preflight Request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Ambil URL dari request
    const { url } = req.body || req.query;

    if (!url) {
        return res.status(400).json({ status: 'error', message: 'URL wajib diisi' });
    }

    console.log(`[Processing] URL: ${url}`);

    // 3. Daftar Server Cobalt (Backup Redundancy)
    // Server ini yang melakukan "magic" download
    const cobaltInstances = [
        "https://co.wuk.sh/api/json",                // Server Utama (Paling Stabil)
        "https://api.cobalt.tools/api/json",         // Official Instance
        "https://cobalt.api.kwiatekmiki.pl/api/json", // Backup Eropa
        "https://api.server.lunes.host/api/json"     // Backup US
    ];

    // Header palsu agar request terlihat seperti dari browser
    const fakeHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };

    let finalResult = null;
    let success = false;

    // 4. Logic Loop: Mencoba server satu per satu jika ada yang error
    for (const server of cobaltInstances) {
        if (success) break; // Stop jika sudah dapat hasil

        try {
            // Payload (Data yang dikirim ke Cobalt)
            const payload = {
                url: url,
                vQuality: "720",        // Kualitas video target
                filenamePattern: "basic",
                isAudioOnly: false
            };

            const response = await fetch(server, {
                method: "POST",
                headers: fakeHeaders,
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Cek apakah data valid
            if (data && (data.url || data.stream || data.picker)) {
                
                // --- KASUS: CAROUSEL / MULTIPLE MEDIA (Threads / X) ---
                if (data.picker) {
                    // Ambil item pertama dari galeri
                    const firstItem = data.picker[0];
                    
                    finalResult = {
                        url: firstItem.url,
                        title: "Media Gallery Result",
                        type: firstItem.type, // 'photo' atau 'video'
                        audio: null
                    };
                } 
                // --- KASUS: SINGLE MEDIA ---
                else {
                    finalResult = {
                        url: data.url || data.stream,
                        title: data.filename || "Downloaded Media",
                        type: 'video', // Default asumsi video
                        audio: data.audio || null
                    };

                    // Koreksi jika outputnya audio murni (contoh: Soundcloud/Voice Note)
                    if (finalResult.url && (finalResult.url.includes('.mp3') || finalResult.url.includes('.m4a'))) {
                        finalResult.type = 'audio';
                    }
                }
                
                success = true;
                console.log(`Success fetching from ${server}`);
            }

        } catch (e) {
            console.warn(`Failed on ${server}: ${e.message}`);
        }
    }

    // 5. Kirim Response Balik ke Frontend
    if (success && finalResult) {
        return res.status(200).json({
            status: 'success',
            data: finalResult
        });
    } else {
        // Jika semua server gagal
        return res.status(500).json({
            status: 'error',
            message: 'Semua server sibuk atau konten diprivate.'
        });
    }
}
