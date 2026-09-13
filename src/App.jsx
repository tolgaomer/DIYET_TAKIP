import { useCallback, useEffect, useRef, useState } from 'react'
import GunGorunumu from './components/GunGorunumu.jsx'
import AramaEkle from './components/AramaEkle.jsx'
import MiktarEkrani from './components/MiktarEkrani.jsx'
import KiloKaydi from './components/KiloKaydi.jsx'
import Ayarlar from './components/Ayarlar.jsx'
import {
  gunGetir,
  kayitEkle,
  kayitGuncelle,
  kayitSil,
  olcumKaydet,
  yiyecekEkle,
  favoriArttir,
  sikKullanilanlar as sikKullanilanlarGetir,
  ayarlarGetir,
  ayarlarKaydet
} from './db/db.js'
import { bugununAnahtari, gunEkle } from './utils/tarih.js'

export default function App() {
  const [gunAnahtari, setGunAnahtari] = useState(bugununAnahtari())
  const [gun, setGun] = useState(null)
  const [hedef, setHedef] = useState(null)
  const [sikKullanilanlar, setSikKullanilanlar] = useState([])
  const [ekran, setEkran] = useState(null)
  const [ekranVeri, setEkranVeri] = useState(null)
  const [geriAl, setGeriAl] = useState(null)
  const geriAlZamanlayici = useRef(null)

  const gunuYenile = useCallback(async (anahtar) => {
    const g = await gunGetir(anahtar)
    setGun(g)
  }, [])

  useEffect(() => {
    gunuYenile(gunAnahtari)
  }, [gunAnahtari, gunuYenile])

  useEffect(() => {
    ayarlarGetir().then((a) => setHedef(a.hedef ?? null))
    sikKullanilanlarGetir().then(setSikKullanilanlar)
  }, [])

  useEffect(() => {
    return () => {
      if (geriAlZamanlayici.current) clearTimeout(geriAlZamanlayici.current)
    }
  }, [])

  function ekraniKapat() {
    setEkran(null)
    setEkranVeri(null)
  }

  async function sikKullanilanlariYenile() {
    setSikKullanilanlar(await sikKullanilanlarGetir())
  }

  async function kayitKaydedildi(kayit, ekstra = {}) {
    if (ekstra.guncelleme) {
      await kayitGuncelle(gunAnahtari, kayit)
    } else {
      if (ekstra.yeniYiyecek) {
        const eklenenYiyecek = await yiyecekEkle(ekstra.yeniYiyecek)
        kayit = { ...kayit, kaynakId: eklenenYiyecek.id }
      }
      await kayitEkle(gunAnahtari, kayit)
      if (kayit.kaynakId) {
        await favoriArttir(kayit.kaynakId)
        sikKullanilanlariYenile()
      }
    }
    await gunuYenile(gunAnahtari)
    ekraniKapat()
  }

  async function kayitSilindi(kayit) {
    await kayitSil(gunAnahtari, kayit.id)
    await gunuYenile(gunAnahtari)
    if (geriAlZamanlayici.current) clearTimeout(geriAlZamanlayici.current)
    setGeriAl(kayit)
    geriAlZamanlayici.current = setTimeout(() => setGeriAl(null), 5000)
  }

  async function silmeyiGeriAl() {
    if (!geriAl) return
    if (geriAlZamanlayici.current) clearTimeout(geriAlZamanlayici.current)
    await kayitEkle(gunAnahtari, geriAl)
    await gunuYenile(gunAnahtari)
    setGeriAl(null)
  }

  async function olcumKaydedildi(olcum) {
    await olcumKaydet(gunAnahtari, olcum)
    await gunuYenile(gunAnahtari)
    ekraniKapat()
  }

  async function hedefKaydedildi(yeniHedef) {
    setHedef(yeniHedef)
    const mevcut = await ayarlarGetir()
    await ayarlarKaydet({ ...mevcut, hedef: yeniHedef })
  }

  if (!gun) return null

  return (
    <>
      <GunGorunumu
        gunAnahtari={gunAnahtari}
        gun={gun}
        hedef={hedef}
        sikKullanilanlar={sikKullanilanlar}
        onGunDegistir={(delta) => setGunAnahtari((a) => gunEkle(a, delta))}
        onKcalTikla={() => setEkran('ayarlar')}
        onAramaAc={() => setEkran('arama')}
        onSikKullanilanSec={(y) => {
          setEkranVeri({ yiyecek: y })
          setEkran('miktar-yiyecek')
        }}
        onKayitDuzenle={(kayit) => {
          setEkranVeri({ kayit })
          setEkran('miktar-duzenle')
        }}
        onKayitSil={kayitSilindi}
        onKiloAc={() => setEkran('kilo')}
        onAyarlarAc={() => setEkran('ayarlar')}
      />

      {ekran === 'arama' && (
        <AramaEkle
          sikKullanilanlar={sikKullanilanlar}
          onKapat={ekraniKapat}
          onSec={(y) => {
            setEkranVeri({ yiyecek: y })
            setEkran('miktar-yiyecek')
          }}
          onElleGir={(sorgu) => {
            setEkranVeri({ ilkSorgu: sorgu })
            setEkran('miktar-elle')
          }}
        />
      )}

      {ekran === 'miktar-yiyecek' && (
        <MiktarEkrani
          mod="yiyecek"
          yiyecek={ekranVeri.yiyecek}
          onKapat={ekraniKapat}
          onKaydet={kayitKaydedildi}
        />
      )}

      {ekran === 'miktar-elle' && (
        <MiktarEkrani
          mod="elle"
          ilkSorgu={ekranVeri?.ilkSorgu}
          onKapat={ekraniKapat}
          onKaydet={kayitKaydedildi}
        />
      )}

      {ekran === 'miktar-duzenle' && (
        <MiktarEkrani
          mod="duzenle"
          duzenlenecekKayit={ekranVeri.kayit}
          onKapat={ekraniKapat}
          onKaydet={kayitKaydedildi}
          onSil={(kayit) => {
            ekraniKapat()
            kayitSilindi(kayit)
          }}
        />
      )}

      {ekran === 'kilo' && (
        <KiloKaydi mevcutOlcum={gun.olcum} onKapat={ekraniKapat} onKaydet={olcumKaydedildi} />
      )}

      {ekran === 'ayarlar' && (
        <Ayarlar hedef={hedef} onKapat={ekraniKapat} onHedefKaydet={hedefKaydedildi} />
      )}

      {geriAl && (
        <div className="geri-al">
          <span>{geriAl.ad} silindi</span>
          <button onClick={silmeyiGeriAl}>Geri al</button>
        </div>
      )}
    </>
  )
}
