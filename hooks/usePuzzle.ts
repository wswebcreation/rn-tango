import { getPuzzleById } from '@/lib/puzzleStorage';
import { Puzzle } from '@/types/tango';
import { useEffect, useState } from 'react';

export function usePuzzle(currentPuzzleId: number) {
  const [puzzle, setPuzzle] = useState<Puzzle | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    async function loadPuzzle() {
      setLoading(true);
      try {
        const foundPuzzle = await getPuzzleById(currentPuzzleId);
        if (foundPuzzle) {
          setPuzzle(foundPuzzle);
        } else {
          console.error(`❌ Puzzle with id ${currentPuzzleId} not found.`);
          setPuzzle(undefined);
        }
      } catch (error) {
        console.error('Failed to load puzzle:', error);
        setPuzzle(undefined);
      } finally {
        setLoading(false);
      }
    }

    loadPuzzle();
  }, [currentPuzzleId, refreshTrigger]);

  const refreshPuzzle = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return { puzzle, loading, refreshPuzzle };
}
