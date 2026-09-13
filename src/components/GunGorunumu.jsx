import { gunBasligi, bugununAnahtari } from '../utils/tarih.js'
import { gunToplami, ogunlereGrupla, sayiFormat } from '../utils/hesap.js'

export default function GunGorunumu({
  gunAnahtari,
  gun,
  hedef,
  sikKullanilanlar,
  onGunDegistir,
  onKcalTikla,
  onAramaAc,
  onSikKullanilanSec,
  onKayitDuzenle,
  onKayitSil,
  onKiloAc,
  onAyarlarAc
}) {
  const toplam = gunToplami(gun.kayitlar)
  const gruplar = ogunlereGrupla(gun.kayitlar)
  const ileriKapali = gunAnahtari >= bugununAnahtari()
  const dolumOrani = hedef?.kcal ? Math.min(100, (toplam.kcal / hedef.kcal) * 100) : 0

  return (
    <div className="app">
      <header className="gun-basligi">
        <button
          className="gun-oku dokunma"
          onClick={() => onGunDegistir(-1)}
          aria-label="Önceki gün"
        >
          ‹
        </button>
        <h1>{gunBasligi(gunAnahtari)}</h1>
        <button
          className="gun-oku dokunma"
          onClick={() => onGunDegistir(1)}
          disabled={ileriKapali}
          aria-label="Sonraki gün"
        >
          ›
        </button>
      </header>

      <section className="ozet-kart">
        <div className="ozet-kcal sayi" onClick={onKcalTikla} role="button" tabIndex={0}>
          {sayiFormat(toplam.kcal)}
        </div>
        {hedef?.kcal ? (
          <div className="ozet-hedef" onClick={onKcalTikla} role="button" tabIndex={0}>
            / {sayiFormat(hedef.kcal)} kcal hedef
          </div>
        ) : (
          <div className="ozet-hedef" onClick={onKcalTikla} role="button" tabIndex={0}>
            kcal — hedef girmek için dokun
          </div>
        )}
        {hedef?.kcal && (
          <div className="cubuk-alan">
            <div className="cubuk-dolum" style={{ width: `${dolumOrani}%` }} />
          </div>
        )}
        <div className="makro-satir">
          <span className="makro">
            <span className="makro-nokta karb" />
            Karb {sayiFormat(toplam.karbonhidrat)}
            {hedef?.karbonhidrat ? `/${sayiFormat(hedef.karbonhidrat)}` : ''}
          </span>
          <span className="makro">
            <span className="makro-nokta prot" />
            Prot {sayiFormat(toplam.protein)}
            {hedef?.protein ? `/${sayiFormat(hedef.protein)}` : ''}
          </span>
          <span className="makro">
            <span className="makro-nokta yag" />
            Yağ {sayiFormat(toplam.yag)}
            {hedef?.yag ? `/${sayiFormat(hedef.yag)}` : ''}
          </span>
        </div>
      </section>

      <div className="ekle-alan">
        <button className="ekle-dugme dokunma" onClick={() => onAramaAc()}>
          Ne yedin?
          <span className="artı">+</span>
        </button>
        {sikKullanilanlar.length > 0 && (
          <div className="sik-kullanilan-satir">
            {sikKullanilanlar.map((y) => (
              <button
                key={y.id}
                className="sik-kullanilan-cip dokunma"
                onClick={() => onSikKullanilanSec(y)}
              >
                {y.ad}
              </button>
            ))}
          </div>
        )}
      </div>

      {gruplar.length === 0 ? (
        <p className="bos-durum">Henüz kayıt yok.</p>
      ) : (
        gruplar.map(({ ogun, kayitlar }) => {
          const ogunToplam = kayitlar.reduce((t, k) => t + k.kcal, 0)
          return (
            <section className="bolum" key={ogun}>
              <div className="bolum-baslik">
                <span>{ogun}</span>
                <span>{sayiFormat(ogunToplam)}</span>
              </div>
              <div className="kayit-liste">
                {kayitlar.map((kayit) => (
                  <div className="kayit-satir" key={kayit.id}>
                    <button className="kayit-bilgi" onClick={() => onKayitDuzenle(kayit)}>
                      <span className="kayit-ad">{kayit.ad}</span>
                      <span className="kayit-porsiyon">{kayit.porsiyon}</span>
                    </button>
                    <span className="kayit-kcal sayi">{sayiFormat(kayit.kcal)}</span>
                    <button
                      className="kayit-sil dokunma"
                      onClick={() => onKayitSil(kayit)}
                      aria-label={`${kayit.ad} kaydını sil`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )
        })
      )}

      <section className="bolum">
        {gun.olcum ? (
          <div className="kilo-satir">
            <span>Kilo</span>
            <button className="kayit-bilgi" style={{ textAlign: 'right' }} onClick={onKiloAc}>
              <span className="sayi">{gun.olcum.kilo.toFixed(1).replace('.', ',')} kg ✎</span>
            </button>
          </div>
        ) : (
          <button className="satir-soluk dokunma" onClick={onKiloAc}>
            + Kilo
          </button>
        )}
      </section>

      <div className="alt-bilgi">
        <button onClick={onAyarlarAc}>Ayarlar ve yedekleme</button>
      </div>
    </div>
  )
}
