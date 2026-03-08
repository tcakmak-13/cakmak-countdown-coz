/**
 * YKS Sıralama Tahmin Motoru
 * 2024 ÖSYM Yerleştirme Puanları Yığınsal Dağılımı verisine dayalı
 * Doğrusal Enterpolasyon (Linear Interpolation) ile hassas sıralama tahmini
 */

export interface OsymDataPoint {
  puan: number;
  TYT: number;
  SAYISAL: number;
  SOZEL: number;
  ESIT_AGIRLIK: number;
  DIL: number;
}

export const osymData2024: OsymDataPoint[] = [
  { puan: 550, TYT: 59, SAYISAL: 162, SOZEL: 3, ESIT_AGIRLIK: 5, DIL: 13 },
  { puan: 530, TYT: 3017, SAYISAL: 2271, SOZEL: 31, ESIT_AGIRLIK: 80, DIL: 321 },
  { puan: 510, TYT: 12996, SAYISAL: 7029, SOZEL: 142, ESIT_AGIRLIK: 340, DIL: 1178 },
  { puan: 490, TYT: 29976, SAYISAL: 14673, SOZEL: 476, ESIT_AGIRLIK: 940, DIL: 2695 },
  { puan: 470, TYT: 53253, SAYISAL: 25274, SOZEL: 1292, ESIT_AGIRLIK: 1992, DIL: 5048 },
  { puan: 450, TYT: 82281, SAYISAL: 38578, SOZEL: 3424, ESIT_AGIRLIK: 4269, DIL: 8698 },
  { puan: 430, TYT: 118095, SAYISAL: 54307, SOZEL: 8952, ESIT_AGIRLIK: 11111, DIL: 13904 },
  { puan: 410, TYT: 163769, SAYISAL: 72418, SOZEL: 21706, ESIT_AGIRLIK: 24612, DIL: 20646 },
  { puan: 390, TYT: 223427, SAYISAL: 93485, SOZEL: 45376, ESIT_AGIRLIK: 46809, DIL: 28657 },
  { puan: 370, TYT: 304035, SAYISAL: 118001, SOZEL: 83547, ESIT_AGIRLIK: 79522, DIL: 37488 },
  { puan: 350, TYT: 412255, SAYISAL: 148110, SOZEL: 139921, ESIT_AGIRLIK: 126223, DIL: 47044 },
  { puan: 330, TYT: 560622, SAYISAL: 185681, SOZEL: 219810, ESIT_AGIRLIK: 191807, DIL: 57009 },
  { puan: 310, TYT: 761711, SAYISAL: 234882, SOZEL: 328161, ESIT_AGIRLIK: 287762, DIL: 67510 },
  { puan: 290, TYT: 1017130, SAYISAL: 300531, SOZEL: 471676, ESIT_AGIRLIK: 422338, DIL: 78753 },
  { puan: 270, TYT: 1318668, SAYISAL: 392302, SOZEL: 652313, ESIT_AGIRLIK: 601868, DIL: 90763 },
  { puan: 250, TYT: 1652661, SAYISAL: 531055, SOZEL: 860119, ESIT_AGIRLIK: 831379, DIL: 103810 },
  { puan: 230, TYT: 2011925, SAYISAL: 746123, SOZEL: 1068917, ESIT_AGIRLIK: 1104426, DIL: 118146 },
  { puan: 210, TYT: 2377153, SAYISAL: 1000554, SOZEL: 1247074, ESIT_AGIRLIK: 1385617, DIL: 132929 },
  { puan: 190, TYT: 2662249, SAYISAL: 1208531, SOZEL: 1368579, ESIT_AGIRLIK: 1610447, DIL: 145007 },
  { puan: 170, TYT: 2749663, SAYISAL: 1300183, SOZEL: 1418232, ESIT_AGIRLIK: 1697303, DIL: 151534 },
  { puan: 150, TYT: 2755201, SAYISAL: 1306920, SOZEL: 1423773, ESIT_AGIRLIK: 1703735, DIL: 153501 },
  { puan: 130, TYT: 2755276, SAYISAL: 1307007, SOZEL: 1423849, ESIT_AGIRLIK: 1703833, DIL: 153644 },
  { puan: 115, TYT: 2755277, SAYISAL: 1307007, SOZEL: 1423849, ESIT_AGIRLIK: 1703833, DIL: 153648 },
];

export type ScoreType = 'TYT' | 'SAYISAL' | 'SOZEL' | 'ESIT_AGIRLIK' | 'DIL';

/**
 * Doğrusal Enterpolasyon ile sıralama hesapla
 * Verilen puan ve puan türü için 2024 ÖSYM yığılma tablosundan
 * tam sıralamayı linear interpolation ile bulur.
 */
export function interpolateRanking(score: number, type: ScoreType): number | null {
  const data = osymData2024;

  if (score >= data[0].puan) return data[0][type];
  if (score <= data[data.length - 1].puan) return data[data.length - 1][type];

  for (let i = 0; i < data.length - 1; i++) {
    const upper = data[i];
    const lower = data[i + 1];
    if (score <= upper.puan && score >= lower.puan) {
      const pointDiff = upper.puan - lower.puan;
      const rankDiff = lower[type] - upper[type];
      const scoreOffset = score - lower.puan;
      const exactRank = lower[type] - (rankDiff * (scoreOffset / pointDiff));
      return Math.round(exactRank);
    }
  }
  return null;
}

/** Sıralamayı okunabilir formata çevir */
export function formatRanking(n: number): string {
  if (n <= 0) return '-';
  return n.toLocaleString('tr-TR');
}

/** Kısa format (kartlar için) */
export function formatRankingShort(n: number): string {
  if (n <= 0) return '-';
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 100000) return Math.round(n / 1000).toLocaleString('tr-TR') + 'K';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString('tr-TR');
}
