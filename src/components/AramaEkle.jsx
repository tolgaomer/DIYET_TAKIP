import { useEffect, useRef, useState } from 'react'
import { yiyecekAra, offSonuclariOnbellekle } from '../db/db.js'
import { offAra } from '../api/off.js'

export default function AramaEkle({ sikKullanilanlar, onKapat, onSec, onElleGir }) {
  const [sorgu, setSorgu] = useState('')
  const [sonuclar, setSonuclar] = useState([])
  const [offSonuclar, setOffSonuclar] = useState([])
  const [offYukleniyor, setOffYukleniyor] = useState(false)
  const [offUlasilamadi, setOffUlasilamadi] = useState(false)
  const girisRef = useRef(null)

  useEffect(() => {
    girisRef.current?.focus()
  }, [])

  useEffect(() => {
    let guncel = true
    if (!sorgu.trim()) {
      setSonuclar([])
      return
    }
    yiyecekAra(sorgu).then((sonuc) => {
      if (guncel) setSonuclar(sonuc)
    })
    return () => {
      guncel = false
    }
  }, [sorgu])

  // Ambalajlı ürünler için Open Food Facts'a 400ms gecikmeli istek (ROJE.md §6.2).
  useEffect(() => {
    setOffUlasilamadi(false)
    if (sorgu.trim().length < 2) {
      setOffSonuclar([])
      return
    }
    const denetleyici = new AbortController()
    const zamanlayici = setTimeout(async () => {
      setOffYukleniyor(true)
      try {
        const sonuc = await offAra(sorgu, { sinyal: denetleyici.signal })
        setOffSonuclar(sonuc)
        offSonuclariOnbellekle(sonuc)
      } catch (hata) {
        if (hata.name !== 'AbortError') setOffUlasilamadi(true)
      } finally {
        setOffYukleniyor(false)
      }
    }, 400)
    return () => {
      denetleyici.abort()
      clearTimeout(zamanlayici)
    }
  }, [sorgu])

  const yerelIdler = new Set(sonuclar.map((y) => y.id))
  const gosterilecekOff = offSonuclar.filter((y) => !yerelIdler.has(y.id))

  return (
    <div className="ekran-ortu" role="dialog" aria-label="Yiyecek ara ve ekle">
      <div className="ekran-basligi">
        <h2>Ne yedin?</h2>
        <button className="ekran-kapat dokunma" onClick={onKapat} aria-label="Kapat">
          ×
        </button>
      </div>
      <div className="ekran-govde">
        <input
          ref={girisRef}
          className="metin-girisi"
          type="text"
          inputMode="search"
          placeholder="Örn. mercimek çorbası"
          value={sorgu}
          onChange={(e) => setSorgu(e.target.value)}
        />

        {!sorgu.trim() && sikKullanilanlar.length > 0 && (
          <div className="sik-kullanilan-satir" style={{ marginTop: 14 }}>
            {sikKullanilanlar.map((y) => (
              <button
                key={y.id}
                className="sik-kullanilan-cip dokunma"
                onClick={() => onSec(y)}
              >
                {y.ad}
              </button>
            ))}
          </div>
        )}

        {sorgu.trim() && (
          <div style={{ marginTop: 10 }}>
            {sonuclar.map((y) => (
              <button key={y.id} className="arama-sonuc dokunma" onClick={() => onSec(y)}>
                <span>
                  <span className="arama-sonuc-ad">{y.ad}</span>
                  <span className="arama-sonuc-detay">
                    {y.kcal100} kcal / 100 {y.birim100}
                  </span>
                </span>
              </button>
            ))}
            {sonuclar.length === 0 && (
              <p className="bos-durum" style={{ padding: '20px 0' }}>
                Bulamadık.
              </p>
            )}

            {sorgu.trim().length >= 2 && (
              <>
                <div className="bolum-baslik" style={{ margin: '18px 0 4px', padding: '6px 4px' }}>
                  <span>Ambalajlı ürünlerde ara</span>
                </div>
                {offYukleniyor && (
                  <p className="bos-durum" style={{ padding: '12px 0' }}>
                    Aranıyor…
                  </p>
                )}
                {!offYukleniyor && offUlasilamadi && (
                  <p className="bos-durum" style={{ padding: '12px 0' }}>
                    Şu an ulaşılamıyor, yerel tabloda arayabilir ya da elle girebilirsin.
                  </p>
                )}
                {!offYukleniyor &&
                  !offUlasilamadi &&
                  gosterilecekOff.map((y) => (
                    <button key={y.id} className="arama-sonuc dokunma" onClick={() => onSec(y)}>
                      <span>
                        <span className="arama-sonuc-ad">
                          {y.ad}
                          {y.marka ? ` — ${y.marka}` : ''}
                        </span>
                        <span className="arama-sonuc-detay">
                          {y.kcal100} kcal / 100 {y.birim100}
                        </span>
                      </span>
                    </button>
                  ))}
                {!offYukleniyor && !offUlasilamadi && gosterilecekOff.length > 0 && (
                  <p className="arama-sonuc-detay" style={{ padding: '10px 4px 0' }}>
                    Ambalajlı ürün verileri Open Food Facts'ten (ODbL).
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <button className="elle-gir-dugme dokunma" onClick={() => onElleGir(sorgu)}>
          Bulamadın mı? Elle gir →
        </button>
      </div>
    </div>
  )
}
