import { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { getProducts } from '../lib/products';
import { getOrCreateRoutine, addStepToRoutine } from '../lib/routines';
import { addToShelf, getExistingUserProduct, updateUserProduct } from '../lib/user-products';
import type { Product } from '../types/product';
import type { RoutineType } from '../types/routine';
import type { UserProductStatus } from '../types/user-product';
import { PRODUCT_CATEGORY_LABELS, type ProductCategory } from '../types/product';

const CATEGORIES: { key: ProductCategory | ''; label: string }[] = [
  { key: '', label: 'Tümü' },
  { key: 'cleanser', label: 'Temizleyici' },
  { key: 'toner', label: 'Tonik' },
  { key: 'serum', label: 'Serum' },
  { key: 'moisturizer', label: 'Nemlendirici' },
  { key: 'sunscreen', label: 'Güneş Kremi' },
  { key: 'mask', label: 'Maske' },
  { key: 'eye_cream', label: 'Göz Kremi' },
  { key: 'treatment', label: 'Tedavi' },
  { key: 'other', label: 'Diğer' },
];

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | ''>('');
  const [addingToRoutine, setAddingToRoutine] = useState<string | null>(null);
  const [addingToShelf, setAddingToShelf] = useState<string | null>(null);

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
      Alert.alert('Hata', 'Ürünler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    const delay = setTimeout(loadProducts, 300);
    return () => clearTimeout(delay);
  }, [loadProducts]);

  const handleAddToRoutine = (product: Product) => {
    Alert.alert(
      'Rutine Ekle',
      `${product.name} hangi rutine eklensin?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sabah Rutini',
          onPress: () => addProductToRoutine(product, 'AM'),
        },
        {
          text: 'Akşam Rutini',
          onPress: () => addProductToRoutine(product, 'PM'),
        },
      ]
    );
  };

  const addProductToRoutine = async (product: Product, type: RoutineType) => {
    try {
      setAddingToRoutine(product.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Hata', 'Giriş yapmanız gerekiyor.');
        return;
      }
      const routine = await getOrCreateRoutine(user.id, type, user.email ?? undefined);
      await addStepToRoutine(routine.id, {
        name: product.name,
        description: product.brand
          ? `${product.brand}${product.category ? ` • ${PRODUCT_CATEGORY_LABELS[product.category as ProductCategory]}` : ''}`
          : product.category
            ? PRODUCT_CATEGORY_LABELS[product.category as ProductCategory]
            : undefined,
        order: 0,
        product_id: product.id,
      });
      Alert.alert('Eklendi', `${product.name} ${type === 'AM' ? 'Sabah' : 'Akşam'} rutinine eklendi.`);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Rutine eklenemedi.');
    } finally {
      setAddingToRoutine(null);
    }
  };

  const handleAddToShelf = async (product: Product, status: UserProductStatus) => {
    try {
      setAddingToShelf(product.id);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Hata', 'Giriş yapmanız gerekiyor.');
        return;
      }
      const existing = await getExistingUserProduct(user.id, product.id);
      if (existing) {
        await updateUserProduct(existing.id, { status });
        Alert.alert('Güncellendi', status === 'opened' ? 'Rafına taşındı.' : 'İstek listesine taşındı.');
      } else {
        await addToShelf(user.id, product.id, status);
        Alert.alert('Eklendi', status === 'opened' ? 'Rafına eklendi.' : 'İstek listesine eklendi.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Eklenemedi.');
    } finally {
      setAddingToShelf(null);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isAdding = addingToRoutine === item.id;
    const isAddingShelf = addingToShelf === item.id;
    const categoryLabel = item.category
      ? PRODUCT_CATEGORY_LABELS[item.category as ProductCategory]
      : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardImageWrap}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
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
          {item.brand ? (
            <Text style={styles.cardBrand} numberOfLines={1}>
              {item.brand}
            </Text>
          ) : null}
          {categoryLabel ? (
            <View style={styles.tagWrap}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{categoryLabel.toUpperCase()}</Text>
              </View>
            </View>
          ) : null}
          <Pressable
            style={[styles.addButton, isAdding && styles.addButtonDisabled]}
            onPress={() => handleAddToRoutine(item)}
            disabled={isAdding || isAddingShelf}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.addButtonIcon}>+</Text>
                <Text style={styles.addButtonText}>Rutine Ekle</Text>
              </>
            )}
          </Pressable>
          <View style={styles.shelfButtons}>
            <Pressable
              style={[styles.shelfButton, (isAdding || isAddingShelf) && styles.addButtonDisabled]}
              onPress={() => handleAddToShelf(item, 'opened')}
              disabled={isAdding || isAddingShelf}
            >
              {isAddingShelf ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <Text style={styles.shelfButtonText}>Rafıma Ekle</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.shelfButton, styles.shelfButtonWishlist, (isAdding || isAddingShelf) && styles.addButtonDisabled]}
              onPress={() => handleAddToShelf(item, 'wishlist')}
              disabled={isAdding || isAddingShelf}
            >
              <Text style={styles.shelfButtonTextWishlist}>İstek Listesi</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Ürün, marka, içerik ara..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.key || 'all'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterPill,
                categoryFilter === item.key && styles.filterPillActive,
              ]}
              onPress={() => setCategoryFilter(item.key as ProductCategory | '')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  categoryFilter === item.key && styles.filterPillTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {products.length} ÜRÜN
          {search.trim() ? ` "${search.trim()}"` : ''}
          {categoryFilter ? ` • ${PRODUCT_CATEGORY_LABELS[categoryFilter as ProductCategory]}` : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Ürün bulunamadı.</Text>
              <Text style={styles.emptySubtext}>
                Arama kriterlerini değiştirin veya kendi ürününüzü ekleyin.
              </Text>
            </View>
          }
        />
      )}

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => router.push('/products/add')}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>Ürün Ekle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3ef',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  filters: {
    marginBottom: 12,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingRight: 40,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#fce7f3',
  },
  filterPillText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#ec4899',
  },
  resultsRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardImageWrap: {
    width: 100,
    height: 100,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#9ca3af',
  },
  cardBody: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  cardBrand: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 6,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ec4899',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonDisabled: {
    opacity: 0.7,
  },
  addButtonIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  shelfButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  shelfButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
  },
  shelfButtonWishlist: {
    backgroundColor: '#f3e8ff',
  },
  shelfButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
  },
  shelfButtonTextWishlist: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7c3aed',
  },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ec4899',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  fabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
