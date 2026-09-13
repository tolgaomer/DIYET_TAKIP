// Gün anahtarları hep YYYY-MM-DD; yerel saat dilimine göre hesaplanır (UTC kayması gün değiştirmesin diye).

export function bugununAnahtari() {
  return tarihAnahtari(new Date())
}

export function tarihAnahtari(date) {
  const yil = date.getFullYear()
  const ay = String(date.getMonth() + 1).padStart(2, '0')
  const gun = String(date.getDate()).padStart(2, '0')
  return `${yil}-${ay}-${gun}`
}

export function anahtardanTarih(anahtar) {
  const [yil, ay, gun] = anahtar.split('-').map(Number)
  return new Date(yil, ay - 1, gun)
}

export function gunEkle(anahtar, delta) {
  const d = anahtardanTarih(anahtar)
  d.setDate(d.getDate() + delta)
  return tarihAnahtari(d)
}

const GUN_ADLARI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const AY_ADLARI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

export function gunBasligi(anahtar) {
  if (anahtar === bugununAnahtari()) return 'Bugün'
  if (anahtar === gunEkle(bugununAnahtari(), -1)) return 'Dün'
  const d = anahtardanTarih(anahtar)
  return `${d.getDate()} ${AY_ADLARI[d.getMonth()]}, ${GUN_ADLARI[d.getDay()]}`
}

export function bugundenIleriMi(anahtar) {
  return anahtar > bugununAnahtari()
}

export function varsayilanOgun(date = new Date()) {
  const saat = date.getHours()
  if (saat < 11) return 'Kahvaltı'
  if (saat < 16) return 'Öğle'
  if (saat < 22) return 'Akşam'
  return 'Ara öğün'
}
