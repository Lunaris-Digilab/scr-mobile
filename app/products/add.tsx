import { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { createProduct } from '../../lib/products';
import { PRODUCT_CATEGORY_LABELS, type ProductCategory } from '../../types/product';

const CATEGORIES: ProductCategory[] = [
  'cleanser',
  'toner',
  'serum',
  'moisturizer',
  'sunscreen',
  'mask',
  'treatment',
  'eye_cream',
  'other',
];

export default function AddProductScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const [ingredients, setIngredients] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Hata', 'Ürün adı girin.');
      return;
    }
    setLoading(true);
    try {
      await createProduct({
        name: trimmedName,
        brand: brand.trim() || undefined,
        category: category || undefined,
        ingredients_text: ingredients.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
      });
      Alert.alert('Kaydedildi', 'Ürün eklendi.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Ürün eklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <Text style={styles.label}>Ürün adı *</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Hyaluronic Water Gel"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />
          <Text style={styles.label}>Marka</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Neutrogena"
            placeholderTextColor="#9ca3af"
            value={brand}
            onChangeText={setBrand}
            editable={!loading}
          />
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.categoryWrap}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                style={[
                  styles.categoryPill,
                  category === cat && styles.categoryPillActive,
                ]}
                onPress={() => setCategory(category === cat ? '' : cat)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    category === cat && styles.categoryPillTextActive,
                  ]}
                >
                  {PRODUCT_CATEGORY_LABELS[cat]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>İçerik / Notlar (isteğe bağlı)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="İçerik listesi veya notlar"
            placeholderTextColor="#9ca3af"
            value={ingredients}
            onChangeText={setIngredients}
            editable={!loading}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.label}>Görsel URL (isteğe bağlı)</Text>
          <TextInput
            style={styles.input}
            placeholder="https://..."
            placeholderTextColor="#9ca3af"
            value={imageUrl}
            onChangeText={setImageUrl}
            editable={!loading}
            keyboardType="url"
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ürün Ekle</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3ef',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  categoryPillActive: {
    backgroundColor: '#fce7f3',
  },
  categoryPillText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryPillTextActive: {
    color: '#ec4899',
  },
  button: {
    backgroundColor: '#ec4899',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
