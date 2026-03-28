# APK Oluşturma

Uygulamayı Android APK olarak dışa aktarmak için iki yöntem kullanılabilir.

## 1. EAS Build (Önerilen – Java gerekmez)

Expo sunucularında bulutta derleme yapar. İlk kez kullanıyorsanız bir Expo hesabı gerekir.

```bash
# İlk kez: projeyi EAS'a bağla (Expo hesabı ile giriş yapmanız istenir)
npx eas-cli login
npx eas-cli init

# İlk kez Android build: Keystore oluşturmak için bir kez interaktif çalıştırın.
# "Generate new keystore" veya benzeri seçeneği onaylayın. Sonrasında npm run build:apk kullanabilirsiniz.
npx eas build --platform android --profile preview

# Sonraki APK'lar (CI veya tek komutla; keystore zaten EAS'ta kayıtlı)
npm run build:apk
```

Build bittikten sonra Expo sayfasından veya e-postadaki linkten APK dosyasını indirebilirsiniz.

**Production (yayın) APK için:**

```bash
npm run build:apk:prod
```

**Ortam değişkenleri:** EAS Build, `.env` dosyasını buluta göndermez. Supabase ve Google Client ID değerlerini EAS’ta tanımlamanız gerekir:

```bash
npx eas-cli secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://api.glowist.app/" --type string
npx eas-cli secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --type string
npx eas-cli secret:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "YOUR_WEB_CLIENT_ID" --type string
npx eas-cli secret:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "YOUR_IOS_CLIENT_ID" --type string
```

**APK açılmıyorsa (hemen kapanıyorsa):**

1. **Ortam değişkenleri:** EAS’ta yukarıdaki secret’lar tanımlı olmalı. Eksikse uygulama açılırken çökebilir. Expo dashboard → proje → Secrets bölümünden kontrol edin.
2. **Android crash log:** Telefonu USB ile bilgisayara bağlayıp (USB hata ayıklama açık) şunu çalıştırın:
   ```bash
   adb logcat *:E | head -100
   ```
   veya sadece uygulama logları:
   ```bash
   adb logcat | grep -i "ReactNative\|Expo\|glowist\|FATAL"
   ```
   Çıkan hata mesajı nedeni (native veya JS) gösterecektir.

---

## 2. Yerel derleme (Java JDK gerekir)

Bilgisayarınızda JDK 17 kurulu olmalıdır.

```bash
# Android projesi zaten oluşturulduysa bu adımı atlayın
npx expo prebuild --platform android --clean

# Release APK oluştur
cd android && ./gradlew assembleRelease
```

APK dosyası:  
`android/app/build/outputs/apk/release/app-release.apk`

İlk release build’de imzalama (keystore) ayarlanması istenebilir; `android/app/build.gradle` içinde `signingConfigs` bölümünü düzenlemeniz gerekir.
