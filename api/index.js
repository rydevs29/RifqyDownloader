// api/index.js
export default async function handler(req, res) {
    // Izinkan akses dari mana saja (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.body || req.query;

    if (!url) {
        return res.status(400).json({ status: 'error', message: 'URL tidak ditemukan' });
    }

    // --- DAFTAR SERVER CADANGAN (ROTATING SERVERS) ---
    // Jika satu mati, dia akan mencoba yang berikutnya.
    const cobaltInstances = [
        "https://api.cobalt.tools/api/json",      // Server Utama
        "https://cobalt.api.kwiatekmiki.pl/api/json", // Cadangan 1
        "https://api.server.lunes.host/api/json",      // Cadangan 2
        "https://co.wuk.sh/api/json"               // Cadangan 3
    ];

    let result = null;
    let success = false;

    // Loop mencoba setiap server
    for (const server of cobaltInstances) {
        try {
            console.log(`Mencoba server: ${server}`);
            
            const response = await fetch(server, {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url: url,
                    vQuality: "720",
                    filenamePattern: "basic",
                    isAudioOnly: false
                })
            });

            const data = await response.json();

            // Cek apakah server memberikan respon sukses
            if (data && (data.url || data.stream)) {
                result = data;
                success = true;
                break; // Berhenti loop jika sudah berhasil
            }
        } catch (error) {
            console.error(`Gagal di server ${server}:`, error.message);
            // Lanjut ke server berikutnya...
        }
    }

    if (success && result) {
        return res.status(200).json({
            status: 'success',
            title: result.filename || "Video Downloaded",
            url: result.url || result.stream,
            audio: result.audio || null
        });
    } else {
        return res.status(500).json({ 
            status: 'error', 
            message: 'Semua server sibuk atau link tidak didukung. Coba lagi nanti.' 
        });
    }
}
