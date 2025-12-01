import fetch from 'node-fetch';

export default async function handler(req, res) {
    // 1. CORS & Config
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url } = req.body || req.query;
    if (!url) return res.status(400).json({ status: 'error', message: 'URL kosong' });

    console.log(`[Processing] ${url}`);

    // 2. DAFTAR MONSTER SERVER (12 Server)
    // Kita mix server Official, Community, dan Hosting berbeda (Render/Railway/Vercel lain)
    // Tujuannya biar IP-nya beda-beda dan tidak kena blokir masal.
    const apiNodes = [
        "https://api.cobalt.tools/api/json",          // 1. Official (Sering limit, tapi wajib coba)
        "https://co.wuk.sh/api/json",                 // 2. King of Stability
        "https://cobalt.api.kwiatekmiki.pl/api/json", // 3. Poland Server
        "https://api.server.lunes.host/api/json",     // 4. Lunes Host
        "https://cobalt.adeprolin.com/api/json",      // 5. Community 1
        "https://cobalt.mp3converters.com/api/json",  // 6. Community 2
        "https://api.tikapp.ml/api/json",             // 7. TikApp Backup
        "https://cobalt.dobl.in/api/json",            // 8. Dublin Server
        "https://cobalt.kinuseka.net/api/json",       // 9. Kinuseka Server
        "https://cobalt.q11.st/api/json",             // 10. Q11 Server
        "https://w.fieryflames.dev/api/json",         // 11. FieryDev
        "https://hyrun.club/api/json"                 // 12. Hyrun Club
    ];

    // Header Randomizer (Supaya tidak terdeteksi sebagai bot yang sama)
    const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/115.0"
    ];

    let finalResult = null;
    let success = false;

    // 3. PROSES PENGECEKAN BERLAPIS
    for (const server of apiNodes) {
        if (success) break;

        try {
            // Pilih User Agent acak
            const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
            
            const payload = {
                url: url,
                vQuality: "720",
                filenamePattern: "basic",
                isAudioOnly: false,
                disableMetadata: true // Biar lebih ringan & cepat
            };

            // Timeout dipercepat jadi 5 detik per server biar user gak nunggu lama
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(server, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "User-Agent": randomUA,
                    "Origin": "https://google.com", // Fake Origin
                    "Referer": "https://google.com/"
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!response.ok) continue; // Skip jika server error

            const data = await response.json();

            if (data && (data.url || data.stream || data.picker)) {
                
                // A. Handle Gallery/Slide (IG/Threads/Twitter)
                if (data.picker) {
                    finalResult = {
                        url: data.picker[0].url,
                        title: "Media Gallery",
                        type: data.picker[0].type, // 'photo' or 'video'
                        audio: null
                    };
                } 
                // B. Handle Single Media (YT/Spotify/Soundcloud)
                else {
                    finalResult = {
                        url: data.url || data.stream,
                        title: data.filename || "Media Result",
                        type: 'video',
                        audio: data.audio || null
                    };

                    // Deteksi Audio Murni (Spotify/Soundcloud)
                    if (finalResult.url && (
                        finalResult.url.includes('.mp3') || 
                        finalResult.url.includes('.m4a') || 
                        finalResult.url.includes('.wav') ||
                        finalResult.url.includes('googlevideo.com') // Kadang YT audio linknya begini
                    )) {
                        finalResult.type = 'audio';
                    }
                    
                    // Deteksi Foto Murni
                    if (finalResult.url && (finalResult.url.match(/\.(jpeg|jpg|png|webp)/i))) {
                         finalResult.type = 'photo';
                    }
                }
                
                success = true;
                console.log(`[Success] Hit server: ${server}`);
            }

        } catch (e) {
            // Silent error, lanjut ke server berikutnya
        }
    }

    // 4. HASIL AKHIR
    if (success && finalResult) {
        return res.status(200).json({ status: 'success', data: finalResult });
    } else {
        // Jika 12 server gagal semua (kemungkinan besar IP Vercel diblokir total hari itu)
        return res.status(200).json({ 
            status: 'fallback', 
            message: 'Semua server sibuk/limit. Gunakan manual.' 
        });
    }
}
