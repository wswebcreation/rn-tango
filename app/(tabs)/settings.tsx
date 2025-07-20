import React from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '@/constants/Colors';
// import { useQueensStore } from '@/store/useQueensStore';
import { Button } from '@/components/ui/Button';

const SettingsScreen = () => {
  const handleReset = async () => {
    Alert.alert(
      'Reset App State',
      'Are you sure you want to reset all puzzle progress?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            // Do nothing for now
            // await AsyncStorage.removeItem('queens-puzzle-storage');
            // useQueensStore.setState({
            //   currentPuzzleId: 333,
            //   puzzlesState: {},
            //   solvedPuzzles: [],
            // });
            // useQueensStore.persist.rehydrate();
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
