# Diyet Günlüğü — Proje Tarifi

Bu dosya projenin tek referansıdır. Yeni bir oturuma başlarken önce bunu oku.
Bir karar değiştiğinde kodu değiştirmeden önce bu dosyayı güncelle.

---

## 1. Ne yapıyoruz

Kişinin gün içinde yediklerini yazdığı, kalori ve makro besin değerlerini
(karbonhidrat, protein, yağ) toplayan bir günlük. Web teknolojisiyle yazılır,
PWA olarak telefonun ana ekranına eklenir, çevrimdışı çalışır.

**Amaç, takip alışkanlığı kazandırmak.** Uygulama kullanıcıya ne yiyeceğini
söylemez, diyet önermez, hedef hesaplamaz, hastalığa yönelik yorum yapmaz.
Sadece kaydeder ve toplar. Bu sınır bilinçlidir ve teknik değil hukuki bir
tercihtir — öneri üreten bir yazılım tıbbi cihaz mevzuatına girebilir.

### Kapsam dışı (v1'de yapılmayacak)

- Sunucu, kullanıcı hesabı, giriş ekranı
- Kullanıcı verisinin cihaz dışına çıkması
- Diyet önerisi, yemek planı, koçluk, bildirim, rozet, seri (streak)
- App Store / Play Store dağıtımı

---

## 2. Gizlilik ilkesi

Tüm veri kullanıcının cihazında kalır. Uygulamanın sahibi dahil hiç kimse
kullanıcının kayıtlarını göremez. Dışarıya giden tek istek, Open Food Facts'e
yapılan besin arama sorgusudur; bu sorgu yalnızca aranan gıdanın adını içerir,
kullanıcıya dair hiçbir bilgi taşımaz.

Bu ilke pazarlama cümlesi değil, mimari kısıt. Analitik, hata toplama servisi,
reklam SDK'sı, çerez, parmak izi çıkarma — hiçbiri eklenmeyecek.

---

## 3. Teknik yığın

| Katman | Seçim | Gerekçe |
|---|---|---|
| Derleyici | Vite | Hızlı, yapılandırması az |
| Arayüz | React (sade JavaScript) | TypeScript yok, projeyi ağırlaştırıyor |
| PWA | `vite-plugin-pwa` | Manifest ve service worker üretimi |
| Depolama | IndexedDB, `idb` paketi | localStorage besin tablosu için yetersiz |
| Stil | Satır içi stil + tek `<style>` bloğu | CSS çerçevesi yok, proje küçük |
| Test | Yok (v1) | Tek kullanıcılı prototip |

Bağımlılık listesini kısa tut. Yeni paket eklemeden önce gerekçesini bu dosyaya yaz.

---

## 4. Veri modeli

IndexedDB veritabanı adı: `diyet`. Sürüm 1. Depolar:

### `gunler`
Anahtar: `YYYY-MM-DD`

```js
{
  tarih: "2026-09-13",
  kayitlar: [
    {
      id: "1757750400000-0",
      ad: "Mercimek çorbası",
      porsiyon: "1 kase (250 ml)",
      ogun: "Kahvaltı",          // Kahvaltı | Öğle | Akşam | Ara öğün
      miktar: 250,                // sayı
      birim: "g",                 // "g" | "ml" | "adet" | "porsiyon"
      kcal: 180,
      karbonhidrat: 24,           // gram
      protein: 9,
      yag: 5,
      kaynak: "yerel",            // "yerel" | "off" | "elle"
      kaynakId: "tr-0042",        // yerel tablo kodu veya OFF barkodu
      eklendi: 1757750400000
    }
  ],
  olcum: {                        // isteğe bağlı, günde en fazla bir kayıt
    kilo: 82.4,                   // kg, bir ondalık
    bel: 92,                      // cm, isteğe bağlı
    eklendi: 1757750400000
  },
  hareketler: [
    {
      id: "1757750400000-h0",
      ad: "Tempolu yürüyüş",
      hareketId: "mv-012",        // MET tablosu kodu, elle girişte null
      dakika: 45,
      kcal: 214,                  // hesaplanmış, düzenlenebilir
      kaynak: "tablo",            // "tablo" | "elle"
      eklendi: 1757750400000
    }
  ]
}
```

`olcum` ve `hareketler` alanları boş olabilir. Kullanıcı kilo veya hareket
girmezse arayüzde bu bölümler hiç görünmez — kimseyi tartıya çıkmaya zorlamıyoruz.

### `yiyecekler`
Besin tablosu. Uygulamayla gelen Türk yemekleri ve OFF'tan çekilip önbelleğe
alınan ürünler aynı depoda yaşar.

