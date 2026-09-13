import { openDB } from 'idb'
import tohumYiyecekler from '../veri/turk-yemekleri.json'

const DB_ADI = 'diyet'
const DB_SURUM = 1

let dbPromise = null

export function veritabani() {
  if (!dbPromise) {
    dbPromise = openDB(DB_ADI, DB_SURUM, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('gunler')) {
          db.createObjectStore('gunler', { keyPath: 'tarih' })
        }
        if (!db.objectStoreNames.contains('yiyecekler')) {
          const store = db.createObjectStore('yiyecekler', { keyPath: 'id' })
          store.createIndex('aramaAdi', 'aramaAdi')
        }
        // v0.2'de kullanılacak; şema baştan hazır.
        if (!db.objectStoreNames.contains('hareketler')) {
          const store = db.createObjectStore('hareketler', { keyPath: 'id' })
          store.createIndex('aramaAdi', 'aramaAdi')
        }
        if (!db.objectStoreNames.contains('favoriler')) {
          db.createObjectStore('favoriler', { keyPath: 'yiyecekId' })
        }
        if (!db.objectStoreNames.contains('ayarlar')) {
          db.createObjectStore('ayarlar', { keyPath: 'id' })
        }
      }
    }).then(async (db) => {
      await tohumYukle(db)
      return db
    })
  }
  return dbPromise
}

async function tohumYukle(db) {
  const sayim = await db.count('yiyecekler')
  if (sayim > 0) return
  const tx = db.transaction('yiyecekler', 'readwrite')
  await Promise.all(tohumYiyecekler.map((y) => tx.store.put(y)))
  await tx.done
}

function bosGun(anahtar) {
  return { tarih: anahtar, kayitlar: [], olcum: null, hareketler: [] }
}

export async function gunGetir(anahtar) {
  const db = await veritabani()
  const gun = await db.get('gunler', anahtar)
  return gun ?? bosGun(anahtar)
}

async function gunKaydet(gun) {
  const db = await veritabani()
  await db.put('gunler', gun)
}

export async function kayitEkle(anahtar, kayit) {
  const gun = await gunGetir(anahtar)
  gun.kayitlar = [...gun.kayitlar, kayit]
  await gunKaydet(gun)
  return gun
}

export async function kayitGuncelle(anahtar, kayit) {
  const gun = await gunGetir(anahtar)
  gun.kayitlar = gun.kayitlar.map((k) => (k.id === kayit.id ? kayit : k))
  await gunKaydet(gun)
  return gun
}

export async function kayitSil(anahtar, kayitId) {
  const gun = await gunGetir(anahtar)
  gun.kayitlar = gun.kayitlar.filter((k) => k.id !== kayitId)
  await gunKaydet(gun)
  return gun
}

export async function olcumKaydet(anahtar, olcum) {
  const gun = await gunGetir(anahtar)
  gun.olcum = olcum
  await gunKaydet(gun)
  return gun
}

export async function sonKiloGetir() {
  const db = await veritabani()
  let imlec = await db.transaction('gunler').store.openCursor(null, 'prev')
  while (imlec) {
    if (imlec.value.olcum?.kilo) return imlec.value.olcum.kilo
    imlec = await imlec.continue()
  }
  return null
}

