import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { Colors } from '../constants/Colors';
import { LOCALE_OPTIONS, type Locale } from '../constants/translations';

export default function LanguageScreen() {
  const router = useRouter();
  const { setLocale, t } = useLanguage();

  const handleSelect = async (locale: Locale) => {
    await setLocale(locale);
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('selectLanguage')}</Text>
      <View style={styles.options}>
        {LOCALE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={styles.option}
            onPress={() => handleSelect(opt.value)}
          >
            <Text style={styles.optionNative}>{opt.nativeLabel}</Text>
            <Text style={styles.optionEnglish}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 32,
  },
  options: {
    gap: 12,
  },
  option: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  optionNative: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  optionEnglish: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
