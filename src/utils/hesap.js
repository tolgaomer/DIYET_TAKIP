// Besin tablosu her zaman 100 g/ml üzerinden tutulur; kayıt anında miktara göre çarpılır.

export function miktarHesapla(yiyecek, miktar) {
  const oran = miktar / 100
  return {
    kcal: Math.round(yiyecek.kcal100 * oran),
    karbonhidrat: yuvarla1(yiyecek.karbonhidrat100 * oran),
    protein: yuvarla1(yiyecek.protein100 * oran),
    yag: yuvarla1(yiyecek.yag100 * oran)
  }
}

function yuvarla1(sayi) {
  return Math.round(sayi * 10) / 10
}

export function gunToplami(kayitlar) {
  return kayitlar.reduce(
    (t, k) => ({
      kcal: t.kcal + k.kcal,
      karbonhidrat: yuvarla1(t.karbonhidrat + k.karbonhidrat),
      protein: yuvarla1(t.protein + k.protein),
      yag: yuvarla1(t.yag + k.yag)
    }),
    { kcal: 0, karbonhidrat: 0, protein: 0, yag: 0 }
  )
}

export function ogunlereGrupla(kayitlar) {
  const oguns = ['Kahvaltı', 'Öğle', 'Akşam', 'Ara öğün']
  const gruplar = {}
  for (const ogun of oguns) gruplar[ogun] = []
  for (const kayit of kayitlar) {
    if (!gruplar[kayit.ogun]) gruplar[kayit.ogun] = []
    gruplar[kayit.ogun].push(kayit)
  }
  return oguns
    .map((ogun) => ({ ogun, kayitlar: gruplar[ogun] }))
    .filter((g) => g.kayitlar.length > 0)
}

export function sayiFormat(sayi) {
  return new Intl.NumberFormat('tr-TR').format(sayi)
}
