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
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { addStepToRoutine, updateStepInRoutine } from '../../lib/routines';

export default function AddStepScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    routineId: string;
    type: string;
    stepId?: string;
    name?: string;
    description?: string;
  }>();

  const isEdit = Boolean(params.stepId);
  const [name, setName] = useState(params.name ?? '');
  const [description, setDescription] = useState(params.description ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? 'Ürünü Düzenle' : 'Ürün Ekle',
    });
  }, [isEdit, navigation]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Hata', 'Ürün adı girin.');
      return;
    }
    if (!params.routineId) {
      Alert.alert('Hata', 'Rutin bulunamadı.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && params.stepId) {
        await updateStepInRoutine(params.routineId, params.stepId, {
          name: trimmedName,
          description: description.trim() || undefined,
        });
      } else {
        await addStepToRoutine(params.routineId, {
          name: trimmedName,
          description: description.trim() || undefined,
          order: 0,
        });
      }
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert('Hata', 'Kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.form}>
        <Text style={styles.label}>Ürün adı</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: Gentle Cleanser"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
          editable={!loading}
          autoCapitalize="words"
        />
        <Text style={styles.label}>Açıklama (isteğe bağlı)</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Örn: Hydrating Formula"
          placeholderTextColor="#9ca3af"
          value={description}
          onChangeText={setDescription}
          editable={!loading}
          multiline
          numberOfLines={2}
        />
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isEdit ? 'Güncelle' : 'Ekle'}
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f3ef',
    padding: 20,
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
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#ec4899',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
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
