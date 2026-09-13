// Open Food Facts entegrasyonu — ROJE.md §5. Anahtar gerekmiyor, istek yalnızca
// aranan ürün adını taşıyor; kullanıcıya dair hiçbir bilgi gönderilmiyor.
//
// Not: OFF kullanım politikası her istekte tanımlayıcı bir User-Agent başlığı
// istiyor, ama bu statik, sunucusuz bir PWA — tarayıcının fetch() API'si
// "User-Agent" başlığını güvenlik gereği elle ayarlamaya izin vermiyor
// (Fetch spesifikasyonunda yasaklı başlık). Sunucu eklemeden bunu sağlamanın
// yolu yok; OFF'un kendi web arayüzü de aynı taraycı kısıtına tabi.

const ARAMA_URL = 'https://world.openfoodfacts.org/api/v2/search'

export async function offAra(sorgu, { sinyal } = {}) {
  const parametreler = new URLSearchParams({
    search_terms: sorgu,
    fields: 'code,product_name,brands,nutriments',
    lc: 'tr',
    cc: 'tr',
    page_size: '20',
    json: '1'
  })

  const yanit = await fetch(`${ARAMA_URL}?${parametreler}`, { signal: sinyal })
  if (!yanit.ok) throw new Error(`OFF isteği başarısız: ${yanit.status}`)
  const veri = await yanit.json()

  return (veri.products ?? [])
    .map(urunuYiyecegeCevir)
    .filter(Boolean)
}

function urunuYiyecegeCevir(urun) {
  const ad = urun.product_name?.trim()
  const n = urun.nutriments ?? {}
  const kcal = n['energy-kcal_100g']
  const karb = n['carbohydrates_100g']
  const prot = n['proteins_100g']
  const yag = n['fat_100g']

  // Eksik değerli ürün gösterilmez — yarım veri, yanlış veridir (ROJE.md §5).
  if (!ad || !urun.code || [kcal, karb, prot, yag].some((deger) => typeof deger !== 'number')) {
    return null
  }

  return {
    id: `off-${urun.code}`,
    ad,
    marka: urun.brands?.split(',')[0]?.trim() || null,
    barkod: urun.code,
    birim100: 'g',
    kcal100: Math.round(kcal),
    karbonhidrat100: Math.round(karb * 10) / 10,
    protein100: Math.round(prot * 10) / 10,
    yag100: Math.round(yag * 10) / 10,
    porsiyonlar: [],
    kaynak: 'off'
  }
}
