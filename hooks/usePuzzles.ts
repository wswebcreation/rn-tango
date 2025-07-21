import { loadLocalPuzzles } from '@/lib/puzzleStorage';
import { Puzzle } from '@/types/tango';
import { useEffect, useState } from 'react';

export function usePuzzles() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadPuzzles() {
      setLoading(true);
      try {
        const loadedPuzzles = await loadLocalPuzzles();
        setPuzzles(loadedPuzzles || []);
      } catch (err) {
        console.error('Failed to load puzzles:', err);
        setError('Failed to load puzzles');
      } finally {
        setLoading(false);
      }
    }

    loadPuzzles();
  }, [refreshTrigger]);

  const refreshPuzzles = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { puzzles, loading, error, refreshPuzzles };
}
