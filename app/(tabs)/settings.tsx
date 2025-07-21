import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { fetchRemoteVersion, loadLocalVersion, resetToFallbackPuzzles } from '@/lib/puzzleManager';
import { useTangoStore } from '@/store/useTangoStore';

const SettingsScreen = () => {
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <ScrollView contentContainerStyle={styles.list}>
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueBg,
    padding: 20,
  },
  title: {
    color: Colors.text,
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
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 0,
  },
});

export default SettingsScreen;
