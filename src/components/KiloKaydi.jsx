import { useState } from 'react'

export default function KiloKaydi({ mevcutOlcum, onKapat, onKaydet }) {
  const [kilo, setKilo] = useState(mevcutOlcum?.kilo != null ? String(mevcutOlcum.kilo).replace('.', ',') : '')
  const [belAcik, setBelAcik] = useState(mevcutOlcum?.bel != null)
  const [bel, setBel] = useState(mevcutOlcum?.bel != null ? String(mevcutOlcum.bel) : '')

  const kiloSayi = Number(kilo.replace(',', '.'))
  const gecerli = kilo !== '' && !Number.isNaN(kiloSayi) && kiloSayi > 0

  function kaydet() {
    if (!gecerli) return
    const olcum = {
      kilo: Math.round(kiloSayi * 10) / 10,
      eklendi: Date.now()
    }
    if (belAcik && bel) olcum.bel = Number(bel)
    onKaydet(olcum)
  }

  return (
    <div className="ekran-ortu" role="dialog" aria-label="Kilo kaydet">
      <div className="ekran-basligi">
        <h2>Kilo</h2>
        <button className="ekran-kapat dokunma" onClick={onKapat} aria-label="Kapat">
          ×
        </button>
      </div>
      <div className="ekran-govde">
        <div className="alan">
          <label htmlFor="kilo-girisi">Kilogram</label>
          <input
            id="kilo-girisi"
            className="metin-girisi"
            type="text"
            inputMode="decimal"
            autoFocus
            placeholder="Örn. 82,4"
            value={kilo}
            onChange={(e) => setKilo(e.target.value)}
          />
        </div>

        <div className="ikincil-onay">
          <input
            id="bel-ac"
            type="checkbox"
            checked={belAcik}
            onChange={(e) => setBelAcik(e.target.checked)}
          />
          <label htmlFor="bel-ac">Bel çevresini de kaydet</label>
        </div>

        {belAcik && (
          <div className="alan" style={{ marginTop: 14 }}>
            <label htmlFor="bel-girisi">Bel çevresi (cm)</label>
            <input
              id="bel-girisi"
              className="metin-girisi"
              type="number"
              inputMode="numeric"
              value={bel}
              onChange={(e) => setBel(e.target.value)}
            />
          </div>
        )}

        <button className="birincil-dugme dokunma" onClick={kaydet} disabled={!gecerli} style={{ marginTop: 20 }}>
          Kaydet
        </button>
      </div>
    </div>
  )
}
