import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ScanLine, Camera as CameraIcon } from 'lucide-react-native';
import { lookupByBarcode } from '../../lib/barcode-lookup';
import { extractProductFromPhoto } from '../../lib/extract-product';
import { prepareImage } from '../../lib/storage';
import { setPendingPrefill, type ProductPrefill } from '../../lib/product-prefill';
import { isCurrentUserAdmin } from '../../lib/profile-role';
import { useLanguage } from '../../context/LanguageContext';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';
import { haptic } from '../../lib/haptics';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();
  const { routineId, routineType } = useLocalSearchParams<{ routineId?: string; routineType?: string }>();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const handledRef = useRef(false);

  // Admin-only feature — verify before showing the camera (server also enforces).
  useEffect(() => {
    isCurrentUserAdmin()
      .then((ok) => {
        setAllowed(ok);
        if (!ok) router.replace('/products/add');
      })
      .catch(() => {
        setAllowed(false);
        router.replace('/products/add');
      });
  }, [router]);

  const goToForm = useCallback(
    (prefill: ProductPrefill | null) => {
      if (prefill) setPendingPrefill(prefill);
      router.replace({ pathname: '/products/add', params: { routineId, routineType } });
    },
    [router, routineId, routineType]
  );

  const onBarcodeScanned = useCallback(
    async (res: BarcodeScanningResult) => {
      if (busy || handledRef.current) return;
      handledRef.current = true;
      setBusy(true);
      haptic.success();
      const prefill = await lookupByBarcode(res.data);
      if (prefill) {
        goToForm(prefill);
      } else {
        handledRef.current = false;
        setBusy(false);
        setStatusMsg(t('scanBarcodeNotFound'));
      }
    },
    [busy, goToForm, t]
  );

  const onReadLabel = useCallback(async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    handledRef.current = true;
    setStatusMsg(t('scanAnalyzing'));
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!pic?.uri) throw new Error('no picture');
      const prepared = await prepareImage(pic.uri);
      const prefill = await extractProductFromPhoto(prepared, locale ?? 'tr');
      if (prefill) {
        goToForm(prefill);
      } else {
        Alert.alert('', t('scanCouldntExtract'), [
          {
            text: t('addProductOk'),
            onPress: () => goToForm({ source: 'ai', photo: prepared, autoFilledKeys: [] }),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
      handledRef.current = false;
      setBusy(false);
      setStatusMsg(t('scanCouldntExtract'));
    }
  }, [busy, goToForm, locale, t]);

  // Not an admin (or still verifying) — render nothing; effect redirects away.
  if (allowed !== true) {
    return <View style={styles.permissionContainer} />;
  }

  // Permission still resolving
  if (!permission) {
    return <View style={styles.permissionContainer} />;
  }

  // Permission not granted — prompt
  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top + 40 }]}>
        <Pressable style={styles.closeBtnLight} hitSlop={10} onPress={() => router.back()}>
          <X size={24} color={Colors.text} />
        </Pressable>
        <CameraIcon size={48} color={Colors.medium} />
        <Text style={styles.permTitle}>{t('scanPermissionTitle')}</Text>
        <Text style={styles.permBody}>{t('scanPermissionBody')}</Text>
        <Pressable style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>{t('scanGrantPermission')}</Text>
        </Pressable>
        <Pressable onPress={() => goToForm(null)}>
          <Text style={styles.permManual}>{t('scanEnterManually')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={busy ? undefined : onBarcodeScanned}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.closeBtn} hitSlop={10} onPress={() => router.back()}>
          <X size={24} color={Colors.white} />
        </Pressable>
        <Text style={styles.topTitle}>{t('scanTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Framing reticle */}
      <View style={styles.reticleWrap} pointerEvents="none">
        <View style={styles.reticle} />
        <Text style={styles.hint}>{statusMsg || t('scanModeHint')}</Text>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          style={[styles.shutter, busy && styles.shutterDisabled]}
          onPress={onReadLabel}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={t('scanReadLabel')}
        >
          {busy ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <ScanLine size={24} color={Colors.white} />
          )}
          <Text style={styles.shutterText}>{busy ? t('scanAnalyzing') : t('scanReadLabel')}</Text>
        </Pressable>
      </View>

      {busy && <View style={styles.busyVeil} pointerEvents="none" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  closeBtnLight: { position: 'absolute', top: 0, left: 16, padding: 8 },
  permTitle: {
    fontSize: 19,
    fontFamily: Typography.bold,
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  permBody: {
    fontSize: 14,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  permButton: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  permButtonText: { fontSize: 15, fontFamily: Typography.semibold, color: Colors.white },
  permManual: { marginTop: 8, fontSize: 14, fontFamily: Typography.medium, color: Colors.textSecondary },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontFamily: Typography.semibold, color: Colors.white },

  reticleWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  reticle: {
    width: '70%',
    aspectRatio: 1,
    maxHeight: '46%',
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  hint: {
    fontSize: 14,
    fontFamily: Typography.medium,
    color: Colors.white,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 24,
  },

  bottomBar: { alignItems: 'center', paddingHorizontal: 24 },
  shutter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
  },
  shutterDisabled: { opacity: 0.7 },
  shutterText: { fontSize: 16, fontFamily: Typography.semibold, color: Colors.white },

  busyVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
});
