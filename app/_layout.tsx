import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="login"
          options={{ title: 'Giriş Yap', headerBackTitle: 'Geri' }}
        />
        <Stack.Screen
          name="register"
          options={{ title: 'Kayıt Ol', headerBackTitle: 'Geri' }}
        />
        <Stack.Screen
          name="routine/add-step"
          options={{
            title: 'Ürün Ekle',
            headerStyle: { backgroundColor: '#f5f3ef' },
            headerTintColor: '#1f2937',
            headerTitleStyle: { fontWeight: '600', color: '#1f2937' },
            headerBackTitle: 'Geri',
          }}
        />
        <Stack.Screen
          name="products/add"
          options={{
            title: 'Ürün Ekle',
            headerStyle: { backgroundColor: '#f5f3ef' },
            headerTintColor: '#1f2937',
            headerTitleStyle: { fontWeight: '600', color: '#1f2937' },
            headerBackTitle: 'Geri',
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
