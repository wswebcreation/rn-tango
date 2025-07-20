import { fetchAndStorePuzzles, fetchRemoteVersion, getLastUpdated, loadLocalVersion, loadPuzzles } from '@/lib/puzzleManager';
import { useEffect, useState } from 'react';
import { resetPuzzlesCache } from './usePuzzle';
// import { useQueensStore } from '@/store/useQueensStore';

export function usePuzzlesMetadata() {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  // const { setPuzzlesList } = useQueensStore();

  useEffect(() => {
    async function load() {
      setLoading(true);

      const puzzles = await loadPuzzles();
      // setPuzzlesList(puzzles);

      const updatedAt = await getLastUpdated();
      setLastUpdated(updatedAt);

      await checkForUpdate(); 
      setLoading(false);
    }
    load();
  }, [
    // setPuzzlesList
  ]);

  async function checkForUpdate() {
    try {
      const remote = await fetchRemoteVersion();
      const local = await loadLocalVersion();
      setUpdateAvailable(remote > local);
    } catch (error) {
      console.error('❌ Failed to check puzzle update:', error);
    }
  }

  async function checkForNewPuzzles() {
    setLoading(true);
    await fetchAndStorePuzzles();
    resetPuzzlesCache();
    const updatedAt = await getLastUpdated();
    setLastUpdated(updatedAt);
    setUpdateAvailable(false);
    setLoading(false);
  }

  return { loading, lastUpdated, updateAvailable, checkForNewPuzzles };
}
