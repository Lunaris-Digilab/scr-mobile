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
import { Colors } from '../../constants/Colors';
import { useLanguage } from '../../context/LanguageContext';

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
  const { t } = useLanguage();
  const isEdit = Boolean(params.stepId);
  const [name, setName] = useState(params.name ?? '');
  const [description, setDescription] = useState(params.description ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: isEdit ? t('editProduct') : t('addProduct'),
    });
  }, [isEdit, navigation]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert(t('error'), t('addProductErrorName'));
      return;
    }
    if (!params.routineId) {
      Alert.alert(t('error'), t('routineNotFound'));
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
      Alert.alert(t('error'), t('saveFailed'));
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
        <Text style={styles.label}>{t('productName')}</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: Gentle Cleanser"
          placeholderTextColor={Colors.textSecondary}
          value={name}
          onChangeText={setName}
          editable={!loading}
          autoCapitalize="words"
        />
        <Text style={styles.label}>{t('description')}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder="Örn: Hydrating Formula"
          placeholderTextColor={Colors.textSecondary}
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
            <ActivityIndicator color={Colors.buttonText} />
          ) : (
            <Text style={styles.buttonText}>
              {isEdit ? t('update') : t('add')}
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
    backgroundColor: Colors.background,
    padding: 20,
  },
  form: {
    backgroundColor: Colors.card,
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
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: Colors.primary,
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
    color: Colors.buttonText,
  },
});
