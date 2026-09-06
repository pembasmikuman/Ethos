import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useScheme, useTheme } from '../lib/theme';
import { Dock } from '../components/Dock';

export default function Layout() {
  const t = useTheme();
  const scheme = useScheme();
  const [loaded] = useFonts({
    'DotoRound-900': require('../../assets/fonts/DotoRound-900.ttf'),
    'DotoRound-700': require('../../assets/fonts/DotoRound-700.ttf'),
    JetBrainsMono_500Medium: require('../../assets/fonts/JetBrainsMono_500Medium.ttf'),
    JetBrainsMono_600SemiBold: require('../../assets/fonts/JetBrainsMono_600SemiBold.ttf'),
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  return (
    <>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Screen name="rest" options={{ presentation: 'modal' }} />
        </Stack>
        <Dock />
      </GestureHandlerRootView>
    </>
  );
}
