import { useState, useEffect, useCallback } from 'react';
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
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { setOnboardingDone, setSkinProfile } from '../lib/onboarding';
import { getTranslation } from '../constants/translations';
import type { TranslationKey } from '../constants/translations';
import { Colors } from '../constants/Colors';
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
  Star,
  Shield,
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function FloatingOrb({ delay, size, top, left, color }: { delay: number; size: number; top: string; left: string; color: string }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(20, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 2500 }),
          withTiming(0.1, { duration: 2500 }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          top,
          left,
        } as any,
        animatedStyle,
      ]}
    />
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <Animated.View
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
      withSpring(1.04, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 12, stiffness: 150 })
    );
    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(100 + index * 60).duration(400)}
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

  // Step 1: Welcome
  if (step === 1) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.bgWarm} />
        <View style={styles.bgWarmOverlay} />

        <FloatingOrb delay={0} size={180} top="8%" left="-15%" color={Colors.white} />
        <FloatingOrb delay={800} size={120} top="55%" left="70%" color={Colors.white} />
        <FloatingOrb delay={1600} size={90} top="30%" left="60%" color="rgba(255,255,255,0.5)" />

        <StepIndicator current={1} total={3} />

        <View style={styles.step1Content}>
          <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.logoContainer}>
            <View style={styles.logoOuter}>
              <View style={styles.logoInner}>
                <Sparkles size={48} color={Colors.white} />
              </View>
            </View>
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(500).duration(700)} style={styles.welcomeTitle}>
            {t('onboardingWelcomeTitle1')}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(650).duration(700)} style={styles.welcomeSubtitle}>
            {t('onboardingWelcomeTitle2')}
          </Animated.Text>

          <Animated.View entering={FadeInUp.delay(900).duration(700)} style={styles.featureRow}>
            <View style={styles.featureChip}>
              <Star size={14} color={Colors.medium} />
              <Text style={styles.featureChipText}>AI Powered</Text>
            </View>
            <View style={styles.featureChip}>
              <Shield size={14} color={Colors.medium} />
              <Text style={styles.featureChipText}>Personalized</Text>
            </View>
          </Animated.View>

          <AnimatedPressable
            entering={FadeInUp.delay(1100).duration(700)}
            style={styles.primaryButton}
            onPress={handleLetsGo}
          >
            <Text style={styles.primaryButtonText}>{t('onboardingLetsGo')}</Text>
            <ArrowRight size={20} color={Colors.text} />
          </AnimatedPressable>
        </View>

        <Animated.View entering={FadeIn.delay(1300).duration(600)}>
          <Pressable style={styles.signInWrap} onPress={handleSignIn}>
            <Text style={styles.signInText}>
              {t('onboardingExistingUser')}
              <Text style={styles.signInLink}> {t('onboardingSignIn')}</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  // Step 2: Skin concerns
  if (step === 2) {
    return (
      <Animated.View
        entering={FadeInRight.duration(400)}
        style={[styles.containerLight, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <StepIndicator current={2} total={3} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.Text entering={FadeInDown.duration(500)} style={styles.step2Title}>
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

        <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.bottomBar}>
          <Pressable
            style={[styles.primaryButtonDark, !selectedConcerns.size && styles.primaryButtonDisabled]}
            onPress={handleNext}
          >
            <Text style={styles.primaryButtonDarkText}>{t('next')}</Text>
            <ArrowRight size={20} color={Colors.white} />
          </Pressable>
        </Animated.View>
      </Animated.View>
    );
  }

  // Step 3: Sign up
  return (
    <Animated.View
      entering={FadeInRight.duration(400)}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.bgWarm} />
      <View style={styles.bgWarmOverlay} />

      <FloatingOrb delay={0} size={150} top="12%" left="65%" color={Colors.white} />
      <FloatingOrb delay={600} size={100} top="60%" left="-10%" color="rgba(255,255,255,0.4)" />

      <StepIndicator current={3} total={3} />

      <Pressable style={styles.step3SignInBtn} onPress={handleSignIn}>
        <Text style={styles.step3SignInText}>
          {t('onboardingExistingUser')}
          <Text style={styles.step3SignInLink}> {t('onboardingSignIn')}</Text>
        </Text>
      </Pressable>

      <View style={styles.step3Content}>
        <Animated.View entering={FadeInDown.delay(200).duration(700)} style={styles.step3IconWrap}>
          <View style={styles.step3IconOuter}>
            <View style={styles.step3IconInner}>
              <Mail size={44} color={Colors.white} />
            </View>
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(400).duration(600)} style={styles.step3Title}>
          {t('onboardingSaveProgress')}
        </Animated.Text>

        <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.step3ButtonsWrap}>
          <Pressable style={styles.emailButton} onPress={handleContinueEmail}>
            <Mail size={20} color={Colors.text} />
            <Text style={styles.emailButtonText}>{t('onboardingContinueEmail')}</Text>
          </Pressable>
        </Animated.View>

        <Animated.Text entering={FadeIn.delay(800).duration(500)} style={styles.termsText}>
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
  // Shared
  container: {
    flex: 1,
    backgroundColor: Colors.medium,
  },
  containerLight: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgWarm: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.medium,
  },
  bgWarmOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: Colors.dark,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 20,
    paddingBottom: 8,
    zIndex: 2,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    width: 28,
    backgroundColor: Colors.white,
  },
  stepDotDone: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  // Step 1
  step1Content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
    paddingHorizontal: 16,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
    marginBottom: 40,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 18,
    paddingHorizontal: 44,
    borderRadius: 30,
    gap: 10,
    minWidth: 220,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  signInWrap: {
    paddingBottom: 28,
    alignItems: 'center',
  },
  signInText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  signInLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    color: Colors.white,
  },

  // Step 2
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  step2Title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 24,
    lineHeight: 34,
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: { elevation: 1 },
    }),
  },
  concernCardSelected: {
    backgroundColor: Colors.dark,
    borderColor: Colors.dark,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  concernIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  concernIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  concernText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
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
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  primaryButtonDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark,
    paddingVertical: 18,
    borderRadius: 28,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonDarkText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
  },

  // Step 3
  step3SignInBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingTop: 20,
    paddingRight: 24,
    zIndex: 3,
  },
  step3SignInText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  step3SignInLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    color: Colors.white,
  },
  step3Content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step3IconWrap: {
    marginBottom: 32,
  },
  step3IconOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step3IconInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  step3Title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  step3ButtonsWrap: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  termsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  termsLink: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
});
