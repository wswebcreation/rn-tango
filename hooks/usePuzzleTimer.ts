import { useTangoStore } from '@/store/useTangoStore';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function usePuzzleTimer(puzzleId: number, isSolved: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const { puzzlesState, startTimer, stopTimer, pauseTimer, resumeTimer } = useTangoStore();
  const appStateRef = useRef(AppState.currentState);
  const intervalRef = useRef<number | null>(null);
  const isFocused = useIsFocused();
  
  const puzzleState = puzzlesState[puzzleId];

  useEffect(() => {
    if (!puzzleState) {
      startTimer(puzzleId);
      return;
    }

    if (!isSolved && !puzzleState.isTimerRunning && puzzleState.totalTime === 0) {
      startTimer(puzzleId);
    }

    if (!isSolved && !puzzleState.isTimerRunning && puzzleState.totalTime > 0 && AppState.currentState === 'active' && isFocused) {
      resumeTimer(puzzleId);
    }

    if (isSolved && puzzleState.isTimerRunning) {
      stopTimer(puzzleId);
    }
  }, [puzzleId, isSolved, puzzleState, startTimer, stopTimer, resumeTimer, isFocused]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!isFocused) {
        return;
      }
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        const currentState = useTangoStore.getState().puzzlesState[puzzleId];
        
        if (currentState?.isTimerRunning) {
          pauseTimer(puzzleId);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } else if (nextAppState === 'active' && (appStateRef.current === 'background' || appStateRef.current === 'inactive')) {
        const currentState = useTangoStore.getState().puzzlesState[puzzleId];
        
        if (currentState && !currentState.isSolved && !currentState.isTimerRunning && isFocused) {
          resumeTimer(puzzleId);
        }
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [puzzleId, pauseTimer, resumeTimer, isFocused]);

  useEffect(() => {
    if (!puzzleState || isSolved) {
      setElapsed(puzzleState?.totalTime || 0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (puzzleState.isTimerRunning && puzzleState.startTime && AppState.currentState === 'active' && isFocused) {
      intervalRef.current = setInterval(() => {
        const currentState = useTangoStore.getState().puzzlesState[puzzleId];
        
        if (currentState?.isTimerRunning && currentState.startTime && AppState.currentState === 'active' && isFocused) {
          const currentElapsed = Math.floor((Date.now() - currentState.startTime) / 1000);
          setElapsed(currentState.totalTime + currentElapsed);
        } else {
          setElapsed(currentState?.totalTime || 0);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }, 1000);
    } else {
      setElapsed(puzzleState.totalTime);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [puzzleId, puzzleState, isSolved, isFocused]);

  useEffect(() => {
    if (!isFocused) {
      const currentState = useTangoStore.getState().puzzlesState[puzzleId];
      if (currentState?.isTimerRunning) {
        pauseTimer(puzzleId);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isFocused, puzzleId, pauseTimer]);

  return elapsed;
} 