import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Bildirim geldiğinde uygulama açıkken gösterilsin
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Bildirim izni iste, izin verilmişse true döner. */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Belirli bir saat için günlük tekrarlayan bildirim zamanlar.
 * @param id Benzersiz tanımlayıcı (örn. "reminder-AM")
 * @param hour 0-23
 * @param minute 0-59
 * @param title Bildirim başlığı
 * @param body Bildirim içeriği
 */
export async function scheduleDailyReminder(
  id: string,
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<void> {
  // Aynı id ile önceki bildirimi iptal et
  await cancelReminder(id);

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/** Belirli bir id'deki zamanlanmış bildirimi iptal et. */
export async function cancelReminder(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/** Tüm zamanlanmış bildirimleri iptal et. */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
