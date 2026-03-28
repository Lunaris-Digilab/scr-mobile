import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Mic,
  ChevronDown,
  ChevronRight,
  Bookmark,
  LayoutGrid,
  Sun,
  Moon,
} from 'lucide-react-native';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { getProducts } from '../lib/products';
import { getOrCreateRoutine, addStepToRoutine } from '../lib/routines';
import { addToShelf, getExistingUserProduct, updateUserProduct } from '../lib/user-products';
import type { Product } from '../types/product';
import type { RoutineType } from '../types/routine';
import type { UserProductStatus } from '../types/user-product';
import { getProductBrandDisplay, type ProductCategory } from '../types/product';
import { Colors, Shadows } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../constants/translations';
import { AnimatedCard } from '../components/AnimatedCard';
import { ProductGridSkeleton } from '../components/Skeleton';
import { BottomSheet, type BottomSheetAction } from '../components/BottomSheet';
import { haptic } from '../lib/haptics';

const CATEGORY_KEYS: (ProductCategory | '')[] = [
  '', 'cleanser', 'toner', 'serum', 'moisturizer', 'sunscreen', 'mask', 'eye_cream', 'treatment', 'other',
];

function getCategoryLabel(key: ProductCategory | '', t: (k: TranslationKey) => string): string {
  return key ? t(('prodCat_' + key) as TranslationKey) : t('prodCat_all');
}

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fabBottomOffset = insets.bottom + (Platform.OS === 'ios' ? 96 : 82);
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const CATEGORIES = CATEGORY_KEYS.map((key) => ({ key, label: getCategoryLabel(key, t) }));
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | ''>('');
  const [addingToRoutine, setAddingToRoutine] = useState<string | null>(null);
  const [addingToShelf, setAddingToShelf] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Routine bottom sheet
  const [routineSheetProduct, setRoutineSheetProduct] = useState<Product | null>(null);

  // Animated search
  const searchBorderColor = useSharedValue(0);
  const searchElevation = useSharedValue(0);

  const searchBarAnimStyle = useAnimatedStyle(() => ({
    borderColor: searchBorderColor.value === 1 ? Colors.primary : Colors.border,
    shadowOpacity: searchElevation.value * 0.08,
  }));

  useEffect(() => {
    searchBorderColor.value = withTiming(searchFocused ? 1 : 0, { duration: 200 });
    searchElevation.value = withTiming(searchFocused ? 1 : 0, { duration: 200 });
  }, [searchFocused]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getProducts({
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        limit: 100,
      });
      setProducts(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    const delay = setTimeout(loadProducts, 300);
    return () => clearTimeout(delay);
  }, [loadProducts]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const handleAddToRoutine = (product: Product) => {
    haptic.light();
    setRoutineSheetProduct(product);
  };

  const addProductToRoutine = async (product: Product, type: RoutineType) => {
    try {
      setAddingToRoutine(product.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const routine = await getOrCreateRoutine(user.id, type, user.email ?? undefined);
      const brandDisplay = getProductBrandDisplay(product);
      const catLabel = product.category ? getCategoryLabel(product.category, t) : '';
      await addStepToRoutine(routine.id, {
        name: product.name,
        description: brandDisplay
          ? (product.category ? `${brandDisplay} • ${catLabel}` : brandDisplay)
          : product.category ? catLabel : undefined,
        order: 0,
        product_id: product.id,
      });
      haptic.success();
    } catch (e) {
      console.error(e);
    } finally {
      setAddingToRoutine(null);
    }
  };

  const handleAddToShelf = async (product: Product, status: UserProductStatus) => {
    try {
      setAddingToShelf(product.id);
      haptic.light();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const existing = await getExistingUserProduct(user.id, product.id);
      if (existing) {
        await updateUserProduct(existing.id, { status });
      } else {
        await addToShelf(user.id, product.id, status);
      }
      haptic.success();
    } catch (e) {
      console.error(e);
    } finally {
      setAddingToShelf(null);
    }
  };

  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    const isAdding = addingToRoutine === item.id;
    const isAddingShelf = addingToShelf === item.id;
    const isBusy = isAdding || isAddingShelf;

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 40).duration(400)}
        style={{ width: '48.2%' }}
      >
        <AnimatedCard
          style={styles.card}
          onPress={() => router.push({ pathname: '/products/[id]', params: { id: item.id } })}
        >
          <View style={styles.cardImageWrap}>
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.cardImagePlaceholder,
                  { backgroundColor: index % 2 === 0 ? Colors.light : Colors.mediumLight },
                ]}
              >
                <Text style={styles.cardImagePlaceholderText}>
                  {item.name.charAt(0)}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={2}>
              {item.name}
            </Text>
            {!!getProductBrandDisplay(item) && (
              <Text style={styles.cardBrand} numberOfLines={1}>
                {getProductBrandDisplay(item)}
              </Text>
            )}
            <View style={styles.cardActions}>
              <Pressable
                style={[styles.viewButton, isBusy && styles.addButtonDisabled]}
                onPress={() => router.push({ pathname: '/products/[id]', params: { id: item.id } })}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <>
                    <Text style={styles.viewButtonText}>View Details</Text>
                    <ChevronRight size={16} color={Colors.text} />
                  </>
                )}
              </Pressable>
              <Pressable
                style={styles.bookmarkButton}
                onPress={() => handleAddToShelf(item, 'wishlist')}
                disabled={isBusy}
              >
                <Bookmark size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </AnimatedCard>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>{t('productsTitle')}</Text>
        <Pressable style={styles.headerIcon} hitSlop={12}>
          <LayoutGrid size={22} color={Colors.text} />
        </Pressable>
      </Animated.View>

      {/* Animated Search Bar */}
      <View style={styles.searchWrap}>
        <Animated.View style={[styles.searchBar, searchBarAnimStyle]}>
          <Search
            size={18}
            color={searchFocused ? Colors.primary : Colors.textSecondary}
            style={{ marginRight: 10 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={t('productsSearchPlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <Pressable hitSlop={12} style={{ padding: 4 }}>
            <Mic size={18} color={Colors.textSecondary} />
          </Pressable>
        </Animated.View>
      </View>

      {/* Category Pills */}
      <View style={styles.filters}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.key || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => {
            const isActive = categoryFilter === item.key;
            return (
              <Pressable
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => {
                  haptic.selection();
                  setCategoryFilter(item.key as ProductCategory | '');
                }}
              >
                <Text
                  style={[styles.filterPillText, isActive && styles.filterPillTextActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {products.length} {t('productsResults')}
          {search.trim() ? ` "${search.trim()}"` : ''}
          {categoryFilter ? ` • ${getCategoryLabel(categoryFilter, t)}` : ''}
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingTop: 8 }}>
          <ProductGridSkeleton />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          key="products-grid"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 170 },
          ]}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Animated.View entering={FadeInUp.duration(500)} style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Search size={36} color={Colors.medium} />
              </View>
              <Text style={styles.emptyText}>{t('productsNoResults')}</Text>
              <Text style={styles.emptySubtext}>{t('productsNoResultsHint')}</Text>
            </Animated.View>
          }
        />
      )}

      <Animated.View
        entering={FadeInUp.delay(300).duration(500)}
        style={[styles.fab, { bottom: fabBottomOffset }]}
      >
        <Pressable
          style={styles.fabInner}
          onPress={() => {
            haptic.medium();
            router.push('/products/add');
          }}
        >
          <Plus size={20} color={Colors.white} />
          <Text style={styles.fabText}>{t('productsAddProduct')}</Text>
        </Pressable>
      </Animated.View>

      {/* AM/PM Routine Bottom Sheet */}
      <BottomSheet
        visible={!!routineSheetProduct}
        onClose={() => setRoutineSheetProduct(null)}
        title={t('productsAddToRoutineTitle')}
        message={routineSheetProduct ? `${routineSheetProduct.name}` : ''}
        actions={[
          {
            label: t('productsMorningRoutine'),
            icon: <Sun size={20} color={Colors.text} />,
            variant: 'default',
            onPress: () => {
              if (routineSheetProduct) addProductToRoutine(routineSheetProduct, 'AM');
            },
          },
          {
            label: t('productsEveningRoutine'),
            icon: <Moon size={20} color={Colors.text} />,
            variant: 'default',
            onPress: () => {
              if (routineSheetProduct) addProductToRoutine(routineSheetProduct, 'PM');
            },
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Typography.bold,
    color: Colors.text,
  },
  headerIcon: {
    padding: 4,
  },

  /* Search */
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: '#8f5c74',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 0,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    fontFamily: Typography.regular,
    color: Colors.text,
  },

  /* Filters */
  filters: {
    marginBottom: 12,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingRight: 40,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 14,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: Colors.white,
    fontFamily: Typography.semibold,
  },

  /* Results */
  resultsRow: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  resultsText: {
    fontSize: 12,
    fontFamily: Typography.semibold,
    color: Colors.textSecondary,
  },

  /* Grid */
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  /* Empty */
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Typography.semibold,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },

  /* Card */
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 1.12,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.lightGray,
    marginBottom: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: {
    fontSize: 28,
    fontFamily: Typography.bold,
    color: Colors.gray,
  },
  cardBody: {
    minWidth: 0,
  },
  cardName: {
    fontSize: 15,
    fontFamily: Typography.semibold,
    color: Colors.text,
    marginBottom: 4,
  },
  cardBrand: {
    fontSize: 12,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.medium,
    paddingVertical: 9,
    borderRadius: 999,
    gap: 6,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  viewButtonText: {
    fontSize: 14,
    fontFamily: Typography.semibold,
    color: Colors.text,
  },
  bookmarkButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light,
    borderRadius: 19,
  },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 20,
    ...Shadows.fab,
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
  },
  fabText: {
    fontSize: 15,
    fontFamily: Typography.semibold,
    color: Colors.white,
  },
});
