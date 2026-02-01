/**
 * Raf ürünü için badge metni ve rengi (süre dolumu / açılış tarihi).
 */
export function getShelfBadge(
  expirationDate: string | null,
  dateOpened: string | null,
  status: string
): { text: string; isWarning: boolean } {
  const now = new Date();

  if (expirationDate) {
    const exp = new Date(expirationDate);
    if (exp < now) {
      return { text: 'Süresi doldu', isWarning: true };
    }
    const monthsLeft = Math.round(
      (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const weeksLeft = Math.round(
      (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );
    if (monthsLeft >= 1) {
      return {
        text: `${monthsLeft} ay`,
        isWarning: monthsLeft <= 2,
      };
    }
    if (weeksLeft >= 1) {
      return {
        text: `${weeksLeft} hafta`,
        isWarning: true,
      };
    }
    return { text: 'Yakında biter', isWarning: true };
  }

  if (dateOpened) {
    const opened = new Date(dateOpened);
    const daysAgo = Math.floor(
      (now.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysAgo === 0) return { text: 'Bugün eklendi', isWarning: false };
    if (daysAgo === 1) return { text: '1 gün önce', isWarning: false };
    if (daysAgo < 30) return { text: `${daysAgo} gün önce`, isWarning: false };
    const monthsAgo = Math.floor(daysAgo / 30);
    return { text: `${monthsAgo} ay önce`, isWarning: false };
  }

  if (status === 'wishlist') {
    return { text: 'İstek listesi', isWarning: false };
  }
  if (status === 'empty') {
    return { text: 'Bitti', isWarning: false };
  }

  return { text: 'Rafımda', isWarning: false };
}
