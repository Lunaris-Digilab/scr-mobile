import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Switch,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Sun, Moon, ChevronUp, ChevronDown } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import {
  getReminderSettings,
  upsertReminderSetting,
  syncReminderNotification,
  subscribeToReminderChanges,
  unsubscribeFromReminderChanges,
  type ReminderSetting,
} from '../lib/reminder-settings';
import { requestNotificationPermission } from '../lib/notifications';
import { Colors } from '../constants/Colors';
import { useLanguage } from '../context/LanguageContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

const DEFAULT_AM: Omit<ReminderSetting, 'id' | 'user_id'> = {
  routine_type: 'AM',
  enabled: false,
  hour: 8,
  minute: 0,
};

const DEFAULT_PM: Omit<ReminderSetting, 'id' | 'user_id'> = {
  routine_type: 'PM',
  enabled: false,
  hour: 21,
  minute: 0,
};

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

export default function ReminderSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [am, setAm] = useState(DEFAULT_AM);
  const [pm, setPm] = useState(DEFAULT_PM);

  const reminderTitle = useCallback(
    (type: 'AM' | 'PM') =>
      type === 'AM' ? t('reminderMorningTitle') : t('reminderEveningTitle'),
    [t]
  );
  const reminderBody = useCallback(
    (type: 'AM' | 'PM') =>
      type === 'AM' ? t('reminderMorningBody') : t('reminderEveningBody'),
    [t]
  );

  // Verileri yükle
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);

      try {
        const settings = await getReminderSettings(user.id);
        const amRow = settings.find((s) => s.routine_type === 'AM');
        const pmRow = settings.find((s) => s.routine_type === 'PM');
        if (amRow) setAm({ routine_type: 'AM', enabled: amRow.enabled, hour: amRow.hour, minute: amRow.minute });
        if (pmRow) setPm({ routine_type: 'PM', enabled: pmRow.enabled, hour: pmRow.hour, minute: pmRow.minute });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }

      // Realtime: başka cihazdan değiştirilirse güncelle
      channel = subscribeToReminderChanges(user.id, (row) => {
        if (row.routine_type === 'AM')
          setAm({ routine_type: 'AM', enabled: row.enabled, hour: row.hour, minute: row.minute });
        else
          setPm({ routine_type: 'PM', enabled: row.enabled, hour: row.hour, minute: row.minute });
      });
    })();

    return () => {
      if (channel) unsubscribeFromReminderChanges(channel);
    };
  }, [router]);

  const save = useCallback(
    async (
      type: 'AM' | 'PM',
      enabled: boolean,
      hour: number,
      minute: number
    ) => {
      if (!userId) return;
      setSaving(true);
      try {
        const setting = await upsertReminderSetting(userId, type, enabled, hour, minute);
        await syncReminderNotification(
          setting,
          reminderTitle(type),
          reminderBody(type)
        );
      } catch (e) {
        console.error(e);
        Alert.alert(t('error'), t('reminderSaveFailed'));
      } finally {
        setSaving(false);
      }
    },
    [userId, reminderTitle, reminderBody, t]
  );

  const handleToggle = useCallback(
    async (type: 'AM' | 'PM', enabled: boolean) => {
      if (enabled) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          Alert.alert(t('reminderPermissionTitle'), t('reminderPermissionMsg'));
          return;
        }
      }
      const cur = type === 'AM' ? am : pm;
      const updated = { ...cur, enabled };
      if (type === 'AM') setAm(updated);
      else setPm(updated);
      await save(type, enabled, cur.hour, cur.minute);
    },
    [am, pm, save, t]
  );

  const adjustTime = useCallback(
    async (type: 'AM' | 'PM', field: 'hour' | 'minute', delta: number) => {
      const cur = type === 'AM' ? { ...am } : { ...pm };
      if (field === 'hour') {
        cur.hour = (cur.hour + delta + 24) % 24;
      } else {
        cur.minute = (cur.minute + delta + 60) % 60;
      }
      if (type === 'AM') setAm(cur);
      else setPm(cur);
      if (cur.enabled) {
        await save(type, cur.enabled, cur.hour, cur.minute);
      }
    },
    [am, pm, save]
  );

  const renderCard = (
    type: 'AM' | 'PM',
    state: typeof am,
    Icon: typeof Sun
  ) => {
    const label = type === 'AM' ? t('routineMorning') : t('routineEvening');
    return (
      <View style={styles.card} key={type}>
        <View style={styles.cardHeader}>
          <Icon size={22} color={state.enabled ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.cardTitle, state.enabled && styles.cardTitleActive]}>
            {label}
          </Text>
          <Switch
            value={state.enabled}
            onValueChange={(v) => handleToggle(type, v)}
            trackColor={{ false: Colors.lightGray, true: Colors.medium }}
            thumbColor={Colors.white}
            disabled={saving}
          />
        </View>

        <View style={[styles.timeRow, !state.enabled && styles.timeRowDisabled]}>
          {/* Saat */}
          <View style={styles.timeUnit}>
            <Pressable
              style={styles.timeBtn}
              onPress={() => adjustTime(type, 'hour', 1)}
              disabled={!state.enabled || saving}
            >
              <ChevronUp size={20} color={state.enabled ? Colors.text : Colors.lightGray} />
            </Pressable>
            <Text style={[styles.timeDigit, !state.enabled && styles.timeDigitDisabled]}>
              {pad(state.hour)}
            </Text>
            <Pressable
              style={styles.timeBtn}
              onPress={() => adjustTime(type, 'hour', -1)}
              disabled={!state.enabled || saving}
            >
              <ChevronDown size={20} color={state.enabled ? Colors.text : Colors.lightGray} />
            </Pressable>
          </View>

          <Text style={[styles.timeSeparator, !state.enabled && styles.timeDigitDisabled]}>:</Text>

          {/* Dakika */}
          <View style={styles.timeUnit}>
            <Pressable
              style={styles.timeBtn}
              onPress={() => adjustTime(type, 'minute', 5)}
              disabled={!state.enabled || saving}
            >
              <ChevronUp size={20} color={state.enabled ? Colors.text : Colors.lightGray} />
            </Pressable>
            <Text style={[styles.timeDigit, !state.enabled && styles.timeDigitDisabled]}>
              {pad(state.minute)}
            </Text>
            <Pressable
              style={styles.timeBtn}
              onPress={() => adjustTime(type, 'minute', -5)}
              disabled={!state.enabled || saving}
            >
              <ChevronDown size={20} color={state.enabled ? Colors.text : Colors.lightGray} />
            </Pressable>
          </View>
        </View>

        {state.enabled && (
          <Text style={styles.cardHint}>
            {t('reminderScheduledAt')} {formatTime(state.hour, state.minute)}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Bell size={24} color={Colors.primary} />
          <Text style={styles.title}>{t('reminderTitle')}</Text>
        </View>
        <Text style={styles.subtitle}>{t('reminderSubtitle')}</Text>

        {renderCard('AM', am, Sun)}
        {renderCard('PM', pm, Moon)}

        {saving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.savingText}>{t('save')}...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  cardTitleActive: {
    color: Colors.text,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeRowDisabled: {
    opacity: 0.35,
  },
  timeUnit: {
    alignItems: 'center',
    gap: 2,
  },
  timeBtn: {
    padding: 8,
  },
  timeDigit: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 72,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timeDigitDisabled: {
    color: Colors.lightGray,
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 4,
    lineHeight: 56,
  },
  cardHint: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  savingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
