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
      { subject: 'Türkçe', books: ['345 Türkçe', '3D Türkçe', 'Palme TYT Türkçe', 'Limit TYT Türkçe', 'Bilgi Sarmal TYT Türkçe', 'Tonguç TYT Türkçe'] },
      { subject: 'Matematik', books: ['345 Matematik', '3D TYT Matematik', 'Palme TYT Matematik', 'Limit TYT Matematik', 'Karekök TYT Matematik', 'Tonguç TYT Matematik', 'Acil TYT Matematik'] },
      { subject: 'Geometri', books: ['345 Geometri', '3D TYT Geometri', 'Palme TYT Geometri', 'Karekök TYT Geometri', 'Tonguç TYT Geometri'] },
      { subject: 'Fizik', books: ['345 Fizik', '3D TYT Fizik', 'Palme TYT Fizik', 'Bilgi Sarmal TYT Fizik', 'Tonguç TYT Fizik'] },
      { subject: 'Kimya', books: ['345 Kimya', '3D TYT Kimya', 'Palme TYT Kimya', 'Bilgi Sarmal TYT Kimya', 'Tonguç TYT Kimya'] },
      { subject: 'Biyoloji', books: ['345 Biyoloji', '3D TYT Biyoloji', 'Palme TYT Biyoloji', 'Bilgi Sarmal TYT Biyoloji', 'Tonguç TYT Biyoloji'] },
      { subject: 'Tarih', books: ['345 Tarih', '3D TYT Tarih', 'Palme TYT Tarih', 'Tonguç TYT Tarih'] },
      { subject: 'Coğrafya', books: ['345 Coğrafya', '3D TYT Coğrafya', 'Palme TYT Coğrafya', 'Tonguç TYT Coğrafya'] },
      { subject: 'Felsefe', books: ['345 Felsefe', '3D TYT Felsefe', 'Palme TYT Felsefe', 'Tonguç TYT Felsefe'] },
      { subject: 'Din Kültürü', books: ['345 Din Kültürü', '3D TYT Din Kültürü', 'Palme TYT Din Kültürü'] },
    ],
  },
  {
    exam_type: 'AYT',
    subjects: [
      { subject: 'Edebiyat', books: ['3D AYT Edebiyat', 'Palme AYT Edebiyat', 'Limit AYT Edebiyat', 'Bilgi Sarmal AYT Edebiyat'] },
      { subject: 'Matematik', books: ['3D AYT Matematik', 'Palme AYT Matematik', 'Limit AYT Matematik', 'Karekök AYT Matematik', 'Acil AYT Matematik', 'Tonguç AYT Matematik'] },
      { subject: 'Geometri', books: ['3D AYT Geometri', 'Palme AYT Geometri', 'Karekök AYT Geometri'] },
      { subject: 'Fizik', books: ['3D AYT Fizik', 'Palme AYT Fizik', 'Bilgi Sarmal AYT Fizik', 'Apotemi AYT Fizik'] },
      { subject: 'Kimya', books: ['3D AYT Kimya', 'Palme AYT Kimya', 'Bilgi Sarmal AYT Kimya', 'Apotemi AYT Kimya'] },
      { subject: 'Biyoloji', books: ['3D AYT Biyoloji', 'Palme AYT Biyoloji', 'Bilgi Sarmal AYT Biyoloji'] },
      { subject: 'Tarih', books: ['3D AYT Tarih', 'Palme AYT Tarih', 'Tonguç AYT Tarih'] },
      { subject: 'Coğrafya', books: ['3D AYT Coğrafya', 'Palme AYT Coğrafya'] },
      { subject: 'Felsefe Grubu', books: ['3D AYT Felsefe Grubu', 'Palme AYT Felsefe Grubu'] },
      { subject: 'Din Kültürü', books: ['3D AYT Din Kültürü', 'Palme AYT Din Kültürü'] },
    ],
  },
];
