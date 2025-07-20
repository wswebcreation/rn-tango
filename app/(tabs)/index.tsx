import { BulletList } from '@/components/ui/BulletList';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { usePuzzlesMetadata } from '@/hooks/usePuzzlesMetadata';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const { loading, lastUpdated, checkForNewPuzzles, updateAvailable } = usePuzzlesMetadata();
    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
         ' ' + 
         date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Play</Text>
          <BulletList
            items={[
              'Fill the grid so that each cell contains either a sun (☀️) or a moon (🌑).',
              'No more than two suns or two moons may appear next to each other, either horizontally or vertically.',
              'Each row and column must contain the same number of suns and moons.',
              'Cells connected with a "=" sign must contain the same type (both ☀️ or both 🌑)',
              'Cells connected with a "× sign" must contain opposite types (one ☀️ and one 🌑).',
              'Each puzzle has exactly one correct solution, which can always be found through pure logic—guessing is never required.'
            ]}
          />
        </View>

        {lastUpdated && (
          <Text style={styles.lastUpdated}>Last Updated: {formatDate(lastUpdated)}</Text>
        )}

        {updateAvailable && (
          <View style={styles.updateWarning}>
            <Text style={styles.updateWarningText}>🚀 New puzzles available! Click &quot;Check for New Puzzles&quot;</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Button
            label={loading ? 'Checking...' : 'Check for New Puzzles'}
            containerStyle={styles.button}
            onPress={checkForNewPuzzles}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.blueBg,
  },
  content: {
    padding: 20,
    alignItems: 'center',
    },
  button: {
      width: '80%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
    },
    lastUpdated: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.text,
  },
    
  updateWarning: {
    marginTop: 16,
    backgroundColor: Colors.preFilled,
    borderColor: Colors.preFilled,
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  updateWarningText: {
    color: Colors.black,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
});