```js
{
  id: "tr-0042",
  ad: "Mercimek çorbası",
  aramaAdi: "mercimek corbasi",   // aksansız, küçük harf, arama için
  marka: null,
  barkod: null,
  birim100: "g",                  // değerler 100 g mı 100 ml mi
  kcal100: 72,
  karbonhidrat100: 9.6,
  protein100: 3.6,
  yag100: 2.0,
  porsiyonlar: [                  // hızlı seçim için
    { ad: "1 kase", miktar: 250 },
    { ad: "1 kepçe", miktar: 120 }
  ],
  kaynak: "yerel",
  guncellendi: 1757750400000
}
```

**Kural:** Besin değerleri tabloda daima 100 g / 100 ml üzerinden tutulur.
Porsiyon çarpımı kayıt anında yapılır ve `gunler` içine hesaplanmış hâliyle
yazılır. Böylece tablo sonradan düzeltilse bile geçmiş kayıtlar oynamaz.

### `hareketler`
Aktivite tablosu. Uygulamayla gelir, kullanıcı kendi kalemini ekleyebilir.

```js
{
  id: "mv-012",
  ad: "Tempolu yürüyüş (5,5 km/sa)",
  aramaAdi: "tempolu yuruyus",
  grup: "Yürüyüş ve koşu",
  met: 4.3,
  kaynak: "compendium"    // Compendium of Physical Activities
}
```

Harcama hesabı: `kcal = MET × kilo(kg) × dakika / 60`.
Kilo, en son kaydedilen `olcum.kilo` değerinden alınır. Hiç kilo girilmemişse
uygulama kilo sorar; tahmin üretmez.

### `favoriler`
```js
{ yiyecekId: "tr-0042", sayac: 14, sonKullanim: 1757750400000 }
```

Hareketlerin de kendi sık kullanılanları olur; aynı depoda `hareketId` alanıyla
tutulur.

### `ayarlar`
```js
{
  id: "tek",
  hedef: { kcal: 2200, karbonhidrat: 230, protein: 120, yag: 75 },
  gunBaslangic: "04:00",   // bu saatten önceki kayıt önceki güne yazılır
  dil: "tr"
}
```

Hedefler isteğe bağlıdır. Kullanıcı hedef girmezse arayüz yalnızca toplamları
gösterir, "kaldı / aştın" dili kullanmaz.

---

## 5. Besin verisi stratejisi

Üç katmanlı arama. Sırayla denenir, ilk bulan kazanır.

**1. Yerel tablo (gömülü).** `src/veri/turk-yemekleri.json` içinde repoda
gelir. İlk açılışta `yiyecekler` deposuna yüklenir. En az 300 kalem hedefleniyor;
ilk sürümde 50 kalemlik çekirdekle başla (çorbalar, pilavlar, etli yemekler,
zeytinyağlılar, kahvaltılıklar, ekmek çeşitleri, meyveler). Kaynak olarak TÜBER
ve TürKomp değerlerini esas al, her kalemin yanına kaynağını yaz.

**2. Önbellek.** Daha önce OFF'tan çekilmiş ürünler. Çevrimdışı çalışır.

**3. Open Food Facts.** Ambalajlı ürünler için. Anahtar gerekmiyor.

```
Ada göre:  https://world.openfoodfacts.org/api/v2/search
           ?search_terms={ad}&fields=code,product_name,brands,nutriments
           &lc=tr&cc=tr&page_size=20&json=1

Barkoda göre: https://world.openfoodfacts.org/api/v2/product/{barkod}.json
```

OFF kullanım politikası gereği her istekte tanımlayıcı bir `User-Agent`
başlığı gönder: `DiyetGunlugu/1.0 (iletisim-adresi)`.

İlgili alanlar: `nutriments["energy-kcal_100g"]`, `carbohydrates_100g`,
`proteins_100g`, `fat_100g`. Bu alanların eksik geldiği ürünler arama
sonucunda gösterilmez — yarım veri, yanlış veridir.

OFF verisi ODbL lisanslı. Uygulama içinde "Ambalajlı ürün verileri Open Food
Facts'ten (ODbL)" şeklinde atıf bulunmalı.

**Model tahmini v1'de yok.** Ev yemeği tabloda bulunamazsa kullanıcı elle girer
ve kaydı istediğinde kendi tablosuna ekleyebilir. Dil modeliyle tahmin ileride
düşünülecek; ücretsiz dağıtımda maliyet tavanı olmadığı için baştan koymuyoruz.

---

## 6. Ekranlar

Tek sayfalık uygulama. Alt gezinme çubuğu yok, üç görünüm arasında geçiş var.

