// /menu.js
// Aynı host/portta çalışıyorsan boş bırak.
// Farklı host/port ise örn: "http://10.158.146.178:5000"

const elMenu = document.getElementById("menu");
const elInfo = document.getElementById("info");
const elQ = document.getElementById("q");
const qs = new URLSearchParams(location.search);
const API_BASE =
    (qs.get("api") || https://drill-toys-iii-obituaries.trycloudflare.com")
        .replace(/\/$/, "");

// QR ile gelen API adresi (yoksa bulunduğu origin)


// QR ile gelen cafe adı
const cafeName = qs.get("name") || "Simitçi Usta Cafe Menü";
const cafeNameEl = document.getElementById("cafeName");
if (cafeNameEl) cafeNameEl.textContent = cafeName;

const API_KATEGORI = `${API_BASE}/api/Kategori`;
const API_URUNLER = (kategoriId) => `${API_BASE}/api/Urunler/${kategoriId}`;
let kategoriler = [];
let urunlerByKategori = new Map(); // key: kategoriId, value: urun listesi

function money(v) {
    const n = Number(v ?? 0);
    return n.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

function escapeHtml(s) {
    return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

async function fetchJson(url) {
    const r = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`${r.status} ${r.statusText} - ${t}`);
    }
    return await r.json();
}

async function loadKategoriler() {
    // Controller adı: KategoriController => route: /api/kategori
    return await fetchJson(`${API_BASE}/api/kategori`);
}

async function loadUrunler(kategoriId) {
    // Controller adı: UrunlerController => route: /api/urunler/{kategoriId}
    return await fetchJson(`${API_BASE}/api/urunler/${kategoriId}`);
}

function render() {
    const q = (elQ.value || "").trim().toLowerCase();

    let toplamUrun = 0;
    for (const list of urunlerByKategori.values()) toplamUrun += list.length;

    elInfo.textContent = `${kategoriler.length} kategori • ${toplamUrun} ürün`;
    elMenu.innerHTML = "";

    for (const kat of kategoriler) {
        const katId = Number(kat.ID);
        const katAd = kat.STOKGRUBU ?? "Kategori";

        const urunler = urunlerByKategori.get(katId) || [];
        const filtreli = q
            ? urunler.filter(u => String(u.UrunAd ?? "").toLowerCase().includes(q))
            : urunler;

        const section = document.createElement("section");
        section.className = "cat";

        const head = document.createElement("button");
        head.type = "button";
        head.className = "catHeadBtn";
        head.innerHTML = `
      <div class="catTitle">${escapeHtml(katAd)}</div>
      <div class="catRight">
        <div class="catMeta">${filtreli.length} ürün</div>
        <div class="chev">▾</div>
      </div>
    `;

        const body = document.createElement("div");
        body.className = "catBody";
        body.style.display = "none";

        body.innerHTML =
            filtreli.length === 0
                ? `<div class="empty">Bu kategoride ürün yok</div>`
                : filtreli
                    .map(
                        (u) => `
              <div class="row">
                <div class="name">${escapeHtml(u.UrunAd)}</div>
                <div class="price">${money(u.Fiyat)}</div>
              </div>`
                    )
                    .join("");

        head.addEventListener("click", () => {
            const open = body.style.display !== "none";
            body.style.display = open ? "none" : "block";
            head.classList.toggle("open", !open);
        });

        section.appendChild(head);
        section.appendChild(body);
        elMenu.appendChild(section);
    }
}

async function init() {
    try {
        elInfo.textContent = "Kategoriler yükleniyor…";

        kategoriler = await loadKategoriler();

        // Kategorileri yükledikten sonra her kategori için ürünleri çek
        // (İstersen bunu lazy yaparız, şimdilik direkt çekiyoruz)
        elInfo.textContent = "Ürünler yükleniyor…";

        const tasks = kategoriler.map(async (k) => {
            const id = Number(k.ID);
            try {
                const urunler = await loadUrunler(id);

                // Backend propertyNamingPolicy null => Json property isimleri C#'taki gibi gelir
                // Senin controller: UrunAd, Fiyat vs dönüyor
                urunlerByKategori.set(id, urunler);
            } catch (e) {
                console.error("Ürün yüklenemedi kategori:", id, e);
                urunlerByKategori.set(id, []); // boş kalsın
            }
        });

        await Promise.all(tasks);

        render();
    } catch (e) {
        console.error(e);
        elInfo.textContent = "Hata: API'ye bağlanılamadı";
        elMenu.innerHTML = `<div class="empty">Sunucuya erişilemiyor. Console'u (F12) kontrol edin.</div>`;
    }
}

elQ.addEventListener("input", () => render());

init();







