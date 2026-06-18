import { useEffect, useState, useCallback, useRef } from 'react';
import { Package, Plus, Trash2, Archive, Heart, CheckCircle2, Ellipsis } from 'lucide-react-native';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  Image,
  Platform,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
  FadeInUp,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getUserProducts, removeFromShelf, updateUserProduct } from '../lib/user-products';
import { getShelfBadge } from '../lib/shelf-badge';
import type { UserProductWithProduct, UserProductStatus } from '../types/user-product';
import { getProductBrandDisplay } from '../types/product';
import { Colors, Shadows } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { useLanguage } from '../context/LanguageContext';
import { AnimatedCard } from '../components/AnimatedCard';
import { ShelfGridSkeleton } from '../components/Skeleton';
import { BottomSheet, type BottomSheetAction } from '../components/BottomSheet';
import { haptic } from '../lib/haptics';

/* ---------- Animated Badge Pulse ---------- */
function PulseBadge({ text, isWarning }: { text: string; isWarning: boolean }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isWarning) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [isWarning]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: isWarning ? pulse.value : 1,
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        isWarning ? styles.badgeWarning : styles.badgeNormal,
        pulseStyle,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          isWarning ? styles.badgeTextWarning : styles.badgeTextNormal,
        ]}
        numberOfLines={1}
      >
        {text}
      </Text>
    </Animated.View>
  );
}