### 6.1 Gün görünümü (ana ekran)

```
┌──────────────────────────────┐
│  ‹     Bugün     ›           │
├──────────────────────────────┤
│  1.842                       │  ← büyük kcal sayısı
│  / 2.200 kcal hedef          │  ← dokununca hedef ayarı açılır
│  ▬▬▬▬▬▬▬▬░░░░░               │
│  ▰▰▰▰▰▰▰▰▰▰▰▰▰▰              │  ← enerji payı şeridi
│  Karb 182/230  Prot 96/120   │
│  Yağ 71/75                   │
├──────────────────────────────┤
│  [ Ne yedin?          ] [+]  │
│  (sık kullanılanlar: ○ ○ ○)  │
├──────────────────────────────┤
│  Kahvaltı              412   │
│   Menemen        ...   248 × │
│   Tam buğday ekmeği    164 × │
│  Öğle                  ...   │
├──────────────────────────────┤
│  Hareket          214 kcal   │
│   Tempolu yürüyüş 45'  214 × │
├──────────────────────────────┤
│  Kilo             82,4 kg ✎  │
└──────────────────────────────┘
```

- Gün oklarıyla geçmişe gidilir, ileri gidiş bugünle sınırlı.
- Kayda dokununca miktar düzenleme açılır, sağdaki × siler.
- Silme geri alınabilir olmalı: 5 saniyelik "Geri al" bildirimi.
- Hareket ve kilo bölümleri, o gün kayıt yoksa tek satırlık soluk bir
  "+ Hareket" / "+ Kilo" düğmesine iner. Yemek listesinin önüne geçmez.

### 6.2 Arama ve ekleme

Kullanıcı yazmaya başlayınca sonuçlar canlı gelir. Üstte yerel tablo, altında
"Ambalajlı ürünlerde ara" bölümü (OFF çağrısı, 400 ms gecikmeli).

Bir sonuç seçilince miktar ekranı açılır: porsiyon düğmeleri (1 kase, 1 dilim)
veya doğrudan gram girişi. Hesaplanan değerler anında güncellenir. Öğün
varsayılanı saate göre gelir, değiştirilebilir.

Sonuç yoksa: "Bulamadın mı? Elle gir" — ad, porsiyon, dört değer. Kaydederken
"Bunu tabloma ekle" seçeneği.

### 6.3 Kilo ve hareket

**Kilo.** Tek alan, kilogram, bir ondalık. Günde bir kayıt; aynı güne ikinci
giriş öncekinin üzerine yazar. Bel çevresi isteğe bağlı ikinci alan olarak
durur, varsayılan olarak kapalı gelir.

**Hareket.** Aktivite tablosundan arama, süre girişi, kcal otomatik hesaplanır
ve düzenlenebilir. Tabloda bulunmayan aktivite elle girilir (ad + dakika + kcal).

**Kritik karar: harcanan kalori alınan kaloriden düşülmez.** Hareket kaydı gün
görünümünde ayrı bir satır olarak, kendi toplamıyla durur. Kalori hedefi
hareketle büyümez, "bugün spor yaptın, 300 kalori hakkın var" gibi bir dil
kullanılmaz.

Bunun gerekçesi teknik değil. Egzersizi yemek bütçesine çeviren arayüzler,
telafi davranışını öğretiyor ve zaten MET tahmininin hata payı kolayca yüzde
otuzu buluyor; yanlış sayıyı yemek hakkına çevirmenin anlamı yok. İki sayıyı
yan yana göstermek, birbirinden çıkarmaktan hem daha dürüst hem de kullanıcıyı
kendi yorumunu yapmakta serbest bırakıyor.

### 6.4 Geçmiş ve dışa aktarma

Son 30 günün kalori çizgisi ve günlük ortalamalar. Kilo kaydı varsa ikinci bir
çizgi olarak aynı zaman ekseninde gösterilir; eksik günler birleştirilmez,
noktalar arası boşluk korunur. Hareket, günlük toplam dakika olarak alta
yerleşir. Tarih aralığı seçilip "PDF olarak kaydet" denince yazdırma görünümü
açılır.

Grafikte eğilim çizgisi, tahmin, hedef kilo çizgisi veya "şu tarihte şu kiloda
olursun" türü projeksiyon yok.

---

## 7. PDF çıktısı

Ayrı bir PDF kütüphanesi kullanma. Yazdırmaya özel bir stil sayfası yaz ve
`window.print()` çağır; kullanıcı iOS ve macOS'ta "PDF olarak kaydet" der.

