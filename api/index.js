import fetch from 'node-fetch';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url } = req.body || req.query;
    if (!url) return res.status(400).json({ status: 'error', message: 'URL wajib diisi' });

    console.log(`[Request] URL: ${url}`);

    const cobaltInstances = [
        "https://co.wuk.sh/api/json",                
        "https://api.cobalt.tools/api/json",         
        "https://cobalt.api.kwiatekmiki.pl/api/json", 
        "https://api.server.lunes.host/api/json",    
        "https://cobalt.adeprolin.com/api/json"      
    ];

    const fakeHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
    };

    let finalResult = null;
    let success = false;

    for (const server of cobaltInstances) {
        if (success) break; 

        try {
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

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (data && (data.url || data.stream || data.picker)) {
                if (data.picker) {
                    const firstItem = data.picker[0];
                    finalResult = {
                        url: firstItem.url,
                        title: "Gallery Media",
                        type: firstItem.type, 
                        audio: null
                    };
                } else {
                    finalResult = {
                        url: data.url || data.stream,
                        title: data.filename || "Downloaded Media",
                        type: 'video', 
                        audio: data.audio || null
                    };

                    if (finalResult.url && (finalResult.url.includes('.mp3') || finalResult.url.includes('.m4a'))) {
                        finalResult.type = 'audio';
                    }
                }
                success = true;
            }
        } catch (e) {
            console.warn(`Server ${server} error.`);
        }
    }

    if (success && finalResult) {
        return res.status(200).json({ status: 'success', data: finalResult });
    } else {
        return res.status(500).json({ status: 'error', message: 'Server sibuk' });
    }
}
