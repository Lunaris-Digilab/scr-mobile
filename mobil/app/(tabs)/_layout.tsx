import { Tabs } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { AnimatedTabBar } from '../../components/AnimatedTabBar';

export default function TabLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      initialRouteName="routine"
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="routine" options={{ title: t('tabRoutine') }} />
      <Tabs.Screen name="shelf" options={{ title: t('tabShelf') }} />
      <Tabs.Screen name="products" options={{ title: t('tabProducts') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabProfile') }} />
    </Tabs>
  );
}
