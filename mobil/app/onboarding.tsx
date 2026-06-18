import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../context/LanguageContext';
import { setOnboardingDone, setSkinProfile } from '../lib/onboarding';
import { getTranslation } from '../constants/translations';
import type { TranslationKey } from '../constants/translations';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { haptic } from '../lib/haptics';
import {
  Sparkles,
  Check,
  Droplets,
  Flame,
  Sun,
  Heart,
  Mail,
  ArrowRight,
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

const CONCERN_ICONS = [Droplets, Sparkles, Flame, Flame, Droplets, Sun, Sparkles, Heart];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i + 1 === current && styles.stepDotActive,
            i + 1 < current && styles.stepDotDone,
          ]}
        />
      ))}
    </View>
  );
}

function BouncyConcernCard({
  index,
  selected,
  onPress,
  icon: Icon,
  label,
}: {
  index: number;
  selected: boolean;
  onPress: () => void;
  icon: any;
  label: string;
}) {
  const scale = useSharedValue(1);

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(1.03, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 150 })
    );
    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(80 + index * 50).duration(400)}
      style={[styles.concernCard, selected && styles.concernCardSelected, animatedStyle]}
      onPress={handlePress}
    >
      <View style={[styles.concernIconWrap, selected && styles.concernIconWrapSelected]}>
        <Icon size={20} color={selected ? Colors.white : Colors.dark} />
      </View>
      <Text style={[styles.concernText, selected && styles.concernTextSelected]}>
        {label}
      </Text>
      <View style={[styles.checkCircle, selected && styles.checkCircleSelected]}>
        {selected && <Check size={13} color={Colors.white} strokeWidth={3} />}
      </View>
    </AnimatedPressable>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [selectedConcerns, setSelectedConcerns] = useState<Set<number>>(new Set());

  const toggleConcern = (index: number) => {
    haptic.selection();
    setSelectedConcerns((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleLetsGo = () => { haptic.light(); setStep(2); };
  const handleNext = () => { haptic.medium(); setStep(3); };

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

  // ─── Step 1: Welcome ───
  if (step === 1) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <LinearGradient
          colors={['#FDF6F0', '#F5E6D8', '#EDDDD0']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        {/* Decorative soft circle */}
        <View style={styles.decoCircle} />

        <View style={styles.step1Content}>
          <Animated.View entering={FadeInDown.delay(200).duration(700)} style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Sparkles size={32} color={Colors.dark} />
            </View>
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(400).duration(600)} style={styles.brandName}>
            glowist
          </Animated.Text>

          <Animated.Text entering={FadeInDown.delay(550).duration(600)} style={styles.welcomeTagline}>
            {t('onboardingWelcomeTitle2')}
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.step1Bottom}>
          <Pressable style={styles.ctaButton} onPress={handleLetsGo}>
            <Text style={styles.ctaButtonText}>{t('onboardingLetsGo')}</Text>
            <ArrowRight size={18} color={Colors.white} />
          </Pressable>

          <Pressable style={styles.signInWrap} onPress={handleSignIn}>
            <Text style={styles.signInText}>
              {t('onboardingExistingUser')}
              <Text style={styles.signInLink}> {t('onboardingSignIn')}</Text>
            </Text>
          </Pressable>
        </Animated.View>

        <StepIndicator current={1} total={3} />
      </View>
    );
  }

  // ─── Step 2: Skin concerns ───
  if (step === 2) {
    return (
      <Animated.View
        entering={FadeInRight.duration(350)}
        style={[styles.containerLight, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <StepIndicator current={2} total={3} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.Text entering={FadeInDown.duration(400)} style={styles.step2Title}>
            {t('onboardingSkinFocus')}
          </Animated.Text>

          <View style={styles.concernGrid}>
            {SKIN_CONCERN_KEYS.map((key, index) => (
              <BouncyConcernCard
                key={key}
                index={index}
                selected={selectedConcerns.has(index)}
                onPress={() => toggleConcern(index)}
                icon={CONCERN_ICONS[index]}
                label={t(key)}
              />
            ))}
          </View>
        </ScrollView>

        <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.bottomBar}>
          <Pressable
            style={[styles.ctaButton, !selectedConcerns.size && styles.ctaButtonDisabled]}
            onPress={handleNext}
            disabled={!selectedConcerns.size}
          >
            <Text style={styles.ctaButtonText}>{t('next')}</Text>
            <ArrowRight size={18} color={Colors.white} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }

  // ─── Step 3: Sign up ───
  return (
    <Animated.View
      entering={FadeInRight.duration(350)}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <LinearGradient
        colors={['#FDF6F0', '#F5E6D8', '#EDDDD0']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <StepIndicator current={3} total={3} />

      <View style={styles.step3Content}>
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.step3IconWrap}>
          <View style={styles.step3IconCircle}>
            <Mail size={36} color={Colors.dark} />
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(350).duration(500)} style={styles.step3Title}>
          {t('onboardingSaveProgress')}
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.step3Buttons}>
          <Pressable style={styles.ctaButton} onPress={handleContinueEmail}>
            <Mail size={18} color={Colors.white} />
            <Text style={styles.ctaButtonText}>{t('onboardingContinueEmail')}</Text>
          </Pressable>

          <Pressable style={styles.step3SignInBtn} onPress={handleSignIn}>
            <Text style={styles.signInText}>
              {t('onboardingExistingUser')}
              <Text style={styles.signInLink}> {t('onboardingSignIn')}</Text>
            </Text>
          </Pressable>
        </Animated.View>

        <Animated.Text entering={FadeIn.delay(700).duration(400)} style={styles.termsText}>
          {t('onboardingTerms')}
          <Text style={styles.termsLink}>{t('onboardingTermsLink')}</Text>
          {t('onboardingAnd')}
          <Text style={styles.termsLink}>{t('onboardingPrivacyLink')}</Text>
          {t('onboardingTermsSuffix')}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // ── Shared ──
  container: {
    flex: 1,
  },
  containerLight: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Step indicator ──
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    zIndex: 2,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(180,163,143,0.3)',
  },
  stepDotActive: {
    width: 24,
    borderRadius: 3,
    backgroundColor: Colors.dark,
  },
  stepDotDone: {
    backgroundColor: Colors.dark,
  },

  // ── Step 1: Welcome ──
  decoCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.45)',
    top: '20%',
    alignSelf: 'center',
  },
  step1Content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoWrap: {
    marginBottom: 28,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#C7A68A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
    }),
  },
  brandName: {
    fontSize: 38,
    fontFamily: Typography.bold,
    color: Colors.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  welcomeTagline: {
    fontSize: 16,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  step1Bottom: {
    paddingHorizontal: 32,
    gap: 20,
    paddingBottom: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark,
    paddingVertical: 18,
    borderRadius: 28,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#8f5c74',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: Typography.semibold,
    color: Colors.white,
  },
  ctaButtonDisabled: {
    opacity: 0.35,
  },
  signInWrap: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  signInText: {
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },
  signInLink: {
    fontFamily: Typography.semibold,
    color: Colors.text,
    textDecorationLine: 'underline',
  },

  // ── Step 2: Concerns ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
  },
  step2Title: {
    fontSize: 24,
    fontFamily: Typography.bold,
    color: Colors.text,
    marginBottom: 20,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  concernGrid: {
    gap: 10,
  },
  concernCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 14,
  },
  concernCardSelected: {
    backgroundColor: Colors.dark,
    borderColor: Colors.dark,
  },
  concernIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concernIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  concernText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.semibold,
    color: Colors.text,
  },
  concernTextSelected: {
    color: Colors.white,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: Colors.medium,
    borderColor: Colors.medium,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },

  // ── Step 3: Sign up ──
  step3Content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step3IconWrap: {
    marginBottom: 28,
  },
  step3IconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#C7A68A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
    }),
  },
  step3Title: {
    fontSize: 22,
    fontFamily: Typography.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 30,
  },
  step3Buttons: {
    width: '100%',
    gap: 16,
    marginBottom: 24,
  },
  step3SignInBtn: {
    alignItems: 'center',
  },
  termsText: {
    fontSize: 12,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  termsLink: {
    fontFamily: Typography.semibold,
    color: Colors.text,
    textDecorationLine: 'underline',
  },
});
