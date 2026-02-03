import type { TranslationKey } from '../constants/translations';

type Translate = (key: TranslationKey) => string;

/**
 * Raf ürünü için badge metni ve rengi (süre dolumu / açılış tarihi).
 * t: dil çeviri fonksiyonu (useLanguage().t)
 */
export function getShelfBadge(
  t: Translate,
  expirationDate: string | null,
  dateOpened: string | null,
  status: string
): { text: string; isWarning: boolean } {
  const now = new Date();

  if (expirationDate) {
    const exp = new Date(expirationDate);
    if (exp < now) {
      return { text: t('shelfBadge_expired'), isWarning: true };
    }
    const monthsLeft = Math.round(
      (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    const weeksLeft = Math.round(
      (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );
    if (monthsLeft >= 1) {
      return {
        text: `${monthsLeft} ${t('shelfBadge_month')}`,
        isWarning: monthsLeft <= 2,
      };
    }
    if (weeksLeft >= 1) {
      return {
        text: `${weeksLeft} ${t('shelfBadge_week')}`,
        isWarning: true,
      };
    }
    return { text: t('shelfBadge_endingSoon'), isWarning: true };
  }

  if (dateOpened) {
    const opened = new Date(dateOpened);
    const daysAgo = Math.floor(
      (now.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysAgo === 0) return { text: t('shelfBadge_addedToday'), isWarning: false };
    if (daysAgo === 1) return { text: t('shelfBadge_dayAgo'), isWarning: false };
    if (daysAgo < 30) return { text: `${daysAgo} ${t('shelfBadge_daysAgo')}`, isWarning: false };
    const monthsAgo = Math.floor(daysAgo / 30);
    const monthKey = monthsAgo === 1 ? 'shelfBadge_monthAgo' : 'shelfBadge_monthsAgo';
    return { text: `${monthsAgo} ${t(monthKey)}`, isWarning: false };
  }

  if (status === 'wishlist') {
    return { text: t('shelfBadge_wishlist'), isWarning: false };
  }
  if (status === 'empty') {
    return { text: t('shelfBadge_finished'), isWarning: false };
  }

  return { text: t('shelfBadge_onShelf'), isWarning: false };
}