Çıktı düzeni: başlık ve tarih aralığı, her gün için öğün bazlı tablo, o günün
hareket satırı ve varsa kilo kaydı, günlük toplam; en sonda seçilen aralığın
ortalamaları ve kilo aralığı (ilk kayıt → son kayıt). Renk kullanma, ekran
arayüzünün hiçbir düğmesi çıktıya girmesin.

---

## 8. Yedekleme

Safari, uzun süre açılmayan sitelerin depolama alanını temizleyebiliyor.
Ana ekrana eklenmiş uygulamalarda risk azalıyor ama sıfırlanmıyor. Bu yüzden:

- **Dışa aktar:** tüm veritabanını tek bir `.json` dosyası olarak indirir.
- **İçe aktar:** dosyayı okur, mevcut veriyle birleştirir (aynı gün varsa üzerine yazmadan önce sorar).
- Kurulumdan sonraki ilk açılışta ve her 30 günde bir yedek hatırlatması göster.

---

## 9. Görsel dil

Prototipten devam. Renkler:

```
paper  #F4F5F1    zemin
card   #FFFFFF    kart
ink    #171C19    metin, birincil düğme
muted  #6B736E    ikincil metin
line   #DDE0D9    çizgi ve kenarlık
carb   #C08A2E    karbonhidrat
prot   #2E6A57    protein
fat    #8C5A6E    yağ
```

Yazı tipleri: sayılar ve başlıklar **Fraunces**, arayüz metni **Archivo**.
İkisi de Latin Extended desteklediği için Türkçe karakterlerde sorun çıkarmaz.
Yazı tiplerini repoya indir ve yerelden sun — CDN'den çekersen çevrimdışı
açılışta arayüz bozulur.

Kurallar:

- Rakamlar tablo hizalı (`font-variant-numeric: tabular-nums`).
- Dokunulabilir her öğe en az 44×44 px.
- Tasarım telefon için; geniş ekranda içerik 460 px'te ortalanır.
- Klavye odağı görünür olsun.
- `prefers-reduced-motion` ayarına uy.

**Dil tonu.** Kullanıcıyı yargılayan hiçbir ifade kullanma. "Hedefi aştın",
"fazla", "çok yağlı" gibi kelimeler yok. Sayılar konuşur, uygulama yorum yapmaz.
Boş ekran davet eder, uyarmaz.

---

## 10. PWA gereksinimleri

- `display: "standalone"`, `orientation: "portrait"`, `lang: "tr"`
- 180×180 `apple-touch-icon`, 192 ve 512 px manifest ikonları
- `theme-color` = `#F4F5F1`
- Service worker: uygulama kabuğu ve yazı tipleri önbellekte; OFF istekleri
  ağ öncelikli, başarısızlıkta önbellekten
- Bildirim, konum, kamera izni istenmeyecek (barkod ileride gelirse kamera o zaman)
- HTTPS zorunlu — yerel geliştirmede `vite --host` ile telefondan test et

---

## 11. Yol haritası

**v0.1 — kendi telefonum.** Gün görünümü, yerel tablo araması, elle giriş,
miktar hesabı, kilo kaydı, IndexedDB, dışa/içe aktarma. OFF yok, hareket yok,
PDF yok. Hedef: bir hafta kesintisiz kullanabilmek.

**v0.2 — veri.** Open Food Facts araması ve önbellek. Türk yemekleri tablosu
300 kaleme çıkar. Hareket tablosu ve MET hesabı. Sık kullanılanlar.

**v0.3 — paylaşılabilir.** PDF çıktısı, geçmiş görünümü, yedek hatırlatması,
gizlilik metni. Netlify veya Vercel'e yayın. Ana ekrana ekleme yönergesi içeren
kısa bir karşılama ekranı.

**v0.4 — sonrası.** Barkod okuma. Native paketleme (Capacitor) ihtiyaç
belirirse değerlendirilir; App Store'a bireysel hesapla sağlık uygulaması
konulamadığı için bu yol şimdilik kapalı.

---

## 12. Yayına çıkmadan önce

- Gizlilik metni: verinin cihazda kaldığı, OFF dışında hiçbir yere istek
  gitmediği, geliştiricinin kayıtlara erişemediği açıkça yazılı olmalı.
- Uygulama içinde görünür bir not: bu bir günlük tutma aracıdır, tıbbi tavsiye
  vermez, beslenme değişikliği öncesi hekime danışılmalıdır.
- Open Food Facts ODbL atfı.
- Yazı tipi lisansları (ikisi de SIL Open Font License, repoda `LICENSE` ile birlikte gelsin).

---

## 13. Açık konular

