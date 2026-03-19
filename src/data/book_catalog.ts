export interface BookEntry {
  subject: string;
  books: string[];
}

export interface BookCatalog {
  exam_type: string;
  subjects: BookEntry[];
}

export const bookCatalog: BookCatalog[] = [
  {
    exam_type: 'TYT',
    subjects: [
      {
        subject: 'Matematik',
        books: [
          '345 Yayınları TYT Matematik Soru Bankası',
          'Bilgi Sarmal TYT Matematik Soru Bankası',
          'Eyüp B. TYT Matematik Video Ders Defteri',
          'Orijinal Yayınları TYT Matematik Soru Bankası',
          'Acil Yayınları TYT Matematik Soru Bankası',
          'Mert Hoca TYT Matematik Video Ders Kitabı',
          'Apotemi TYT Problemler Fasikülü',
          'Karekök TYT Matematik Soru Bankası',
          'Metin Yayınları TYT Matematik Soru Bankası',
          'Çap Yayınları TYT Matematik Fasikülleri',
        ],
      },
      {
        subject: 'Türkçe',
        books: [
          'Bilgi Sarmal TYT Türkçe Soru Bankası',
          '345 Yayınları TYT Türkçe Soru Bankası',
          'Limit Kronometre TYT Türkçe Soru Bankası',
          'Rüştü Hoca TYT Türkçe Taktiklerle Soru Bankası',
          'Arı Yayınları Paragrafın Ritmi Soru Bankası',
          'Hız ve Renk TYT Türkçe Soru Bankası',
          'Paraf Yayınları TYT Türkçe Soru Bankası',
          'Yayın Denizi PRO TYT Türkçe Soru Bankası',
          'Apotemi TYT Türkçe Paragraf Soru Bankası',
          'Karekök TYT Türkçe Soru Bankası',
        ],
      },
      {
        subject: 'Fizik',
        books: [
          '345 Yayınları TYT Fizik Soru Bankası',
          'Bilgi Sarmal TYT Fizik Soru Bankası',
          'VIP Fizik TYT Video Ders Defteri',
          'Özcan Aykın TYT Fizik Video Ders Notları',
          'Aydın Yayınları TYT Fizik Soru Bankası',
          'Altuğ Güneş TYT Fizik Video Ders Defteri',
          'Nihat Bilgin TYT Fizik Soru Bankası',
          'Palme Yayınları TYT Fizik Soru Bankası',
        ],
      },
      {
        subject: 'Kimya',
        books: [
          'Görkem Şahin TYT Kimya Video Ders Defteri',
          'Aydın Yayınları TYT Kimya Soru Bankası',
          'Orbital Yayınları TYT Kimya Soru Bankası',
          '345 Yayınları TYT Kimya Soru Bankası',
          'Bilgi Sarmal TYT Kimya Soru Bankası',
          'Kimya Adası TYT Kimya Video Ders Notları',
          'Miray Yayınları TYT Kimya Soru Bankası',
          'Palme Yayınları TYT Kimya Soru Bankası',
        ],
      },
      {
        subject: 'Biyoloji',
        books: [
          'Dr. Biyoloji TYT Biyoloji Video Ders Defteri',
          'Selin Hoca TYT Biyoloji Video Ders Notları',
          'Palme Yayınları TYT Biyoloji Soru Bankası',
          'Bilgi Sarmal TYT Biyoloji Soru Bankası',
          'Biosem TYT Biyoloji Video Ders Defteri',
          '345 Yayınları TYT Biyoloji Soru Bankası',
          'Limit Yayınları TYT Biyoloji Soru Bankası',
          'Biyotik Yayınları TYT Biyoloji Soru Bankası',
        ],
      },
      {
        subject: 'Tarih',
        books: [
          'Benim Hocam TYT Tarih Video Ders Defteri (Ramazan Yetgin)',
          'Bilgi Sarmal TYT Tarih Soru Bankası',
          '345 Yayınları TYT Tarih Soru Bankası',
        ],
      },
      {
        subject: 'Coğrafya',
        books: [
          'Benim Hocam TYT Coğrafya Video Ders Defteri (Bayram Meral)',
          'Yavuz Tuna TYT Coğrafya Kamp Kitabı',
          'Bilgi Sarmal TYT Coğrafya Soru Bankası',
        ],
      },
      {
        subject: 'Felsefe',
        books: [
          'Bilgi Sarmal TYT Felsefe Din Soru Bankası',
          '345 Yayınları TYT Felsefe Soru Bankası',
        ],
      },
      {
        subject: 'Geometri',
        books: [
          'Kenan Kara TYT-AYT Geometri Video Ders Defteri',
          'Orijinal Yayınları TYT-AYT Geometri Soru Bankası',
          'Acil Yayınları Geometri Soru Bankası',
          '345 Yayınları TYT-AYT Geometri Soru Bankası',
          'Bilgi Sarmal TYT-AYT Geometri Soru Bankası',
          'Mert Hoca TYT-AYT Geometri Video Ders Kitabı',
          'Birey B Serisi Geometri Soru Bankası',
          'Karekök TYT-AYT Geometri Soru Bankası',
        ],
      },
    ],
  },
  {
    exam_type: 'AYT',
    subjects: [
      {
        subject: 'Matematik',
        books: [
          '345 Yayınları AYT Matematik Soru Bankası',
          'Orijinal Yayınları AYT Matematik Soru Bankası',
          'Eyüp B. AYT Matematik Video Ders Defteri',
          'Bilgi Sarmal AYT Matematik Soru Bankası',
          'Acil Yayınları AYT Matematik Soru Bankası',
          'Apotemi AYT Matematik Fasikülleri (Limit, Türev, İntegral)',
          'Mert Hoca AYT Matematik Video Ders Kitabı',
          'Karekök AYT Matematik Soru Bankası',
        ],
      },
      {
        subject: 'Fizik',
        books: [
          '345 Yayınları AYT Fizik Soru Bankası',
          'VIP Fizik AYT Video Ders Defteri',
          'Bilgi Sarmal AYT Fizik Soru Bankası',
          'Özcan Aykın AYT Fizik Video Ders Notları',
          'Aydın Yayınları AYT Fizik Soru Bankası',
          'Nihat Bilgin AYT Fizik Soru Bankası',
          'Karaağaç Yayınları AYT Fizik Fasikülleri',
          'Palme Yayınları AYT Fizik Soru Bankası',
        ],
      },
      {
        subject: 'Kimya',
        books: [
          'Aydın Yayınları AYT Kimya Soru Bankası',
          'Orbital Yayınları AYT Kimya Soru Bankası',
          'Görkem Şahin AYT Kimya Video Ders Defteri',
          '345 Yayınları AYT Kimya Soru Bankası',
          'Bilgi Sarmal AYT Kimya Soru Bankası',
          'Miray Yayınları AYT Kimya Soru Bankası',
          'Palme Yayınları AYT Kimya Soru Bankası',
          'Kimya Adası AYT Kimya Video Ders Notları',
        ],
      },
      {
        subject: 'Biyoloji',
        books: [
          'Palme Yayınları AYT Biyoloji Soru Bankası',
          'Dr. Biyoloji AYT Biyoloji Video Ders Defteri',
          'Selin Hoca AYT Biyoloji Video Ders Notları',
          'Bilgi Sarmal AYT Biyoloji Soru Bankası',
          '345 Yayınları AYT Biyoloji Soru Bankası',
          'Apotemi AYT Biyoloji Sistemler Fasikülü',
          'Biyotik Yayınları AYT Biyoloji Soru Bankası',
          'Paraf Yayınları AYT Biyoloji Soru Bankası',
        ],
      },
      {
        subject: 'Edebiyat',
        books: [
          'Limit Yayınları AYT Edebiyat Soru Bankası',
          'Benim Hocam AYT Edebiyat Video Ders Defteri (Kadir Gümüş)',
          'Bilgi Sarmal AYT Edebiyat Soru Bankası',
          '345 Yayınları AYT Edebiyat Soru Bankası',
          'Rüştü Hoca AYT Edebiyat Video Ders Notları',
          'Yayın Denizi PRO AYT Edebiyat Soru Bankası',
          'Paraf Yayınları AYT Edebiyat Soru Bankası',
          'Hız ve Renk AYT Edebiyat Soru Bankası',
        ],
      },
      {
        subject: 'Tarih',
        books: [
          'Benim Hocam AYT Tarih Video Ders Defteri (Ramazan Yetgin)',
          'Limit Yayınları AYT Tarih Soru Bankası',
          'Bilgi Sarmal AYT Tarih Soru Bankası',
          '345 Yayınları AYT Tarih Soru Bankası',
          'Hız ve Renk AYT Tarih Soru Bankası',
          'Kara Kutu Yayınları AYT Tarih Soru Bankası',
        ],
      },
      {
        subject: 'Coğrafya',
        books: [
          'Benim Hocam AYT Coğrafya Video Ders Defteri (Bayram Meral)',
          'Yavuz Tuna AYT Coğrafya Kamp Kitabı',
          'Limit Yayınları AYT Coğrafya Soru Bankası',
          'Bilgi Sarmal AYT Coğrafya Soru Bankası',
          'Yayın Denizi PRO AYT Coğrafya Soru Bankası',
        ],
      },
      {
        subject: 'Geometri',
        books: [
          'Kenan Kara TYT-AYT Geometri Video Ders Defteri',
          'Orijinal Yayınları TYT-AYT Geometri Soru Bankası',
          'Acil Yayınları Geometri Soru Bankası',
          '345 Yayınları TYT-AYT Geometri Soru Bankası',
          'Bilgi Sarmal TYT-AYT Geometri Soru Bankası',
          'Mert Hoca TYT-AYT Geometri Video Ders Kitabı',
          'Birey B Serisi Geometri Soru Bankası',
          'Karekök TYT-AYT Geometri Soru Bankası',
        ],
      },
    ],
  },
];
