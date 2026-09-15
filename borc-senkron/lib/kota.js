// GitHub istek hakkı (kota) kararları. SAF: test edilebilir.
// 2026-09-15 ölçümü: ilk toplu doldurmada (150+ kayıt) saatlik hak iki projede bitti; görevli kırmızı hata verip
// e-posta attırdı. Hak bitmesi arıza değildir: iş kaldığı yerden sonraki turda tamamlanır.
'use strict';

// Tur başına ayrılan pay: bu kadar hak kalınca yeni işe başlanmaz (aynı hakkı paylaşan diğer projeler + yerel gh için)
const RESERVE = 500;
// Hak bu kadar işlemde bir yeniden ölçülür (rate_limit sorgusu hak harcamaz)
const CHECK_EVERY = 5;

const RATE_LIMIT_RE = /rate limit|secondary rate|abuse detection/i;
const isRateLimitError = (message) => RATE_LIMIT_RE.test(String(message || ''));

// remaining: ölçülen en düşük kalan hak (null = ölçülemedi → devam, hata olursa isRateLimitError yakalar)
function shouldPause(remaining, reserve = RESERVE) {
  return typeof remaining === 'number' && remaining < reserve;
}

function pauseMessage({ remaining, resetAt, done, left }) {
  const saat = resetAt ? new Date(resetAt).toISOString().slice(11, 16) : '?';
  const kalan = typeof remaining === 'number' ? `kalan hak ${remaining}` : 'hak sınırına takıldı';
  return `⏸ GitHub istek hakkı azaldı (${kalan}, yenilenme ${saat} UTC). ${done} işlem yapıldı, ${left} işlem sonraki tura kaldı — arıza değil, kaldığı yerden devam edilecek.`;
}

module.exports = { RESERVE, CHECK_EVERY, isRateLimitError, shouldPause, pauseMessage };
