import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { setOnboardingDone, setSkinProfile } from '../lib/onboarding';
import { getTranslation } from '../constants/translations';
import type { TranslationKey } from '../constants/translations';
import { Colors } from '../constants/Colors';
import {
  Sparkles,
  Check,
  Droplets,
  Flame,
  Sun,
  Heart,
  Mail,
  ChevronRight,
} from 'lucide-react-native';

const SKIN_CONCERN_KEYS = [
  'onboardingConcernAcne',
  'onboardingConcernLines',
  'onboardingConcernSensitivity',
  'onboardingConcernRedness',
  'onboardingConcernDryness',
  'onboardingConcernOily',
  'onboardingConcernPigmentation',
  'onboardingConcernGeneral',
] as const;

const CONCERN_ICONS = [
  Droplets,
  Sparkles,
  Flame,
  Flame,
  Droplets,
  Sun,
  Sparkles,
  Heart,
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [selectedConcerns, setSelectedConcerns] = useState<Set<number>>(new Set());

  const toggleConcern = (index: number) => {
    setSelectedConcerns((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleLetsGo = () => setStep(2);

  const handleNext = () => setStep(3);

  const handleContinueEmail = async () => {
    const skin_concerns = Array.from(selectedConcerns)
      .sort((a, b) => a - b)
      .map((i) => getTranslation('en', SKIN_CONCERN_KEYS[i] as TranslationKey));
    await setSkinProfile({ skin_type: null, skin_concerns });
    await setOnboardingDone();
    router.replace('/register');
  };

  const handleSignIn = async () => {
    await setOnboardingDone();
    router.replace('/login');
  };

  // Step 1: Welcome
  if (step === 1) {
    return (
      <View style={[styles.step1Container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.step1Gradient}>
          <View style={styles.step1GradientTop} />
          <View style={styles.step1GradientBottom} />
        </View>
        <View style={styles.step1Content}>
          <View style={styles.step1Illustration}>
            <View style={styles.step1Circle}>
              <Sparkles size={64} color={Colors.white} />
            </View>
          </View>
          <Text style={styles.step1Title1}>{t('onboardingWelcomeTitle1')}</Text>
          <Text style={styles.step1Title2}>{t('onboardingWelcomeTitle2')}</Text>
          <Pressable style={styles.step1Button} onPress={handleLetsGo}>
            <Text style={styles.step1ButtonText}>{t('onboardingLetsGo')}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.step1SignInWrap} onPress={handleSignIn}>
          <Text style={styles.step1SignInText}>
            {t('onboardingExistingUser')}
            <Text style={styles.step1SignInLink}> {t('onboardingSignIn')}</Text>
          </Text>
        </Pressable>
      </View>
    );
  }

  // Step 2: Skin profile
  if (step === 2) {
    return (
      <View style={[styles.step2Container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ScrollView
          style={styles.step2Scroll}
          contentContainerStyle={styles.step2ScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.step2Title}>{t('onboardingSkinFocus')}</Text>
          <View style={styles.step2List}>
            {SKIN_CONCERN_KEYS.map((key, index) => {
              const Icon = CONCERN_ICONS[index];
              const selected = selectedConcerns.has(index);
              return (
                <Pressable
                  key={key}
                  style={[styles.step2Item, selected && styles.step2ItemSelected]}
                  onPress={() => toggleConcern(index)}
                >
                  <Icon size={22} color={selected ? Colors.white : Colors.textSecondary} />
                  <Text style={[styles.step2ItemText, selected && styles.step2ItemTextSelected]}>
                    {t(key)}
                  </Text>
                  <View style={[styles.step2Check, selected && styles.step2CheckSelected]}>
                    {selected ? <Check size={14} color={Colors.white} strokeWidth={3} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={styles.step2NextButton} onPress={handleNext}>
            <Text style={styles.step2NextText}>{t('next')}</Text>
            <ChevronRight size={20} color={Colors.white} />
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // Step 3: Save progress / Sign up redirect
  return (
    <View style={[styles.step3Container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.step3Gradient}>
        <View style={styles.step3GradientTop} />
        <View style={styles.step3GradientBottom} />
      </View>
      <Pressable style={styles.step3ExistingWrap} onPress={handleSignIn}>
        <Text style={styles.step3ExistingText}>
          {t('onboardingExistingUser')}
          <Text style={styles.step3ExistingLink}> {t('onboardingSignIn')}</Text>
        </Text>
      </Pressable>
      <View style={styles.step3Content}>
        <View style={styles.step3Illustration}>
          <View style={styles.step3Circle}>
            <Mail size={56} color={Colors.white} />
          </View>
        </View>
        <Text style={styles.step3Title}>{t('onboardingSaveProgress')}</Text>
        <View style={styles.step3Buttons}>
          <Pressable style={styles.step3ButtonEmail} onPress={handleContinueEmail}>
            <Mail size={20} color={Colors.text} />
            <Text style={styles.step3ButtonEmailText}>{t('onboardingContinueEmail')}</Text>
          </Pressable>
        </View>
        <Text style={styles.step3Terms}>
          {t('onboardingTerms')}
          <Text style={styles.step3TermsLink}>{t('onboardingTermsLink')}</Text>
          {t('onboardingAnd')}
          <Text style={styles.step3TermsLink}>{t('onboardingPrivacyLink')}</Text>
          {t('onboardingTermsSuffix')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  step1Container: {
    flex: 1,
    backgroundColor: Colors.medium,
  },
  step1Gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  step1GradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: Colors.medium,
  },
  step1GradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: Colors.dark,
  },
  step1Content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step1Illustration: {
    marginBottom: 32,
  },
  step1Circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step1Title1: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  step1Title2: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 40,
  },
  step1Button: {
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 28,
    minWidth: 200,
    alignItems: 'center',
  },
  step1ButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  step1SignInWrap: {
    paddingBottom: 24,
    alignItems: 'center',
  },
  step1SignInText: {
    fontSize: 15,
    color: Colors.white,
  },
  step1SignInLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    color: Colors.white,
  },
  // Step 2
  step2Container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  step2Scroll: {
    flex: 1,
  },
  step2ScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  step2Title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    lineHeight: 30,
  },
  step2List: {
    gap: 10,
    marginBottom: 32,
  },
  step2Item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 12,
  },
  step2ItemSelected: {
    backgroundColor: Colors.mediumLight,
    borderColor: Colors.medium,
  },
  step2ItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  step2ItemTextSelected: {
    color: Colors.text,
  },
  step2Check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step2CheckSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  step2NextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  step2NextText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },
  // Step 3
  step3Container: {
    flex: 1,
    backgroundColor: Colors.medium,
  },
  step3Gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  step3GradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: Colors.medium,
  },
  step3GradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: Colors.dark,
  },
  step3ExistingWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingTop: 16,
    paddingRight: 24,
    zIndex: 1,
  },
  step3ExistingText: {
    fontSize: 14,
    color: Colors.white,
  },
  step3ExistingLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    color: Colors.white,
  },
  step3Content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step3Illustration: {
    marginBottom: 28,
  },
  step3Circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step3Title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 30,
  },
  step3Buttons: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  step3ButtonEmail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  step3ButtonEmailText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  step3Terms: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  step3TermsLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
