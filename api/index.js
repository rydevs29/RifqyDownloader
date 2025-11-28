// api/index.js - Dikerjakan oleh Vercel (DIREVISI untuk menghindari Crash JSON/HTML Response)

export default async function handler(req, res) {
    // Pengaturan CORS
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

    const { url, type } = req.body;
    
    if (!url || !type || (type !== 'video' && type !== 'audio')) {
        return res.status(400).json({ error: 'URL and valid type (video/audio) are required' });
    }

    const isAudio = (type === 'audio');

    // --- 8 DAFTAR SERVER CADANGAN (Diurutkan untuk Kecepatan/Stabilitas) ---
    const API_SERVERS = [
        "https://api.cobalt.tools/api/json",  // 1. Official (Stabil & Cepat untuk Non-YT)
        "https://cobalt.place/api/json",      // 2. Umumnya Baik untuk YT
        "https://co.wuk.sh/api/json",         // 3. Cepat
        "https://res.cobalt.tools/api/json",  // 4. Cadangan
        "https://cobalt.xy24.eu/api/json",    // 5. Cadangan Eropa
        "https://api.server.social/api/json", // 6. Cadangan
        "https://w.nesher.dev/api/json",      // 7. Cadangan
        "https://cobalt.cf/api/json"          // 8. Cadangan Terakhir
    ];

    let lastError = null;

    // --- LOGIKA CASCADE: LOOPING PENCARIAN SERVER ---
    for (const server of API_SERVERS) {
        let response;
        try {
            console.log(`Mencoba server (${type}): ${server}`);
            
            const payload = {
                url: url,
                vQuality: isAudio ? "max" : "720", 
                isAudioOnly: isAudio,
                filenamePattern: "basic"
            };

            response = await fetch(server, {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // 1. Cek status HTTP
            if (!response.ok) {
                 throw new Error(`Server ${new URL(server).hostname} mengembalikan status ${response.status}`);
            }

            // 2. *** PERBAIKAN PENTING: Mencegah error JSON saat menerima non-JSON (HTML) ***
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                // Jika tidak bisa di-parse sebagai JSON (mungkin HTML error), anggap gagal
                throw new Error(`Gagal parse respons dari ${new URL(server).hostname}`);
            }

            // 3. Cek apakah sukses
            if (data && (data.url || data.status === 'stream' || data.status === 'redirect')) {
                // BERHASIL!
                return res.status(200).json({
                    success: true,
                    server_used: new URL(server).hostname,
                    media_type: type,
                    data: data
                });
            }

        } catch (error) {
            console.error(`[CRASH] Gagal di ${server}:`, error.message);
            lastError = error;
            // Lanjut ke server berikutnya...
        }
    }

    // Jika semua server gagal
    return res.status(500).json({
        success: false,
        error: `Semua 8 server cadangan gagal mendapatkan media ${type}.`,
        details: lastError ? lastError.message : "Tidak ada respons dari server manapun."
    });
}
