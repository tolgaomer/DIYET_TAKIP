import { useEffect, useRef, useState } from 'react'
import { yiyecekAra } from '../db/db.js'

export default function AramaEkle({ sikKullanilanlar, onKapat, onSec, onElleGir }) {
  const [sorgu, setSorgu] = useState('')
  const [sonuclar, setSonuclar] = useState([])
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
          </div>
        )}

        <button className="elle-gir-dugme dokunma" onClick={() => onElleGir(sorgu)}>
          Bulamadın mı? Elle gir →
        </button>
      </div>
    </div>
  )
}
