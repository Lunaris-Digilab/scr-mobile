import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Ellipsis, ShoppingCart, Star, CheckCircle2 } from 'lucide-react-native';

import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../constants/translations';
import { getProductById } from '../../lib/products';
import { getOrCreateRoutine, addStepToRoutine } from '../../lib/routines';
import { supabase } from '../../lib/supabase';
import type { Product, ProductCategory } from '../../types/product';
import { getProductBrandDisplay } from '../../types/product';

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

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    getProductById(id)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((e) => {
        console.error(e);
        Alert.alert(t('error'), t('productLoadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, t]);

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
    return product.ingredients_text
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  }, [product?.ingredients_text]);

  const addToRoutine = () => {
    if (!product) return;
    Alert.alert(
      t('productsAddToRoutineTitle'),
      `${product.name} ${t('productsWhichRoutine')}`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('productsMorningRoutine'),
          onPress: () => submitAddToRoutine('AM'),
        },
        {
          text: t('productsEveningRoutine'),
          onPress: () => submitAddToRoutine('PM'),
        },
      ]
    );
  };

  const submitAddToRoutine = async (type: 'AM' | 'PM') => {
    if (!product) return;
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('error'), t('productsLoginRequired'));
        return;
      }
      const routine = await getOrCreateRoutine(user.id, type, user.email ?? undefined);
      const brandDisplay = getProductBrandDisplay(product);
      const catLabel = getCategoryLabel(product.category, t);

      await addStepToRoutine(routine.id, {
        name: product.name,
        description: brandDisplay ? `${brandDisplay} • ${catLabel}` : catLabel,
        order: 0,
        product_id: product.id,
      });

      Alert.alert(t('productsAdded'), type === 'AM' ? t('productsAddedToMorning') : t('productsAddedToEvening'));
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('productsAddToRoutineFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <View style={styles.heroImageWrap}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Text style={styles.heroPlaceholderText}>{product.name.charAt(0)}</Text>
              </View>
            )}
          </View>

          <Pressable style={[styles.topIconButton, styles.topLeft]} onPress={() => router.back()}>
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

        <View style={styles.tabsRow}>
          <Pressable style={styles.tabBtn} onPress={() => setActiveTab('details')}>
            <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>{t('productTabDetails')}</Text>
          </Pressable>
          <Text style={styles.tabDivider}>|</Text>
          <Pressable style={styles.tabBtn} onPress={() => setActiveTab('reviews')}>
            <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>{t('productTabReviews')}</Text>
          </Pressable>
          <Text style={styles.tabDivider}>|</Text>
          <Pressable style={styles.tabBtn} onPress={() => setActiveTab('ingredients')}>
            <Text style={[styles.tabText, activeTab === 'ingredients' && styles.tabTextActive]}>{t('productTabIngredients')}</Text>
          </Pressable>
        </View>

        <View style={styles.contentCard}>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.brand}>{getProductBrandDisplay(product) ?? getCategoryLabel(product.category, t)}</Text>

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
        </View>

        <View style={styles.sectionCard}>
          {activeTab === 'details' && (
            <>
              <Text style={styles.sectionTitle}>{t('productBenefits')}</Text>
              {benefits.map((item) => (
                <View key={item} style={styles.benefitRow}>
                  <CheckCircle2 size={18} color={Colors.textSecondary} />
                  <Text style={styles.benefitText}>{item}</Text>
                </View>
              ))}
            </>
          )}

          {activeTab === 'reviews' && (
            <Text style={styles.placeholderText}>{t('productReviewsPlaceholder')}</Text>
          )}

          {activeTab === 'ingredients' && (
            <>
              <Text style={styles.sectionTitle}>{t('productTabIngredients')}</Text>
              {ingredients.length === 0 ? (
                <Text style={styles.placeholderText}>{t('productIngredientsPlaceholder')}</Text>
              ) : (
                ingredients.map((item) => (
                  <Text key={item} style={styles.ingredientItem}>• {item}</Text>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={[styles.addButton, saving && styles.addButtonDisabled]} onPress={addToRoutine} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <Text style={styles.addButtonText}>{t('productAddToRoutine')}</Text>
          )}
        </Pressable>
      </View>
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
    color: Colors.primary,
    fontWeight: '700',
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
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
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: Colors.card,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tabText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  tabDivider: {
    color: Colors.textSecondary,
    opacity: 0.75,
    fontSize: 16,
  },
  contentCard: {
    backgroundColor: Colors.card,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    color: Colors.text,
    fontWeight: '700',
  },
  brand: {
    marginTop: 6,
    fontSize: 16,
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
    color: Colors.textSecondary,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: Colors.text,
    fontWeight: '700',
    marginBottom: 14,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 18,
    lineHeight: 25,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  placeholderText: {
    fontSize: 18,
    color: Colors.textSecondary,
    lineHeight: 26,
  },
  ingredientItem: {
    fontSize: 17,
    color: Colors.textSecondary,
    lineHeight: 25,
    marginBottom: 6,
  },
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
    backgroundColor: Colors.medium,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonText: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 16,
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
    color: Colors.text,
    fontWeight: '600',
  },
});
