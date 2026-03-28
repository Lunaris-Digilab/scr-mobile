import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withSpring,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Ellipsis, ShoppingCart, Star, CheckCircle2, Sun, Moon } from 'lucide-react-native';

import { Colors, Shadows } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../constants/translations';
import { getProductById } from '../../lib/products';
import { getOrCreateRoutine, addStepToRoutine } from '../../lib/routines';
import { supabase } from '../../lib/supabase';
import type { Product, ProductCategory } from '../../types/product';
import { getProductBrandDisplay } from '../../types/product';
import { Skeleton } from '../../components/Skeleton';
import { BottomSheet } from '../../components/BottomSheet';
import { haptic } from '../../lib/haptics';

type DetailTab = 'details' | 'reviews' | 'ingredients';

function getCategoryLabel(key: ProductCategory | null, t: (k: TranslationKey) => string): string {
  if (!key) return t('prodCat_other');
  return t((`prodCat_${key}`) as TranslationKey);
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<DetailTab>('details');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [routineSheetVisible, setRoutineSheetVisible] = useState(false);

  // Parallax scroll
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroImageStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-200, 0, 300],
          [-100, 0, 100],
          Extrapolation.CLAMP
        ),
      },
      {
        scale: interpolate(
          scrollY.value,
          [-200, 0],
          [1.4, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  // Animated tab indicator
  const tabPositions = useRef<number[]>([]);
  const tabWidths = useRef<number[]>([]);
  const indicatorLeft = useSharedValue(0);
  const indicatorWidth = useSharedValue(60);
  const TABS: { key: DetailTab; labelKey: string }[] = [
    { key: 'details', labelKey: 'productTabDetails' },
    { key: 'reviews', labelKey: 'productTabReviews' },
    { key: 'ingredients', labelKey: 'productTabIngredients' },
  ];

  const indicatorStyle = useAnimatedStyle(() => ({
    left: indicatorLeft.value,
    width: indicatorWidth.value,
  }));

  const handleTabLayout = (index: number, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    tabPositions.current[index] = x;
    tabWidths.current[index] = width;
    const tabIdx = TABS.findIndex((tab) => tab.key === activeTab);
    if (index === tabIdx) {
      indicatorLeft.value = x;
      indicatorWidth.value = width;
    }
  };

  useEffect(() => {
    const idx = TABS.findIndex((tab) => tab.key === activeTab);
    if (tabPositions.current[idx] !== undefined) {
      indicatorLeft.value = withSpring(tabPositions.current[idx], { damping: 18, stiffness: 120 });
      indicatorWidth.value = withSpring(tabWidths.current[idx], { damping: 18, stiffness: 120 });
    }
  }, [activeTab]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getProductById(id)
      .then((data) => { if (!cancelled) setProduct(data); })
      .catch((e) => console.error(e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const benefits = useMemo(() => {
    if (!product?.category) {
      return [t('productBenefitOne'), t('productBenefitTwo'), t('productBenefitThree')];
    }
    switch (product.category) {
      case 'cleanser':
        return [t('productCleanserBenefitOne'), t('productCleanserBenefitTwo'), t('productCleanserBenefitThree')];
      case 'serum':
      case 'treatment':
        return [t('productSerumBenefitOne'), t('productSerumBenefitTwo'), t('productSerumBenefitThree')];
      case 'moisturizer':
      case 'mask':
      case 'eye_cream':
        return [t('productMoisturizerBenefitOne'), t('productMoisturizerBenefitTwo'), t('productMoisturizerBenefitThree')];
      case 'sunscreen':
        return [t('productSunscreenBenefitOne'), t('productSunscreenBenefitTwo'), t('productSunscreenBenefitThree')];
      default:
        return [t('productBenefitOne'), t('productBenefitTwo'), t('productBenefitThree')];
    }
  }, [product?.category, t]);

  const ingredients = useMemo(() => {
    if (!product?.ingredients_text?.trim()) return [];
    return product.ingredients_text.split(',').map((p) => p.trim()).filter(Boolean);
  }, [product?.ingredients_text]);

  const submitAddToRoutine = async (type: 'AM' | 'PM') => {
    if (!product) return;
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const routine = await getOrCreateRoutine(user.id, type, user.email ?? undefined);
      const brandDisplay = getProductBrandDisplay(product);
      const catLabel = getCategoryLabel(product.category, t);
      await addStepToRoutine(routine.id, {
        name: product.name,
        description: brandDisplay ? `${brandDisplay} • ${catLabel}` : catLabel,
        order: 0,
        product_id: product.id,
      });
      haptic.success();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={{ padding: 20 }}>
          <Skeleton width="100%" height={350} borderRadius={28} style={{ marginBottom: 16 }} />
          <Skeleton width="60%" height={24} borderRadius={8} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={18} borderRadius={6} style={{ marginBottom: 16 }} />
          <Skeleton width="100%" height={120} borderRadius={12} />
        </View>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>{t('productNotFound')}</Text>
        <Pressable style={styles.backFallbackButton} onPress={() => router.back()}>
          <Text style={styles.backFallbackText}>{t('productsAddBack')}</Text>
        </Pressable>
      </View>
    );
  }

  const rating = Math.max(1, Math.min(5, Math.round(product.rating ?? 4)));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Parallax Hero */}
        <View style={styles.heroWrap}>
          <View style={styles.heroImageWrap}>
            <Animated.View style={[StyleSheet.absoluteFill, heroImageStyle]}>
              {product.image_url ? (
                <Image source={{ uri: product.image_url }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <View style={styles.heroPlaceholder}>
                  <Text style={styles.heroPlaceholderText}>{product.name.charAt(0)}</Text>
                </View>
              )}
            </Animated.View>
          </View>

          <Pressable
            style={[styles.topIconButton, styles.topLeft]}
            onPress={() => {
              haptic.light();
              router.back();
            }}
          >
            <ArrowLeft size={18} color={Colors.text} />
          </Pressable>
          <View style={styles.topRightRow}>
            <Pressable style={styles.topIconButton}>
              <ShoppingCart size={18} color={Colors.text} />
            </Pressable>
            <Pressable style={styles.topIconButton}>
              <Ellipsis size={18} color={Colors.text} />
            </Pressable>
          </View>
        </View>

        {/* Animated Tabs */}
        <View style={styles.tabsRow}>
          <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
          {TABS.map((tab, idx) => (
            <Pressable
              key={tab.key}
              style={styles.tabBtn}
              onPress={() => {
                haptic.selection();
                setActiveTab(tab.key);
              }}
              onLayout={(e) => handleTabLayout(idx, e)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {t(tab.labelKey as TranslationKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Content */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.contentCard}>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.brand}>
            {getProductBrandDisplay(product) ?? getCategoryLabel(product.category, t)}
          </Text>
          <View style={styles.ratingRow}>
            <View style={styles.starsRow}>
              {Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={String(idx)}
                  size={16}
                  color={idx < rating ? '#C78B4D' : Colors.lightGray}
                  fill={idx < rating ? '#C78B4D' : 'transparent'}
                />
              ))}
            </View>
            <Text style={styles.reviewCount}>4,245 {t('productReviewsLabel')}</Text>
          </View>
        </Animated.View>

        <View style={styles.sectionCard}>
          {activeTab === 'details' && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Text style={styles.sectionTitle}>{t('productBenefits')}</Text>
              {benefits.map((item, i) => (
                <Animated.View
                  key={item}
                  entering={FadeInDown.delay(i * 80).duration(300)}
                  style={styles.benefitRow}
                >
                  <CheckCircle2 size={18} color={Colors.success} />
                  <Text style={styles.benefitText}>{item}</Text>
                </Animated.View>
              ))}
            </Animated.View>
          )}

          {activeTab === 'reviews' && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Text style={styles.placeholderText}>{t('productReviewsPlaceholder')}</Text>
            </Animated.View>
          )}

          {activeTab === 'ingredients' && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Text style={styles.sectionTitle}>{t('productTabIngredients')}</Text>
              {ingredients.length === 0 ? (
                <Text style={styles.placeholderText}>{t('productIngredientsPlaceholder')}</Text>
              ) : (
                ingredients.map((item, i) => (
                  <Animated.View
                    key={item}
                    entering={FadeInDown.delay(i * 40).duration(300)}
                    style={styles.ingredientRow}
                  >
                    <View style={styles.ingredientDot} />
                    <Text style={styles.ingredientItem}>{item}</Text>
                  </Animated.View>
                ))
              )}
            </Animated.View>
          )}
        </View>
      </Animated.ScrollView>

      {/* Bottom Bar */}
      <Animated.View
        entering={FadeInUp.delay(300).duration(400)}
        style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}
      >
        <Pressable
          style={[styles.addButton, saving && styles.addButtonDisabled]}
          onPress={() => {
            haptic.light();
            setRoutineSheetVisible(true);
          }}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <Text style={styles.addButtonText}>{t('productAddToRoutine')}</Text>
          )}
        </Pressable>
      </Animated.View>

      {/* AM/PM Bottom Sheet */}
      <BottomSheet
        visible={routineSheetVisible}
        onClose={() => setRoutineSheetVisible(false)}
        title={t('productsAddToRoutineTitle')}
        message={product.name}
        actions={[
          {
            label: t('productsMorningRoutine'),
            icon: <Sun size={20} color={Colors.text} />,
            variant: 'default',
            onPress: () => submitAddToRoutine('AM'),
          },
          {
            label: t('productsEveningRoutine'),
            icon: <Moon size={20} color={Colors.text} />,
            variant: 'default',
            onPress: () => submitAddToRoutine('PM'),
          },
          {
            label: t('cancel'),
            variant: 'default',
            onPress: () => {},
          },
        ]}
      />
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
    paddingHorizontal: 20,
  },

  /* Hero */
  heroWrap: {
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.card,
    position: 'relative',
  },
  heroImageWrap: {
    width: '100%',
    aspectRatio: 0.94,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.mediumLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPlaceholderText: {
    fontSize: 56,
    fontFamily: Typography.bold,
    color: Colors.primary,
  },
  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.glass,
  },
  topLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  topRightRow: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },

  /* Tabs */
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.card,
    marginTop: 8,
    position: 'relative',
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  tabText: {
    fontSize: 15,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.text,
    fontFamily: Typography.bold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  /* Content */
  contentCard: {
    backgroundColor: Colors.card,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: Typography.bold,
    color: Colors.text,
  },
  brand: {
    marginTop: 6,
    fontSize: 16,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },
  ratingRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewCount: {
    fontSize: 16,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },

  /* Section */
  sectionCard: {
    backgroundColor: Colors.card,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Typography.bold,
    color: Colors.text,
    marginBottom: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  ingredientItem: {
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    flexShrink: 1,
  },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    ...Shadows.card,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontFamily: Typography.bold,
  },

  /* Empty */
  emptyText: {
    fontSize: 16,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  backFallbackButton: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backFallbackText: {
    fontFamily: Typography.semibold,
    color: Colors.text,
  },
});
