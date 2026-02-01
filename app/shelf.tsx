import { useEffect, useState, useCallback } from 'react';
import { Package, Plus } from 'lucide-react-native';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getUserProducts, removeFromShelf, updateUserProduct } from '../lib/user-products';
import { getShelfBadge } from '../lib/shelf-badge';
import type { UserProductWithProduct, UserProductStatus } from '../types/user-product';
import { Colors } from '../constants/Colors';

const TABS: { key: UserProductStatus; label: string }[] = [
  { key: 'opened', label: 'Rafım' },
  { key: 'wishlist', label: 'İstek Listesi' },
  { key: 'empty', label: 'Bitenler' },
];

export default function ShelfScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<UserProductStatus>('opened');
  const [items, setItems] = useState<UserProductWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadShelf = useCallback(async (uid: string, status: UserProductStatus) => {
    try {
      setLoading(true);
      const list = await getUserProducts(uid, status);
      setItems(list);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Liste yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);
      loadShelf(user.id, activeTab);
    });
  }, [activeTab, loadShelf, router]);

  useFocusEffect(
    useCallback(() => {
      if (userId) loadShelf(userId, activeTab);
    }, [userId, activeTab, loadShelf])
  );

  const handleCardLongPress = (item: UserProductWithProduct) => {
    const productName = item.products?.name ?? 'Ürün';
    const buttons: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }> = [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Listeden çıkar',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFromShelf(item.id);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } catch (e) {
            Alert.alert('Hata', 'Kaldırılamadı.');
          }
        },
      },
    ];
    if (item.status === 'opened') {
      buttons.splice(1, 0, {
        text: 'Bitenlere taşı',
        onPress: async () => {
          try {
            await updateUserProduct(item.id, { status: 'empty' });
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } catch (e) {
            Alert.alert('Hata', 'Güncellenemedi.');
          }
        },
      });
    }
    Alert.alert(productName, 'Ne yapmak istiyorsunuz?', buttons);
  };

  const renderCard = ({ item }: { item: UserProductWithProduct }) => {
    const product = item.products;
    if (!product) return null;

    const badge = getShelfBadge(
      item.expiration_date,
      item.date_opened,
      item.status
    );

    return (
      <Pressable
        style={styles.card}
        onLongPress={() => handleCardLongPress(item)}
      >
        <View style={styles.cardImageWrap}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.cardImagePlaceholderText}>
                {product.name.charAt(0)}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.badge,
              badge.isWarning ? styles.badgeWarning : styles.badgeNormal,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                badge.isWarning ? styles.badgeTextWarning : styles.badgeTextNormal,
              ]}
              numberOfLines={1}
            >
              {badge.text}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          {product.brand ? (
            <Text style={styles.cardBrand} numberOfLines={1}>
              {product.brand.toUpperCase()}
            </Text>
          ) : null}
          <Text style={styles.cardName} numberOfLines={2}>
            {product.name}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (!userId && !loading) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Rafım</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map(({ key, label }) => (
          <Pressable
            key={key}
            style={styles.tab}
            onPress={() => setActiveTab(key)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === key && styles.tabLabelActive,
              ]}
            >
              {label}
            </Text>
            {activeTab === key ? (
              <View style={styles.tabIndicator} />
            ) : null}
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          numColumns={2}
          key="grid"
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Package size={48} color={Colors.textSecondary} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>
                {activeTab === 'opened' && 'Henüz rafınızda ürün yok.'}
                {activeTab === 'wishlist' && 'İstek listeniz boş.'}
                {activeTab === 'empty' && 'Biten ürün yok.'}
              </Text>
              <Text style={styles.emptySubtext}>
                Ürünler sayfasından ekleyin.
              </Text>
            </View>
          }
        />
      )}

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={() => router.push('/(tabs)/products')}
      >
        <Plus size={20} color={Colors.white} />
        <Text style={styles.fabText}>Ürün Ekle</Text>
      </Pressable>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  tab: {
    position: 'relative',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 20,
  },
  tabLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '700',
    color: Colors.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  empty: {
    flex: 1,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 0.9,
    position: 'relative',
    backgroundColor: Colors.lightGray,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.gray,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '70%',
  },
  badgeNormal: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  badgeWarning: {
    backgroundColor: '#fecaca', // Keep as red for warning
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextNormal: {
    color: Colors.text,
  },
  badgeTextWarning: {
    color: '#b91c1c',
  },
  cardBody: {
    padding: 10,
  },
  cardBrand: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  fabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});
