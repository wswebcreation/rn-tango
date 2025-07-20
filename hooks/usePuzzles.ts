import { loadLocalPuzzles } from '@/lib/puzzleStorage';
import { Puzzle } from '@/types/tango';
import { useEffect, useState } from 'react';

export function usePuzzles() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  return { puzzles, loading, error };
}