- Türk yemekleri tablosunun ilk 50 kalemi kim tarafından, hangi kaynaktan
  doldurulacak? (TÜBER'in makine okunur dağıtımı kontrol edilecek.)
- Yemek tarifi / karışık tabak nasıl ele alınacak — bileşen bileşen mi,
  tek kalem mi?
- Su takibi eklenecek mi? (Kapsam dışı tutuldu, ama en sık istenen şey olabilir.)
- Hareket tablosunun kalemleri Compendium of Physical Activities'ten mi
  alınacak, yoksa 30–40 kalemlik sadeleştirilmiş bir Türkçe liste mi yazılacak?
- Kilo grafiğinde tartı dalgalanmasını yumuşatmak için 7 günlük hareketli
  ortalama gösterilsin mi? (Gösterilirse ham noktalar da görünür kalmalı.)

---

## 14. v0.1 uygulama notları

Bu bölüm, v0.1'in gerçek kod tabanında nasıl karşılığını bulduğunu anlatır.
Yol haritası (§11) neyin yapılacağını söyler; burası neyin nasıl yapıldığını.

- Proje `npm create vite@latest . -- --template react` temeliyle kuruldu,
  TypeScript eklenmedi.
- `src/db/db.js`, `idb` paketiyle `diyet` veritabanını (sürüm 1) açar ve
  §4'teki dört depoyu (`gunler`, `yiyecekler`, `favoriler`, `ayarlar`) kurar.
  İlk açılışta `src/veri/turk-yemekleri.json` içeriği `yiyecekler` deposuna
  yüklenir.
- `hareketler` deposu ve MET hesaplaması v0.2'ye bırakıldı; v0.1'de hareket
  girişi yok, bu yüzden depo şeması hazır ama kullanılmıyor.
- Arama tek katmanlı: yalnızca yerel tablo. OFF çağrısı v0.1'de yok, bu yüzden
  arama ekranında "Ambalajlı ürünlerde ara" bölümü gösterilmiyor.
- PDF ve geçmiş (son 30 gün grafiği) ekranı yok; gün görünümünde yalnızca
  ‹ › okları ile gün gün gezinme var.
- Yazı tipleri (Fraunces, Archivo) `public/fonts/` altında yerelden sunuluyor;
  `@font-face` `src/styles.css` içinde tanımlı.
- PWA temel kurulumu (`vite-plugin-pwa`, manifest, uygulama kabuğu önbelleği)
  v0.1'de var, çünkü offline çalışma projenin temel mimari kararı — v0.2/v0.3
  ile ilgili olan kısım yalnızca OFF ağ-öncelikli önbellek stratejisi.
- Türk yemekleri tablosu 50 kalemle başladı; TÜBER/TürKomp'un genel yayınlanmış
  değerlerine yakın, makul yuvarlanmış tahminlerdir — resmi tablo ile birebir
  doğrulanmadı. §13'teki açık konu hâlâ açık: kaynak birebir teyit edilmeli.
- **Yayın kararı değişikliği:** §11'de yayına çıkma v0.3'e planlanmıştı, ama
  v0.1'i kendi telefonundan kalıcı olarak kullanabilmek için GitHub Pages
  yayını öne çekildi. `main`'e her push'ta `.github/workflows/deploy-pages.yml`
  projeyi derleyip `https://<kullanıcı-adı>.github.io/<repo-adı>/` adresine
  yayınlıyor (bir kerelik Settings → Pages → Source: "GitHub Actions" ayarı
  gerekir). Bu adres GitHub'ın herkese açık statik dosya sunucusu; sunucu
  yalnızca HTML/JS/CSS dosyalarını sunuyor, kullanıcı verisi (yemek kayıtları,
  kilo) yine tamamen tarayıcının IndexedDB'sinde kalıyor — §2'deki gizlilik
  mimarisi bozulmuyor. Bu yüzden `vite.config.js`'te derleme sırasında
  `base`, CI'nın geçtiği `PAGES_BASE` ortam değişkeninden (repo adından
  üretilir) okunuyor — repo yeniden adlandırılsa bile elle güncelleme
  gerekmiyor; yerel derlemede (`PAGES_BASE` tanımsızken) kök `/` kalıyor.
  Yazı tipleri de `public/fonts/`'tan `src/fonts/`'a taşındı ki Vite onları
  modül grafiğinin parçası olarak hash'leyip bu alt dizine göre doğru
  yollarla derlesin — `public/` içindeki dosyalar ham kopyalandığı için
  alt dizin öneki almıyordu.
  (Not: repo bu sırada `YZ_CODE`'dan `DIYET_TAKIP`'e yeniden adlandırıldı;
  ilk sürümde sabit kodlanan `/YZ_CODE/` yolu bu yüzden düzeltildi.)