function aramaAdiUret(s) {
  return s
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export async function yiyecekAra(sorgu, limit = 20) {
  const temiz = aramaAdiUret(sorgu)
  if (!temiz) return []
  const db = await veritabani()
  const tumu = await db.getAll('yiyecekler')
  const kelimeler = temiz.split(' ').filter(Boolean)
  return tumu
    .filter((y) => kelimeler.every((k) => y.aramaAdi.includes(k)))
    .sort((a, b) => {
      const aBasta = a.aramaAdi.startsWith(temiz) ? 0 : 1
      const bBasta = b.aramaAdi.startsWith(temiz) ? 0 : 1
      if (aBasta !== bBasta) return aBasta - bBasta
      return a.ad.localeCompare(b.ad, 'tr')
    })
    .slice(0, limit)
}

export async function yiyecekEkle(yiyecek) {
  const db = await veritabani()
  const kayit = {
    ...yiyecek,
    aramaAdi: aramaAdiUret(yiyecek.ad),
    guncellendi: Date.now()
  }
  await db.put('yiyecekler', kayit)
  return kayit
}

export function yeniYiyecekId() {
  return `elle-${Date.now()}-${Math.round(Math.random() * 1000)}`
}

// OFF'tan çekilen ürünleri yerel tabloyla aynı depoya yazar (ROJE.md §5,
// katman 2: önbellek). Böylece bir daha aranınca ağ isteği olmadan bulunur.
export async function offSonuclariOnbellekle(urunler) {
  if (!urunler.length) return
  const db = await veritabani()
  const tx = db.transaction('yiyecekler', 'readwrite')
  await Promise.all(
    urunler.map((urun) =>
      tx.store.put({ ...urun, aramaAdi: aramaAdiUret(urun.ad), guncellendi: Date.now() })
    )
  )
  await tx.done
}

export async function tumVeriyiDisaAktar() {
  const db = await veritabani()
  const [gunler, yiyecekler, favoriler, ayarlar] = await Promise.all([
    db.getAll('gunler'),
    db.getAll('yiyecekler'),
    db.getAll('favoriler'),
    db.getAll('ayarlar')
  ])
  return {
    surum: 1,
    disaAktarildi: Date.now(),
    gunler,
    yiyecekler: yiyecekler.filter((y) => y.kaynak !== 'yerel'),
    favoriler,
    ayarlar
  }
}

export async function iceAktarmaOnizle(veri) {
  const db = await veritabani()
  const mevcutGunler = await db.getAllKeys('gunler')
  const mevcutSet = new Set(mevcutGunler)
  const celiskiliGunler = (veri.gunler ?? [])
    .map((g) => g.tarih)
    .filter((tarih) => mevcutSet.has(tarih))
  return { celiskiliGunler, toplamGun: (veri.gunler ?? []).length }
}

export async function veriIceAktar(veri, uzerineYazilacakGunler = []) {
  const db = await veritabani()
  const uzerineSet = new Set(uzerineYazilacakGunler)
  const gunTx = db.transaction('gunler', 'readwrite')
  const mevcutGunler = new Set(await gunTx.store.getAllKeys())
  let yazilan = 0
  for (const gun of veri.gunler ?? []) {
    if (mevcutGunler.has(gun.tarih) && !uzerineSet.has(gun.tarih)) continue
    await gunTx.store.put(gun)
    yazilan += 1
  }
  await gunTx.done

  if (veri.yiyecekler?.length) {
    const yTx = db.transaction('yiyecekler', 'readwrite')
    const mevcutIdler = new Set(await yTx.store.getAllKeys())
    for (const y of veri.yiyecekler) {
      if (!mevcutIdler.has(y.id)) await yTx.store.put(y)
    }
    await yTx.done
  }

  if (veri.favoriler?.length) {
    const fTx = db.transaction('favoriler', 'readwrite')
    for (const f of veri.favoriler) await fTx.store.put(f)
    await fTx.done
  }

  if (veri.ayarlar?.length) {
    const aTx = db.transaction('ayarlar', 'readwrite')
    for (const a of veri.ayarlar) await aTx.store.put(a)
    await aTx.done
  }

  return { yazilanGunSayisi: yazilan }
}

export async function favoriArttir(yiyecekId) {
  const db = await veritabani()
  const mevcut = await db.get('favoriler', yiyecekId)
  await db.put('favoriler', {
    yiyecekId,
    sayac: (mevcut?.sayac ?? 0) + 1,
    sonKullanim: Date.now()
  })
}

export async function sikKullanilanlar(limit = 6) {
  const db = await veritabani()
  const favoriler = await db.getAll('favoriler')
  const sirali = favoriler
    .sort((a, b) => b.sayac - a.sayac || b.sonKullanim - a.sonKullanim)
    .slice(0, limit)
  const yiyecekler = await Promise.all(sirali.map((f) => db.get('yiyecekler', f.yiyecekId)))
  return yiyecekler.filter(Boolean)
}

export async function ayarlarGetir() {
  const db = await veritabani()
  return (await db.get('ayarlar', 'tek')) ?? { id: 'tek', hedef: null, gunBaslangic: '04:00', dil: 'tr' }
}

export async function ayarlarKaydet(ayarlar) {
  const db = await veritabani()
  await db.put('ayarlar', { id: 'tek', ...ayarlar })
}
