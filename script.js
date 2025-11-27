async function download() {
  const url = document.getElementById("url").value.trim();
  const result = document.getElementById("result");
  result.innerHTML = "<p>Sedang memproses...</p>";

  if (!url) return result.innerHTML = "<p style='color:red'>Paste link dulu!</p>";

  let api = "";

  if (url.includes("tiktok.com")) api = `https://api.tiklydown.eu.org/api/download?link=${url}`;
  else if (url.includes("youtube.com") || url.includes("youtu.be")) api = `https://api.savefrom.net/v2/download?url=${url}`;
  else if (url.includes("instagram.com")) api = `https://api.instagramdownloader.org/dl?url=${url}`;
  else if (url.includes("facebook.com") || url.includes("fb.watch")) api = `https://fbdown.net/download.php?url=${url}`;
  else return result.innerHTML = "<p style='color:red'>Link tidak didukung!</p>";

  try {
    const res = await fetch(api);
    const data = await res.json();

    if (data.url || data.video || data.hd || data.result) {
      const link = data.url || data.video || data.hd || data.result || data.download;
      result.innerHTML = `
        <video controls src="${link}" style="max-width:100%;border-radius:10px;margin:10px 0;"></video><br>
        <a href="${link}" download> DOWNLOAD SEKARANG</a>
      `;
    } else {
      result.innerHTML = "<p style='color:red'>Gagal download. Coba link lain.</p>";
    }
  } catch (e) {
    result.innerHTML = "<p style='color:red'>Error: " + e.message + "</p>";
  }
}
