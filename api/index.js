import fetch from 'node-fetch';

export default async function handler(req, res) {
    // 1. CORS Headers (Izin Akses Universal)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Validasi Input
    const { url } = req.body || req.query;
    if (!url) return res.status(400).json({ status: 'error', message: 'URL wajib diisi' });

    console.log(`[Request] URL: ${url}`);

    // 3. DAFTAR SERVER COBALT (Cadangan Berlapis)
    // Jika server 1 mati, otomatis pindah ke 2, dst.
    const cobaltInstances = [
        "https://co.wuk.sh/api/json",                // #1: Paling Stabil & Cepat
        "https://api.cobalt.tools/api/json",         // #2: Official (Kadang limit)
        "https://cobalt.api.kwiatekmiki.pl/api/json", // #3: Backup Eropa
        "https://api.server.lunes.host/api/json",    // #4: Backup US
        "https://cobalt.adeprolin.com/api/json"      // #5: Backup Akhir
    ];

    const fakeHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
    };

    let finalResult = null;
    let success = false;
    let lastError = "";

    // 4. LOOPING SERVER (Failover System)
    for (const server of cobaltInstances) {
        if (success) break; // Stop loop jika sudah berhasil

        try {
            // Konfigurasi Payload
            const payload = {
                url: url,
                vQuality: "720",
                filenamePattern: "basic",
                isAudioOnly: false
            };

            const response = await fetch(server, {
                method: "POST",
                headers: fakeHeaders,
                body: JSON.stringify(payload)
            });

            // Skip jika server error (bukan 200 OK)
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            // ANALISA HASIL JSON
            if (data && (data.url || data.stream || data.picker)) {
                
                // A. KASUS CAROUSEL (Threads/X/IG Slide)
                if (data.picker) {
                    const firstItem = data.picker[0];
                    finalResult = {
                        url: firstItem.url,
                        title: "Gallery/Slide Media",
                        type: firstItem.type, // 'photo' atau 'video'
                        audio: null
                    };
                } 
                // B. KASUS SINGLE MEDIA (Video/Foto Biasa)
                else {
                    finalResult = {
                        url: data.url || data.stream,
                        title: data.filename || "Downloaded Media",
                        type: 'video', // Default
                        audio: data.audio || null
                    };

                    // Deteksi jika ternyata Audio (Soundcloud/Voice Note)
                    if (finalResult.url && (finalResult.url.includes('.mp3') || finalResult.url.includes('.m4a'))) {
                        finalResult.type = 'audio';
                    }
                }
                
                success = true;
                console.log(`[Success] Server: ${server}`);
            } else {
                if(data.text) lastError = data.text;
            }

        } catch (e) {
            console.warn(`[Fail] ${server}: ${e.message}`);
        }
    }

    // 5. RESPONSE FINAL
    if (success && finalResult) {
        return res.status(200).json({ status: 'success', data: finalResult });
    } else {
        return res.status(500).json({ 
            status: 'error', 
            message: lastError || 'Semua server backup sibuk.' 
        });
    }
}
