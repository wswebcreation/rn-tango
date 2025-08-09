import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { fetchRemoteVersion, loadLocalVersion, resetToFallbackPuzzles } from '@/lib/puzzleManager';
import { useTangoStore } from '@/store/useTangoStore';
import { ThemePreference } from '@/types/tango';

const SettingsScreen = () => {
  const { themePreference, setThemePreference } = useTangoStore();
  const { colors } = useTheme();

  const themeOptions: { label: string; value: ThemePreference }[] = [
    { label: 'From OS', value: 'auto' },
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
  ];
  const handleReset = async () => {
    Alert.alert(
      'Reset App State',
      'Are you sure you want to reset all puzzle progress? This will clear your solving history and times.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('tango-puzzle-storage');
              useTangoStore.setState({
                currentPuzzleId: 1,
                puzzlesState: {},
                solvedPuzzles: [],
              });
              Alert.alert('Success', 'App state has been reset.');
            } catch (error) {
              console.error('Failed to reset app state:', error);
              Alert.alert('Error', 'Failed to reset app state.');
            }
          },
        },
      ]
    );
  };

  const handleResetToFallback = async () => {
    Alert.alert(
      'Reset to Default Puzzles',
      'Are you sure you want to remove downloaded puzzles and go back to the default puzzle set?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetToFallbackPuzzles();
              
              try {
                const remote = await fetchRemoteVersion();
                const local = await loadLocalVersion();
                const updateAvailable = remote > local;
                
                if (updateAvailable) {
                  Alert.alert(
                    'Success', 
                    'Reset to default puzzles. New puzzles are now available for download on the Home screen.'
                  );
                } else {
                  Alert.alert(
                    'Success', 
                    'Reset to default puzzles. The app will now use the built-in puzzle set.'
                  );
                }
              } catch {
                Alert.alert(
                  'Success', 
                  'Reset to default puzzles. Check the Home screen for available updates.'
                );
              }
            } catch (error) {
              console.error('Failed to reset to fallback:', error);
              Alert.alert('Error', 'Failed to reset to default puzzles.');
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.blueBg,
      padding: 20,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    list: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    section: {
      width: '100%',
      marginBottom: 32,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      textAlign: 'center',
    },
    button: {
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
      width: '100%',
      alignItems: 'center',
      borderWidth: 0,
    },
    themeButton: {
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      width: '100%',
      backgroundColor: colors.inactive,
      borderColor: colors.inactive,
      borderWidth: 1,
    },
    activeThemeButton: {
      backgroundColor: colors.active,
      borderColor: colors.active,
    },
    themeButtonText: {
      color: colors.inactiveText,
      fontSize: 16,
      fontWeight: '500',
    },
    activeThemeButtonText: {
      color: colors.activeText,
      fontWeight: 'bold',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <ScrollView contentContainerStyle={styles.list}>
        
        {/* Theme Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>
          {themeOptions.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              onPress={() => setThemePreference(option.value)}
              containerStyle={[
                styles.themeButton,
                themePreference === option.value && styles.activeThemeButton
              ]}
              textStyle={[
                styles.themeButtonText,
                themePreference === option.value && styles.activeThemeButtonText
              ]}
            />
          ))}
        </View>

        {/* App Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Management</Text>
          <Button 
            label="Reset App State"
            onPress={handleReset}
            containerStyle={styles.button}
          />
          <Button 
            label="Reset to Default Puzzles"
            onPress={handleResetToFallback}
            containerStyle={styles.button}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
