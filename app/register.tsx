import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { supabase } from '../lib/supabase';
import { saveSkinProfileToAuth } from '../lib/users';
import { getSkinProfile, clearSkinProfile } from '../lib/onboarding';
import { Colors } from '../constants/Colors';
import { useLanguage } from '../context/LanguageContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('error'), t('passwordsDontMatch'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('error'), t('passwordMinLength'));
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      const is503 = String(error.message || '').includes('503') || (error as { status?: number }).status === 503;
      Alert.alert(t('error'), is503 ? t('serverUnavailable') : error.message);
      return;
    }
    if (data.user && !data.session) {
      Alert.alert(
        t('emailVerification'),
        t('registerSuccessVerify')
      );
      router.replace('/login');
      return;
    }
    if (data.session && data.user) {
      const profile = await getSkinProfile();
      await saveSkinProfileToAuth({
        skin_type: profile?.skin_type ?? null,
        skin_concerns: profile?.skin_concerns ?? [],
      });
      await clearSkinProfile();
      router.replace('/');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder={t('email')}
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder={t('passwordPlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder={t('confirmPassword')}
          placeholderTextColor={Colors.textSecondary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!loading}
        />
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.buttonText} />
          ) : (
            <Text style={styles.buttonText}>{t('register')}</Text>
          )}
        </Pressable>
        <Link href="/login" asChild>
          <Pressable style={styles.link} disabled={loading}>
            <Text style={styles.linkText}>
              {t('haveAccount')}<Text style={styles.linkBold}>{t('loginLink')}</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    padding: 14,
    color: Colors.text,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.buttonBackground,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: Colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  linkBold: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
