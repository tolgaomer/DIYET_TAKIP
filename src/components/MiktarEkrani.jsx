import { useMemo, useState } from 'react'
import { miktarHesapla, sayiFormat } from '../utils/hesap.js'
import { varsayilanOgun } from '../utils/tarih.js'
import { yeniYiyecekId } from '../db/db.js'

const OGUNLER = ['Kahvaltı', 'Öğle', 'Akşam', 'Ara öğün']

function yeniKayitId() {
  return `${Date.now()}-${Math.round(Math.random() * 1000)}`
}

export default function MiktarEkrani({ mod, yiyecek, ilkSorgu, duzenlenecekKayit, onKapat, onKaydet, onSil }) {
  const duzenleModu = mod === 'duzenle'
  const kaynakYiyecek = duzenleModu ? null : yiyecek

  const [miktar, setMiktar] = useState(() => {
    if (duzenleModu) return duzenlenecekKayit.miktar
    return kaynakYiyecek?.porsiyonlar?.[0]?.miktar ?? 100
  })
  const [secilenPorsiyon, setSecilenPorsiyon] = useState(
    duzenleModu ? null : kaynakYiyecek?.porsiyonlar?.[0]?.ad ?? null
  )
  const [ogun, setOgun] = useState(duzenleModu ? duzenlenecekKayit.ogun : varsayilanOgun())

  // Elle giriş alanları — porsiyon başına doğrudan değer, 100 g'a çevrim isteğe bağlı.
  const [elleAd, setElleAd] = useState(ilkSorgu ?? '')
  const [elleForsiyon, setElleForsiyon] = useState('1 porsiyon')
  const [elleKcal, setElleKcal] = useState('')
  const [elleKarb, setElleKarb] = useState('')
  const [elleProt, setElleProt] = useState('')
  const [elleYag, setElleYag] = useState('')
  const [tabloyaEkle, setTabloyaEkle] = useState(false)
  const [elleGram, setElleGram] = useState('')

  const hesap = useMemo(() => {
    if (mod === 'elle') {
      return {
        kcal: Math.round(Number(elleKcal) || 0),
        karbonhidrat: Number(elleKarb) || 0,
        protein: Number(elleProt) || 0,
        yag: Number(elleYag) || 0
      }
    }
    const y = duzenleModu ? duzenlenecekKayit : kaynakYiyecek
    if (!y) return { kcal: 0, karbonhidrat: 0, protein: 0, yag: 0 }
    if (duzenleModu) {
      // Düzenlemede geçmiş kaynak yiyecek yeniden okunmaz; oran değişmez, miktar oranına göre ölçekle.
      const oran = miktar / duzenlenecekKayit.miktar
      return {
        kcal: Math.round(duzenlenecekKayit.kcal * oran),
        karbonhidrat: Math.round(duzenlenecekKayit.karbonhidrat * oran * 10) / 10,
        protein: Math.round(duzenlenecekKayit.protein * oran * 10) / 10,
        yag: Math.round(duzenlenecekKayit.yag * oran * 10) / 10
      }
    }
    return miktarHesapla(y, miktar)
  }, [mod, elleKcal, elleKarb, elleProt, elleYag, miktar, duzenleModu, duzenlenecekKayit, kaynakYiyecek])

  function porsiyonSec(p) {
    setSecilenPorsiyon(p.ad)
    setMiktar(p.miktar)
  }

  function kaydet() {
    if (mod === 'elle') {
      if (!elleAd.trim() || !elleKcal) return
      const kayit = {
        id: yeniKayitId(),
        ad: elleAd.trim(),
        porsiyon: elleForsiyon.trim() || '1 porsiyon',
        ogun,
        miktar: 1,
        birim: 'porsiyon',
        kcal: Math.round(Number(elleKcal) || 0),
        karbonhidrat: Number(elleKarb) || 0,
        protein: Number(elleProt) || 0,
        yag: Number(elleYag) || 0,
        kaynak: 'elle',
        kaynakId: null,
        eklendi: Date.now()
      }
      let yeniYiyecek = null
      if (tabloyaEkle && elleGram) {
        const gram = Number(elleGram)
        if (gram > 0) {
          const oran = 100 / gram
          yeniYiyecek = {
            id: yeniYiyecekId(),
            ad: elleAd.trim(),
            marka: null,
            barkod: null,
            birim100: 'g',
            kcal100: Math.round((Number(elleKcal) || 0) * oran),
            karbonhidrat100: Math.round((Number(elleKarb) || 0) * oran * 10) / 10,
            protein100: Math.round((Number(elleProt) || 0) * oran * 10) / 10,
            yag100: Math.round((Number(elleYag) || 0) * oran * 10) / 10,
            porsiyonlar: [{ ad: elleForsiyon.trim() || '1 porsiyon', miktar: gram }],
            kaynak: 'elle'
          }
        }
      }
      onKaydet(kayit, { yeniYiyecek })
      return
    }

    if (duzenleModu) {
      const guncelKayit = {
        ...duzenlenecekKayit,
        miktar,
        ogun,
        ...hesap
      }
      onKaydet(guncelKayit, { guncelleme: true })
      return
    }

    const porsiyonEtiketi = secilenPorsiyon ?? `${sayiFormat(miktar)} ${kaynakYiyecek.birim100}`
    const kayit = {
      id: yeniKayitId(),
      ad: kaynakYiyecek.ad,
      porsiyon: porsiyonEtiketi,
      ogun,
      miktar,
      birim: kaynakYiyecek.birim100,
      ...hesap,
      kaynak: kaynakYiyecek.kaynak === 'yerel' ? 'yerel' : 'off',
      kaynakId: kaynakYiyecek.id,
      eklendi: Date.now()
    }
    onKaydet(kayit, {})
  }

  const baslik = mod === 'elle' ? 'Elle gir' : duzenleModu ? 'Kaydı düzenle' : kaynakYiyecek.ad
  const kaydetGecerli =
    mod === 'elle' ? elleAd.trim() && elleKcal !== '' : true

  return (
    <div className="ekran-ortu" role="dialog" aria-label={baslik}>
      <div className="ekran-basligi">
        <h2>{baslik}</h2>
        <button className="ekran-kapat dokunma" onClick={onKapat} aria-label="Kapat">
          ×
        </button>
      </div>
      <div className="ekran-govde">
        {mod === 'elle' && (
          <>
            <div className="alan">
              <label htmlFor="elle-ad">Ad</label>
              <input
                id="elle-ad"
                className="metin-girisi"
                value={elleAd}
                onChange={(e) => setElleAd(e.target.value)}
                placeholder="Örn. Ev yapımı köfte"
              />
            </div>
            <div className="alan">
              <label htmlFor="elle-porsiyon">Porsiyon</label>
              <input
                id="elle-porsiyon"
                className="metin-girisi"
                value={elleForsiyon}
                onChange={(e) => setElleForsiyon(e.target.value)}
                placeholder="Örn. 1 tabak"
              />
            </div>
            <div className="hesap-kart" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div className="alan" style={{ margin: 0, flex: '1 1 40%' }}>
                <label htmlFor="elle-kcal">kcal</label>
                <input
                  id="elle-kcal"
                  className="metin-girisi"
                  type="number"
                  inputMode="numeric"
                  value={elleKcal}
                  onChange={(e) => setElleKcal(e.target.value)}
                />
              </div>
              <div className="alan" style={{ margin: 0, flex: '1 1 40%' }}>
                <label htmlFor="elle-karb">Karbonhidrat (g)</label>
                <input
                  id="elle-karb"
                  className="metin-girisi"
                  type="number"
                  inputMode="decimal"
                  value={elleKarb}
                  onChange={(e) => setElleKarb(e.target.value)}
                />
              </div>
              <div className="alan" style={{ margin: 0, flex: '1 1 40%' }}>
                <label htmlFor="elle-prot">Protein (g)</label>
                <input
                  id="elle-prot"
                  className="metin-girisi"
                  type="number"
                  inputMode="decimal"
                  value={elleProt}
                  onChange={(e) => setElleProt(e.target.value)}
                />
              </div>
              <div className="alan" style={{ margin: 0, flex: '1 1 40%' }}>
                <label htmlFor="elle-yag">Yağ (g)</label>
                <input
                  id="elle-yag"
                  className="metin-girisi"
                  type="number"
                  inputMode="decimal"
                  value={elleYag}
                  onChange={(e) => setElleYag(e.target.value)}
                />
              </div>
            </div>

            <div className="ikincil-onay">
              <input
                id="tabloya-ekle"
                type="checkbox"
                checked={tabloyaEkle}
                onChange={(e) => setTabloyaEkle(e.target.checked)}
              />
              <label htmlFor="tabloya-ekle">Bunu tabloma ekle</label>
            </div>
            {tabloyaEkle && (
              <div className="alan">
                <label htmlFor="elle-gram">
                  Bu porsiyon kaç gram/ml? (tabloya 100 g üzerinden eklemek için)
                </label>
                <input
                  id="elle-gram"
                  className="metin-girisi"
                  type="number"
                  inputMode="numeric"
                  value={elleGram}
                  onChange={(e) => setElleGram(e.target.value)}
                  placeholder="Örn. 250"
                />
              </div>
            )}
          </>
        )}

        {mod !== 'elle' && !duzenleModu && (
          <>
            {kaynakYiyecek.porsiyonlar?.length > 0 && (
              <div className="porsiyon-dugmeleri">
                {kaynakYiyecek.porsiyonlar.map((p) => (
                  <button
                    key={p.ad}
                    className={`porsiyon-dugme dokunma${secilenPorsiyon === p.ad ? ' secili' : ''}`}
                    onClick={() => porsiyonSec(p)}
                  >
                    {p.ad}
                  </button>
                ))}
              </div>
            )}
            <div className="alan">
              <label htmlFor="gram-girisi">Miktar ({kaynakYiyecek.birim100})</label>
              <input
                id="gram-girisi"
                className="metin-girisi"
                type="number"
                inputMode="numeric"
                value={miktar}
                onChange={(e) => {
                  setSecilenPorsiyon(null)
                  setMiktar(Number(e.target.value))
                }}
              />
            </div>
          </>
        )}

        {duzenleModu && (
          <div className="alan">
            <label htmlFor="gram-girisi">Miktar ({duzenlenecekKayit.birim})</label>
            <input
              id="gram-girisi"
              className="metin-girisi"
              type="number"
              inputMode="numeric"
              value={miktar}
              onChange={(e) => setMiktar(Number(e.target.value))}
            />
          </div>
        )}

        {mod !== 'elle' && (
          <div className="hesap-kart">
            <div className="hesap-deger">
              <span className="sayi">{sayiFormat(hesap.kcal)}</span>
              <span className="etiket">kcal</span>
            </div>
            <div className="hesap-deger">
              <span className="sayi">{sayiFormat(hesap.karbonhidrat)}</span>
              <span className="etiket">karb</span>
            </div>
            <div className="hesap-deger">
              <span className="sayi">{sayiFormat(hesap.protein)}</span>
              <span className="etiket">prot</span>
            </div>
            <div className="hesap-deger">
              <span className="sayi">{sayiFormat(hesap.yag)}</span>
              <span className="etiket">yağ</span>
            </div>
          </div>
        )}

        <div className="alan">
          <label>Öğün</label>
          <div className="ogun-secim">
            {OGUNLER.map((o) => (
              <button
                key={o}
                className={`ogun-dugme dokunma${ogun === o ? ' secili' : ''}`}
                onClick={() => setOgun(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <button className="birincil-dugme dokunma" onClick={kaydet} disabled={!kaydetGecerli}>
          Kaydet
        </button>

        {duzenleModu && (
          <button
            className="elle-gir-dugme dokunma"
            style={{ textAlign: 'center', marginTop: 10 }}
            onClick={() => onSil(duzenlenecekKayit)}
          >
            Kaydı sil
          </button>
        )}
      </div>
    </div>
  )
}