export default function ShelfScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fabBottomOffset = insets.bottom + (Platform.OS === 'ios' ? 96 : 82);
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<UserProductStatus>('opened');

  const TABS: { key: UserProductStatus; label: string }[] = [
    { key: 'opened', label: t('shelfMyShelf') },
    { key: 'wishlist', label: t('shelfWishlist') },
    { key: 'empty', label: t('shelfEmpty') },
  ];

  const [items, setItems] = useState<UserProductWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetItem, setSheetItem] = useState<UserProductWithProduct | null>(null);

  // Animated tab indicator
  const tabPositions = useRef<number[]>([]);
  const tabWidths = useRef<number[]>([]);
  const indicatorLeft = useSharedValue(0);
  const indicatorWidth = useSharedValue(60);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: indicatorLeft.value,
    width: indicatorWidth.value,
  }));

  const handleTabLayout = (index: number, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    tabPositions.current[index] = x;
    tabWidths.current[index] = width;
    const tabIdx = TABS.findIndex((t) => t.key === activeTab);
    if (index === tabIdx) {
      indicatorLeft.value = x;
      indicatorWidth.value = width;
    }
  };

  useEffect(() => {
    const idx = TABS.findIndex((t) => t.key === activeTab);
    if (tabPositions.current[idx] !== undefined) {
      indicatorLeft.value = withSpring(tabPositions.current[idx], { damping: 18, stiffness: 120 });
      indicatorWidth.value = withSpring(tabWidths.current[idx], { damping: 18, stiffness: 120 });
    }
  }, [activeTab]);

  const loadShelf = useCallback(
    async (uid: string, status: UserProductStatus) => {
      try {
        setLoading(true);
        const list = await getUserProducts(uid, status);
        setItems(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
    haptic.medium();
    setSheetItem(item);
    setSheetVisible(true);
  };

  const moveToStatus = async (item: UserProductWithProduct, status: UserProductStatus) => {
    try {
      await updateUserProduct(item.id, { status });
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      haptic.success();
    } catch (e) {
      console.error(e);
    }
  };

  const getSheetActions = (): BottomSheetAction[] => {
    if (!sheetItem) return [];
    const actions: BottomSheetAction[] = [];
    const status = sheetItem.status;

    if (status !== 'opened') {
      actions.push({
        label: t('shelfMyShelf'),
        icon: <Package size={18} color={Colors.text} />,
        variant: 'default',
        onPress: () => moveToStatus(sheetItem, 'opened'),
      });
    }

    if (status !== 'wishlist') {
      actions.push({
        label: t('shelfWishlist'),
        icon: <Heart size={18} color={Colors.text} />,
        variant: 'default',
        onPress: () => moveToStatus(sheetItem, 'wishlist'),
      });
    }

    if (status !== 'empty') {
      actions.push({
        label: t('shelfEmpty'),
        icon: <CheckCircle2 size={18} color={Colors.text} />,
        variant: 'default',
        onPress: () => moveToStatus(sheetItem, 'empty'),
      });
    }

    actions.push({
      label: t('shelfRemove'),
      icon: <Trash2 size={18} color={Colors.error} />,
      variant: 'destructive',
      onPress: async () => {
        try {
          await removeFromShelf(sheetItem.id);
          setItems((prev) => prev.filter((i) => i.id !== sheetItem.id));
          haptic.success();
        } catch (e) {
          console.error(e);
        }
      },
    });

    actions.push({
      label: t('cancel'),
      variant: 'default',
      onPress: () => {},
    });

    return actions;
  };

  const renderCard = ({ item, index }: { item: UserProductWithProduct; index: number }) => {
    const product = item.products;
    if (!product) return null;
    const brand = getProductBrandDisplay(product);
    const badge = getShelfBadge(t, item.expiration_date, item.date_opened, item.status);

    return (
      <Animated.View
        entering={FadeInDown.delay(index * 50).duration(400)}
        style={{ width: '48%' }}
      >
        <AnimatedCard
          style={styles.card}
          onPress={() => router.push(`/products/${product.id}`)}
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
            <PulseBadge text={badge.text} isWarning={badge.isWarning} />
          </View>
          <View style={styles.cardBody}>
            {brand ? (
              <Text style={styles.cardBrand} numberOfLines={1}>
                {brand.toUpperCase()}
              </Text>
            ) : null}
            <View style={styles.cardNameRow}>
              <Text style={styles.cardName} numberOfLines={2}>
                {product.name}
              </Text>
              <Pressable
                style={styles.cardStatusBtn}
                accessibilityRole="button"
                accessibilityLabel={t('a11yMoreOptions')}
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleCardLongPress(item);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ellipsis size={16} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </AnimatedCard>
      </Animated.View>
    );
  };

  if (!userId && !loading) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.title}>{t('shelfMyShelf')}</Text>
      </Animated.View>

      {/* Animated Tabs */}
      <View style={styles.tabs}>
        <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
        {TABS.map(({ key, label }, idx) => (
          <Pressable
            key={key}
            style={styles.tab}
            onPress={() => {
              haptic.light();
              setActiveTab(key);
            }}
            onLayout={(e) => handleTabLayout(idx, e)}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === key && styles.tabLabelActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ paddingTop: 16 }}>
          <ShelfGridSkeleton />
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
            { paddingBottom: insets.bottom + 170 },
          ]}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Animated.View entering={FadeInUp.duration(500)} style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Package size={40} color={Colors.medium} />
              </View>
              <Text style={styles.emptyText}>
                {activeTab === 'opened' && t('shelfEmptyOpened')}
                {activeTab === 'wishlist' && t('shelfEmptyWishlist')}
                {activeTab === 'empty' && t('shelfEmptyFinished')}
              </Text>
              <Text style={styles.emptySubtext}>{t('shelfAddFromProducts')}</Text>
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
            haptic.light();
            router.push('/(tabs)/products');
          }}
        >
          <Plus size={20} color={Colors.white} />
          <Text style={styles.fabText}>{t('shelfAddProduct')}</Text>
        </Pressable>
      </Animated.View>

      {/* Bottom Sheet */}
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={sheetItem?.products?.name ?? t('product')}
        message={t('shelfWhatToDo')}
        actions={getSheetActions()}
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: Typography.bold,
    color: Colors.text,
  },

  /* Tabs */
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 4,
    position: 'relative',
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 20,
  },
  tabLabel: {
    fontSize: 15,
    fontFamily: Typography.medium,
    color: Colors.textSecondary,
  },
  tabLabelActive: {
    fontFamily: Typography.bold,
    color: Colors.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  /* Grid */
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
    borderRadius: 14,
    overflow: 'hidden',
    ...Shadows.card,
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
    fontFamily: Typography.bold,
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
    backgroundColor: Colors.warningBackground,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: Typography.semibold,
  },
  badgeTextNormal: {
    color: Colors.text,
  },
  badgeTextWarning: {
    color: Colors.warningText,
  },
  cardBody: {
    padding: 10,
  },
  cardBrand: {
    fontSize: 11,
    fontFamily: Typography.semibold,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  cardName: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.semibold,
    color: Colors.text,
  },
  cardStatusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
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
