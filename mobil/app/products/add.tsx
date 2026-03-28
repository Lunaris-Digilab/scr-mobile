import { useState, useEffect, useCallback } from 'react';
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
import { searchCompanies, getOrCreateCompany } from '../../lib/companies';
import { addStepToRoutine } from '../../lib/routines';
import type { Category } from '../../types/category';
import type { Company } from '../../types/company';
import type { ProductTexture, UsageTime, SizeUnit, TargetArea } from '../../types/product';
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronDown, Lock, Star, Search, Plus } from 'lucide-react-native';

type ProductType = 'commercial' | 'other';

export default function AddProductScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { routineId, routineType } = useLocalSearchParams<{ routineId?: string; routineType?: string }>();
  const [productType, setProductType] = useState<ProductType>('commercial');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  // Brand picker state
  const [brandSearch, setBrandSearch] = useState('');
  const [brandResults, setBrandResults] = useState<Company[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Company | null>(null);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);

  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [additionalExpanded, setAdditionalExpanded] = useState(false);
  const [ingredients, setIngredients] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // New skincare fields
  const [description, setDescription] = useState('');
  const [sizeValue, setSizeValue] = useState('');
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('ml');
  const [texture, setTexture] = useState<ProductTexture | ''>('');
  const [usageTime, setUsageTime] = useState<UsageTime | ''>('');
  const [spf, setSpf] = useState('');
  const [shelfLifeMonths, setShelfLifeMonths] = useState('');
  const [targetArea, setTargetArea] = useState<TargetArea | ''>('');
  const [isCrueltyFree, setIsCrueltyFree] = useState(false);
  const [isVegan, setIsVegan] = useState(false);
  const [isFragranceFree, setIsFragranceFree] = useState(false);
  const [isParabenFree, setIsParabenFree] = useState(false);
  const [isAlcoholFree, setIsAlcoholFree] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, []);

  // Brand search debounce
  useEffect(() => {
    if (!brandSearch.trim()) { setBrandResults([]); return; }
    setBrandLoading(true);
    const timer = setTimeout(() => {
      searchCompanies(brandSearch.trim())
        .then(setBrandResults)
        .catch(() => setBrandResults([]))
        .finally(() => setBrandLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [brandSearch]);

  const handleSelectBrand = (company: Company) => {
    setSelectedBrand(company);
    setBrandSearch(company.name);
    setShowBrandPicker(false);
  };

  const handleAddNewBrand = async () => {
    const trimmed = brandSearch.trim();
    if (!trimmed) return;
    setBrandLoading(true);
    try {
      const company = await getOrCreateCompany(trimmed);
      if (company) {
        setSelectedBrand(company);
        setBrandSearch(company.name);
      }
    } catch { /* ignore */ }
    setBrandLoading(false);
    setShowBrandPicker(false);
  };

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
        company_id: selectedBrand?.id ?? undefined,
        company_name: !selectedBrand ? brandSearch.trim() || undefined : undefined,
        category_id: categoryId ?? undefined,
        description: description.trim() || undefined,
        ingredients_text: ingredients.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        is_private: isPrivate,
        rating: rating > 0 ? rating : undefined,
        size_value: sizeValue ? parseFloat(sizeValue) : undefined,
        size_unit: sizeValue ? sizeUnit : undefined,
        texture: texture || undefined,
        usage_time: usageTime || undefined,
        spf: spf ? parseInt(spf, 10) : undefined,
        shelf_life_months: shelfLifeMonths ? parseInt(shelfLifeMonths, 10) : undefined,
        target_area: targetArea || undefined,
        is_cruelty_free: isCrueltyFree || undefined,
        is_vegan: isVegan || undefined,
        is_fragrance_free: isFragranceFree || undefined,
        is_paraben_free: isParabenFree || undefined,
        is_alcohol_free: isAlcoholFree || undefined,
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
          <Pressable
            style={styles.dropdown}
            onPress={() => setShowBrandPicker(true)}
            disabled={loading}
          >
            <Text style={[styles.dropdownText, !selectedBrand && !brandSearch && styles.dropdownPlaceholder]}>
              {selectedBrand?.name ?? (brandSearch || t('addProductBrandPlaceholder'))}
            </Text>
            <Search size={18} color={Colors.textSecondary} />
          </Pressable>

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
            <Text style={styles.fieldLabel}>{t('addProductDescription')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder={t('addProductDescriptionPlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              editable={!loading}
              multiline
              numberOfLines={2}
            />

            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>{t('addProductSize')}</Text>
                <View style={styles.sizeRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="50"
                    placeholderTextColor={Colors.textSecondary}
                    value={sizeValue}
                    onChangeText={setSizeValue}
                    keyboardType="numeric"
                    editable={!loading}
                  />
                  <View style={styles.unitPicker}>
                    {(['ml', 'g', 'oz'] as SizeUnit[]).map((u) => (
                      <Pressable
                        key={u}
                        style={[styles.unitBtn, sizeUnit === u && styles.unitBtnActive]}
                        onPress={() => setSizeUnit(u)}
                      >
                        <Text style={[styles.unitBtnText, sizeUnit === u && styles.unitBtnTextActive]}>{u}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.fieldLabel}>SPF</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  placeholderTextColor={Colors.textSecondary}
                  value={spf}
                  onChangeText={setSpf}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>{t('addProductTexture')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {(['cream', 'gel', 'liquid', 'foam', 'oil', 'serum', 'lotion', 'mist', 'balm', 'other'] as ProductTexture[]).map((tx) => (
                <Pressable
                  key={tx}
                  style={[styles.chip, texture === tx && styles.chipActive]}
                  onPress={() => setTexture(texture === tx ? '' : tx)}
                >
                  <Text style={[styles.chipText, texture === tx && styles.chipTextActive]}>{tx}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{t('addProductUsageTime')}</Text>
            <View style={styles.chipRow}>
              {([['AM', t('routineMorning')], ['PM', t('routineEvening')], ['both', t('addProductBothAmPm')]] as [UsageTime, string][]).map(([v, label]) => (
                <Pressable
                  key={v}
                  style={[styles.chip, usageTime === v && styles.chipActive]}
                  onPress={() => setUsageTime(usageTime === v ? '' : v)}
                >
                  <Text style={[styles.chipText, usageTime === v && styles.chipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('addProductTargetArea')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {(['face', 'eye', 'lip', 'body', 'hand', 'hair', 'scalp'] as TargetArea[]).map((a) => (
                <Pressable
                  key={a}
                  style={[styles.chip, targetArea === a && styles.chipActive]}
                  onPress={() => setTargetArea(targetArea === a ? '' : a)}
                >
                  <Text style={[styles.chipText, targetArea === a && styles.chipTextActive]}>{a}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('addProductCertifications')}</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Cruelty-Free</Text>
              <Switch value={isCrueltyFree} onValueChange={setIsCrueltyFree} trackColor={{ false: Colors.lightGray, true: Colors.medium }} thumbColor={Colors.white} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Vegan</Text>
              <Switch value={isVegan} onValueChange={setIsVegan} trackColor={{ false: Colors.lightGray, true: Colors.medium }} thumbColor={Colors.white} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Fragrance-Free</Text>
              <Switch value={isFragranceFree} onValueChange={setIsFragranceFree} trackColor={{ false: Colors.lightGray, true: Colors.medium }} thumbColor={Colors.white} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Paraben-Free</Text>
              <Switch value={isParabenFree} onValueChange={setIsParabenFree} trackColor={{ false: Colors.lightGray, true: Colors.medium }} thumbColor={Colors.white} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Alcohol-Free</Text>
              <Switch value={isAlcoholFree} onValueChange={setIsAlcoholFree} trackColor={{ false: Colors.lightGray, true: Colors.medium }} thumbColor={Colors.white} />
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{t('addProductIngredients')}</Text>
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

      {/* Brand Picker Modal */}
      <Modal
        visible={showBrandPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBrandPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowBrandPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('addProductBrandSelect')}</Text>
            <View style={styles.brandSearchWrap}>
              <Search size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.brandSearchInput}
                placeholder={t('addProductBrandPlaceholder')}
                placeholderTextColor={Colors.textSecondary}
                value={brandSearch}
                onChangeText={(text) => { setBrandSearch(text); setSelectedBrand(null); }}
                autoFocus
              />
              {brandLoading && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>
            <FlatList
              data={brandResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.modalItem} onPress={() => handleSelectBrand(item)}>
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </Pressable>
              )}
              ListHeaderComponent={
                brandSearch.trim() && !brandResults.find((b) => b.name.toLowerCase() === brandSearch.trim().toLowerCase()) ? (
                  <Pressable style={[styles.modalItem, styles.brandAddNew]} onPress={handleAddNewBrand}>
                    <Plus size={16} color={Colors.primary} />
                    <Text style={[styles.modalItemText, { color: Colors.primary, marginLeft: 8 }]}>
                      "{brandSearch.trim()}" {t('addProductBrandAddNew')}
                    </Text>
                  </Pressable>
                ) : null
              }
              ListEmptyComponent={
                !brandLoading && brandSearch.trim() ? (
                  <Text style={styles.brandEmptyText}>{t('productsNoResults')}</Text>
                ) : null
              }
            />
            <Pressable style={styles.modalClose} onPress={() => setShowBrandPicker(false)}>
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
  // Brand picker
  brandSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  brandSearchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },
  brandAddNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light,
  },
  brandEmptyText: {
    padding: 16,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  // Skincare fields
  rowFields: {
    flexDirection: 'row',
    marginTop: 4,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitPicker: {
    flexDirection: 'row',
    gap: 4,
  },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  unitBtnTextActive: {
    color: Colors.white,
  },
  chipScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
    marginBottom: 4,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  chipTextActive: {
    color: Colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 14,
    color: Colors.text,
  },
});
