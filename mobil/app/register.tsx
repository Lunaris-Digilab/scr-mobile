import { useState, useMemo } from 'react';
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
import { signInWithGoogle, isGoogleSignInAvailable } from '../lib/google-auth';
import GoogleIcon from '../components/GoogleIcon';
import { Colors } from '../constants/Colors';
import { useLanguage } from '../context/LanguageContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleAvailable = useMemo(() => isGoogleSignInAvailable(), []);

  const isLoading = loading || googleLoading;

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

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);

    if (result.success) {
      // Yeni kullanıcıysa onboarding cilt profilini kaydet
      if (result.isNewUser) {
        const profile = await getSkinProfile();
        await saveSkinProfileToAuth({
          skin_type: profile?.skin_type ?? null,
          skin_concerns: profile?.skin_concerns ?? [],
        });
        await clearSkinProfile();
      }
      router.replace('/');
    } else if (!result.cancelled) {
      Alert.alert(t('registerError'), result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.form}>
        <View style={styles.titleWrap}>
          <Text style={styles.badge}>{t('register')}</Text>
          <Text style={styles.title}>{t('register')}</Text>
        </View>

        <View style={styles.card}>
          {/* Google ile kayıt butonu — sadece native build'de göster */}
          {googleAvailable && (
            <>
              <Pressable
                style={[styles.googleButton, isLoading && styles.buttonDisabled]}
                onPress={handleGoogleRegister}
                disabled={isLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <>
                    <View style={styles.googleIcon}>
                      <GoogleIcon size={20} />
                    </View>
                    <Text style={styles.googleButtonText}>
                      {t('continueWithGoogle')}
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Ayırıcı */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('or')}</Text>
                <View style={styles.dividerLine} />
              </View>
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder={t('email')}
            placeholderTextColor={Colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
          <TextInput
            style={styles.input}
            placeholder={t('passwordPlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />
          <TextInput
            style={styles.input}
            placeholder={t('confirmPassword')}
            placeholderTextColor={Colors.textSecondary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!isLoading}
          />
          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.buttonText} />
            ) : (
              <Text style={styles.buttonText}>{t('register')}</Text>
            )}
          </Pressable>
          <Link href="/login" asChild>
            <Pressable style={styles.link} disabled={isLoading}>
              <Text style={styles.linkText}>
                {t('haveAccount')}<Text style={styles.linkBold}>{t('loginLink')}</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
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
  titleWrap: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light,
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
    overflow: 'hidden',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#8f5c74',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginHorizontal: 12,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 14,
    padding: 14,
    color: Colors.text,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: Colors.buttonBackground,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
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
    marginTop: 18,
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
