import { fetchAndStorePuzzles, fetchRemoteVersion, getLastUpdated, loadLocalVersion } from '@/lib/puzzleManager';
import { useEffect, useState } from 'react';

export function usePuzzlesMetadata() {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const updatedAt = await getLastUpdated();
      setLastUpdated(updatedAt);

      await checkForUpdate(); 
      setLoading(false);
    }
    load();
  }, [refreshTrigger]);

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
    try {
      await fetchAndStorePuzzles();
      const updatedAt = await getLastUpdated();
      setLastUpdated(updatedAt);
      setUpdateAvailable(false);
    } catch (error) {
      console.error('❌ Failed to update puzzles:', error);
    } finally {
      setLoading(false);
    }
  }

  const refreshMetadata = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { loading, lastUpdated, updateAvailable, checkForNewPuzzles, refreshMetadata };
}
