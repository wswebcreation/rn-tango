import { Colors } from '@/constants/Colors';
import { useTangoStore } from '@/store/useTangoStore';
import { useColorScheme } from 'react-native';

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const themePreference = useTangoStore(state => state.themePreference);
  
  // Determine the active theme based on user preference
  const getActiveTheme = (): 'light' | 'dark' => {
    if (themePreference === 'light') return 'light';
    if (themePreference === 'dark') return 'dark';
    // 'auto' - follow system preference
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  };
  
  const activeTheme = getActiveTheme();
  
  return {
    colors: Colors[activeTheme],
    theme: activeTheme,
    isDark: activeTheme === 'dark',
    isLight: activeTheme === 'light',
  };
};
