import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { createProduct } from '../../lib/products';
import { getCategories } from '../../lib/categories';
import { addStepToRoutine } from '../../lib/routines';
import type { Category } from '../../types/category';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronDown, Lock, Star } from 'lucide-react-native';

type ProductType = 'commercial' | 'other';

export default function AddProductScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { routineId, routineType } = useLocalSearchParams<{ routineId?: string; routineType?: string }>();
  const [productType, setProductType] = useState<ProductType>('commercial');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [additionalExpanded, setAdditionalExpanded] = useState(false);
  const [ingredients, setIngredients] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('error'), t('addProductErrorName'));
      return;
    }
    setLoading(true);
    try {
      const product = await createProduct({
        name: trimmedName,
        company_name: companyName.trim() || undefined,
        category_id: categoryId ?? undefined,
        ingredients_text: ingredients.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        is_private: isPrivate,
        rating: rating > 0 ? rating : undefined,
      });

      // Eğer rutin sayfasından açıldıysa, ürünü rutine ekle
      if (routineId && product) {
        await addStepToRoutine(routineId, {
          name: trimmedName,
          description: selectedCategory?.name || t('product'),
          product_id: product.id,
          order: 0,
        });
        Alert.alert(t('addProductSaved'), t('addProductSavedAndRoutine'), [
          { text: t('addProductOk'), onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(t('addProductSaved'), t('addProductSavedOnly'), [
          { text: t('addProductOk'), onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('addProductSaveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
       <Text style={styles.headerTitle}>{t('addProductTitle')}</Text>
        <Pressable
          style={styles.headerBtn}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.headerSubmit}>{t('addProductSubmit')}</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionLabel}>{t('addProductTypeLabel')}</Text>
        <View style={styles.typeRow}>
          <Pressable
            style={[styles.typeCard, productType === 'commercial' && styles.typeCardSelected]}
            onPress={() => setProductType('commercial')}
            disabled={loading}
          >
            <View style={[styles.radio, productType === 'commercial' && styles.radioSelected]} />
            <Text style={[styles.typeTitle, productType === 'commercial' && styles.typeTitleSelected]}>
              {t('addProductCommercial')}
            </Text>
            <Text style={[styles.typeDesc, productType === 'commercial' && styles.typeDescSelected]}>
              {t('addProductCommercialDesc')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeCard, productType === 'other' && styles.typeCardSelected]}
            onPress={() => setProductType('other')}
            disabled={loading}
          >
            <View style={[styles.radio, productType === 'other' && styles.radioSelected]} />
            <Text style={[styles.typeTitle, productType === 'other' && styles.typeTitleSelected]}>
              {t('addProductOther')}
            </Text>
            <Text style={[styles.typeDesc, productType === 'other' && styles.typeDescSelected]}>
              {t('addProductOtherDesc')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>{t('addProductCategory')}</Text>
          <Pressable
            style={styles.dropdown}
            onPress={() => setShowCategoryPicker(true)}
            disabled={loading}
          >
            <Text style={[styles.dropdownText, !selectedCategory && styles.dropdownPlaceholder]}>
              {selectedCategory?.name ?? t('addProductNone')}
            </Text>
            <ChevronDown size={18} color={Colors.textSecondary} />
          </Pressable>

          <Text style={styles.fieldLabel}>{t('addProductBrand')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('addProductBrandPlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            value={companyName}
            onChangeText={setCompanyName}
            editable={!loading}
          />

          <Text style={styles.fieldLabel}>{t('addProductName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('addProductNamePlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
            editable={!loading}
          />

          <View style={styles.privacyRow}>
            <Lock size={18} color={Colors.textSecondary} />
            <Text style={styles.privacyText}>{t('addProductPrivacy')}</Text>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: Colors.lightGray, true: Colors.light }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        <Text style={styles.ratingQuestion}>
          {t('addProductRatingQuestion')}
        </Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              style={styles.starBtn}
              onPress={() => setRating(n)}
              disabled={loading}
            >
              <Star
                size={28}
                color={n <= rating ? Colors.primary : Colors.lightGray}
                fill={n <= rating ? Colors.primary : 'transparent'}
              />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.additionalHeader}
          onPress={() => setAdditionalExpanded(!additionalExpanded)}
        >
          <View>
            <Text style={styles.additionalTitle}>{t('addProductAdditional')}</Text>
            <Text style={styles.additionalSub}>{t('addProductAdditionalSub')}</Text>
          </View>
          <ChevronDown
            size={20}
            color={Colors.textSecondary}
            style={{ transform: [{ rotate: additionalExpanded ? '180deg' : '0deg' }] }}
          />
        </Pressable>
        {additionalExpanded && (
          <View style={styles.additionalCard}>
            {!selectedCategory && (
              <Text style={styles.additionalHint}>{t('addProductSelectCategoryFirst')}</Text>
            )}
            <Text style={styles.fieldLabel}>{t('addProductIngredients')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder={t('addProductIngredientsPlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              value={ingredients}
              onChangeText={setIngredients}
              editable={!loading}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.fieldLabel}>{t('addProductImageUrl')}</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor={Colors.textSecondary}
              value={imageUrl}
              onChangeText={setImageUrl}
              editable={!loading}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('addProductModalTitle')}</Text>
            <FlatList
              data={[{ id: '', name: t('addProductNone') }, ...categories]}
              keyExtractor={(item) => item.id || 'none'}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.modalItem}
                  onPress={() => {
                    setCategoryId(item.id || null);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </Pressable>
              )}
            />
            <Pressable style={styles.modalClose} onPress={() => setShowCategoryPicker(false)}>
              <Text style={styles.modalCloseText}>{t('addProductModalClose')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  headerBtn: {
    minWidth: 64,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 10,
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSubmit: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.light,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    marginBottom: 8,
  },
  radioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  typeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  typeTitleSelected: {
    color: Colors.primary,
  },
  typeDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  typeDescSelected: {
    color: Colors.text,
  },
  formCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
  },
  dropdownPlaceholder: {
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 8,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  ratingQuestion: {
    fontSize: 15,
    color: Colors.text,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  starBtn: {
    padding: 4,
  },
  additionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  additionalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  additionalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  additionalCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  additionalHint: {
    fontSize: 12,
    color: Colors.error,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalClose: {
    padding: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
});
