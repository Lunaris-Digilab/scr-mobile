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
import { ArrowLeft, Plus, Check, Package, Heart, Star, CheckCircle2, Sun, Moon } from 'lucide-react-native';

import { Colors, Shadows } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../constants/translations';
import { getProductById } from '../../lib/products';
import { getOrCreateRoutine, addStepToRoutine } from '../../lib/routines';
import { addToShelf, getExistingUserProduct, updateUserProduct } from '../../lib/user-products';
import { supabase } from '../../lib/supabase';
import type { Product, ProductCategory } from '../../types/product';
import { getProductBrandDisplay, formatProductSize, TEXTURE_LABELS } from '../../types/product';
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
  const [shelfSheetVisible, setShelfSheetVisible] = useState(false);
  const [isOnShelf, setIsOnShelf] = useState(false);
  const [savingShelf, setSavingShelf] = useState(false);

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
    // Check if already on shelf
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return;
      getExistingUserProduct(user.id, id).then((existing) => {
        if (!cancelled && existing) setIsOnShelf(true);
      }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [id]);

  const handleAddToShelf = async (status: 'opened' | 'wishlist') => {
    if (!product) return;
    try {
      setSavingShelf(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const existing = await getExistingUserProduct(user.id, product.id);
      if (existing) {
        await updateUserProduct(existing.id, { status });
      } else {
        await addToShelf(user.id, product.id, status);
      }
      setIsOnShelf(true);
      haptic.success();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingShelf(false);
    }
  };

  const productDetails = useMemo(() => {
    if (!product) return [];
    const details: { label: string; value: string }[] = [];
    if (product.description) details.push({ label: t('productDescription'), value: product.description });
    const size = formatProductSize(product);
    if (size) details.push({ label: t('addProductSize'), value: size });
    if (product.texture) details.push({ label: t('addProductTexture'), value: TEXTURE_LABELS[product.texture] ?? product.texture });
    if (product.spf) details.push({ label: 'SPF', value: String(product.spf) });
    if (product.usage_time) {
      const timeLabels: Record<string, string> = { AM: t('routineMorning'), PM: t('routineEvening'), both: t('addProductBothAmPm') };
      details.push({ label: t('addProductUsageTime'), value: timeLabels[product.usage_time] ?? product.usage_time });
    }
    if (product.target_area) details.push({ label: t('addProductTargetArea'), value: product.target_area });
    if (product.shelf_life_months) details.push({ label: t('productShelfLife'), value: `${product.shelf_life_months} ${t('productMonths')}` });
    const certs: string[] = [];
    if (product.is_cruelty_free) certs.push('Cruelty-Free');
    if (product.is_vegan) certs.push('Vegan');
    if (product.is_fragrance_free) certs.push('Fragrance-Free');
    if (product.is_paraben_free) certs.push('Paraben-Free');
    if (product.is_alcohol_free) certs.push('Alcohol-Free');
    if (certs.length > 0) details.push({ label: t('addProductCertifications'), value: certs.join(' • ') });
    return details;
  }, [product, t]);

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

  const rating = product.rating ? Math.max(1, Math.min(5, Math.round(product.rating))) : 0;

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
            <Pressable
              style={[styles.topIconButton, isOnShelf && styles.topIconButtonActive]}
              onPress={() => {
                haptic.light();
                setShelfSheetVisible(true);
              }}
            >
              {isOnShelf ? (
                <Check size={18} color={Colors.white} strokeWidth={3} />
              ) : (
                <Plus size={18} color={Colors.text} />
              )}
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
          {rating > 0 && (
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
            </View>
          )}
        </Animated.View>

        <View style={styles.sectionCard}>
          {activeTab === 'details' && (
            <Animated.View entering={FadeInDown.duration(300)}>
              {productDetails.length > 0 ? (
                productDetails.map((item, i) => (
                  <Animated.View
                    key={item.label}
                    entering={FadeInDown.delay(i * 60).duration(300)}
                    style={styles.detailRow}
                  >
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text style={styles.detailValue}>{item.value}</Text>
                  </Animated.View>
                ))
              ) : (
                <Text style={styles.placeholderText}>{t('productNoDetails')}</Text>
              )}
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

      {/* Add to Shelf Bottom Sheet */}
      <BottomSheet
        visible={shelfSheetVisible}
        onClose={() => setShelfSheetVisible(false)}
        title={t('shelfAddProduct')}
        message={product.name}
        actions={[
          {
            label: t('shelfMyShelf'),
            icon: <Package size={20} color={Colors.text} />,
            variant: 'default',
            onPress: () => handleAddToShelf('opened'),
          },
          {
            label: t('shelfWishlist'),
            icon: <Heart size={20} color={Colors.text} />,
            variant: 'default',
            onPress: () => handleAddToShelf('wishlist'),
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
  topIconButtonActive: {
    backgroundColor: Colors.success,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: Typography.semibold,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.text,
    flex: 1.5,
    textAlign: 'right',
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
