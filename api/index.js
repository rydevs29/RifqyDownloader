import fetch from 'node-fetch';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url } = req.body || req.query;
    if (!url) return res.status(400).json({ status: 'error', message: 'URL kosong' });

    console.log(`[Processing] ${url}`);

    // DAFTAR 12 SERVER CADANGAN
    const apiNodes = [
        "https://api.cobalt.tools/api/json", "https://co.wuk.sh/api/json",
        "https://cobalt.api.kwiatekmiki.pl/api/json", "https://api.server.lunes.host/api/json",
        "https://cobalt.adeprolin.com/api/json", "https://cobalt.mp3converters.com/api/json",
        "https://api.tikapp.ml/api/json", "https://cobalt.dobl.in/api/json",
        "https://cobalt.kinuseka.net/api/json", "https://cobalt.q11.st/api/json",
        "https://w.fieryflames.dev/api/json", "https://hyrun.club/api/json"
    ];

    const userAgents = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"];
    let finalResult = null;
    let success = false;

    for (const server of apiNodes) {
        if (success) break;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6000);
            
            const response = await fetch(server, {
                method: "POST",
                headers: {
                    "Accept": "application/json", "Content-Type": "application/json",
                    "User-Agent": userAgents[0], "Origin": "https://google.com", "Referer": "https://google.com/"
                },
                body: JSON.stringify({ url: url, vQuality: "720", filenamePattern: "basic", isAudioOnly: false, disableMetadata: true }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!response.ok) continue;
            const data = await response.json();

            if (data && (data.url || data.stream || data.picker)) {
                
                // --- DETEKSI SLIDE GALLERY ---
                if (data.picker) {
                    finalResult = {
                        gallery: data.picker, // Kirim Full Array
                        title: "Media Gallery",
                        type: 'picker'
                    };
                } 
                // --- DETEKSI SINGLE FILE ---
                else {
                    finalResult = {
                        url: data.url || data.stream,
                        title: data.filename || "Media Result",
                        type: 'video',
                        audio: data.audio || null
                    };
                    if (finalResult.url && (finalResult.url.includes('.mp3') || finalResult.url.includes('googlevideo.com'))) finalResult.type = 'audio';
                    if (finalResult.url && (finalResult.url.match(/\.(jpeg|jpg|png|webp)/i))) finalResult.type = 'photo';
                }
                
                success = true;
            }
        } catch (e) {}
    }

    if (success && finalResult) {
        return res.status(200).json({ status: 'success', data: finalResult });
    } else {
        return res.status(200).json({ status: 'fallback', message: 'Gagal' });
    }
}
