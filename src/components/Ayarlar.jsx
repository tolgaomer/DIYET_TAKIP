import { useRef, useState } from 'react'
import { tumVeriyiDisaAktar, iceAktarmaOnizle, veriIceAktar } from '../db/db.js'

export default function Ayarlar({ hedef, onKapat, onHedefKaydet }) {
  const [kcal, setKcal] = useState(hedef?.kcal ?? '')
  const [karb, setKarb] = useState(hedef?.karbonhidrat ?? '')
  const [prot, setProt] = useState(hedef?.protein ?? '')
  const [yag, setYag] = useState(hedef?.yag ?? '')
  const [durum, setDurum] = useState('')
  const dosyaRef = useRef(null)

  function hedefKaydet() {
    const varMi = kcal || karb || prot || yag
    onHedefKaydet(
      varMi
        ? {
            kcal: kcal ? Number(kcal) : null,
            karbonhidrat: karb ? Number(karb) : null,
            protein: prot ? Number(prot) : null,
            yag: yag ? Number(yag) : null
          }
        : null
    )
    setDurum('Hedef kaydedildi.')
  }

  async function disaAktar() {
    const veri = await tumVeriyiDisaAktar()
    const blob = new Blob([JSON.stringify(veri, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const bugun = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `diyet-gunlugu-${bugun}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setDurum('Yedek indirildi.')
  }

  async function dosyaSecildi(e) {
    const dosya = e.target.files?.[0]
    e.target.value = ''
    if (!dosya) return
    try {
      const metin = await dosya.text()
      const veri = JSON.parse(metin)
      if (!Array.isArray(veri.gunler)) {
        setDurum('Dosya tanınmadı — geçerli bir yedek değil.')
        return
      }
      const onizleme = await iceAktarmaOnizle(veri)
      let uzerineYazilacak = []
      if (onizleme.celiskiliGunler.length > 0) {
        const onay = window.confirm(
          `${onizleme.celiskiliGunler.length} gün için zaten kayıt var. ` +
            `Bu günlerin üzerine yazılsın mı? (İptal edersen sadece yeni günler eklenir.)`
        )
        if (onay) uzerineYazilacak = onizleme.celiskiliGunler
      }
      const sonuc = await veriIceAktar(veri, uzerineYazilacak)
      setDurum(`${sonuc.yazilanGunSayisi} gün içe aktarıldı.`)
    } catch {
      setDurum('Dosya okunamadı — bozuk ya da geçersiz JSON.')
    }
  }

  return (
    <div className="ekran-ortu" role="dialog" aria-label="Ayarlar ve yedekleme">
      <div className="ekran-basligi">
        <h2>Ayarlar</h2>
        <button className="ekran-kapat dokunma" onClick={onKapat} aria-label="Kapat">
          ×
        </button>
      </div>
      <div className="ekran-govde">
        <h3 style={{ fontSize: '0.95rem', marginBottom: 4 }}>Günlük hedef (isteğe bağlı)</h3>
        <p className="ozet-hedef" style={{ margin: '0 0 14px' }}>
          Boş bırakırsan gün görünümünde sadece toplamlar gösterilir.
        </p>
        <div className="hesap-kart" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="alan" style={{ margin: 0, flex: '1 1 40%' }}>
            <label htmlFor="hedef-kcal">kcal</label>
            <input
              id="hedef-kcal"
              className="metin-girisi"
              type="number"
              inputMode="numeric"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
            />
          </div>
          <div className="alan" style={{ margin: 0, flex: '1 1 40%' }}>
            <label htmlFor="hedef-karb">Karbonhidrat (g)</label>
            <input
              id="hedef-karb"
              className="metin-girisi"
              type="number"
              inputMode="numeric"
              value={karb}
              onChange={(e) => setKarb(e.target.value)}
            />
          </div>
          <div className="alan" style={{ margin: 0, flex: '1 1 40%' }}>
            <label htmlFor="hedef-prot">Protein (g)</label>
            <input
              id="hedef-prot"
              className="metin-girisi"
              type="number"
              inputMode="numeric"
              value={prot}
              onChange={(e) => setProt(e.target.value)}
            />
          </div>
          <div className="alan" style={{ margin: 0, flex: '1 1 40%' }}>
            <label htmlFor="hedef-yag">Yağ (g)</label>
            <input
              id="hedef-yag"
              className="metin-girisi"
              type="number"
              inputMode="numeric"
              value={yag}
              onChange={(e) => setYag(e.target.value)}
            />
          </div>
        </div>
        <button className="birincil-dugme dokunma" onClick={hedefKaydet}>
          Hedefi kaydet
        </button>

        <h3 style={{ fontSize: '0.95rem', margin: '28px 0 4px' }}>Yedekleme</h3>
        <p className="ozet-hedef" style={{ margin: '0 0 14px' }}>
          Tüm verin yalnızca bu cihazda tutulur. Uygulama silinirse ya da tarayıcı
          depolamayı temizlerse kayıtların gider — düzenli olarak dışa aktarmanı öneririz.
        </p>
        <div className="ayarlar-satir">
          <span>Tüm veriyi indir</span>
          <button className="baglanti-dugme dokunma" onClick={disaAktar}>
            Dışa aktar
          </button>
        </div>
        <div className="ayarlar-satir">
          <span>Yedek dosyasından yükle</span>
          <button className="baglanti-dugme dokunma" onClick={() => dosyaRef.current?.click()}>
            İçe aktar
          </button>
          <input
            ref={dosyaRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={dosyaSecildi}
          />
        </div>
        {durum && (
          <p className="ozet-hedef" style={{ marginTop: 10 }}>
            {durum}
          </p>
        )}

        <h3 style={{ fontSize: '0.95rem', margin: '28px 0 4px' }}>Gizlilik</h3>
        <p className="ozet-hedef" style={{ margin: 0 }}>
          Tüm kayıtların yalnızca bu cihazda saklanır. Hiçbir veri sunucuya gönderilmez,
          geliştirici dahil kimse kayıtlarına erişemez.
        </p>
        <p className="ozet-hedef" style={{ marginTop: 10 }}>
          Bu uygulama bir günlük tutma aracıdır; tıbbi tavsiye vermez. Beslenme
          değişikliği öncesi hekime danışmalısın.
        </p>
      </div>
    </div>
  )
}
