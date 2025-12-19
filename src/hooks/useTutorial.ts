import { useState, useEffect } from 'react';

const TUTORIAL_STORAGE_KEY = 'teacher-tutorial-completed';

export function useTutorial() {
  const [runTutorial, setRunTutorial] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!completed) {
      // First visit - auto start tutorial after a short delay
      const timer = setTimeout(() => {
        setStepIndex(0);
        setRunTutorial(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setTutorialCompleted(true);
    }
  }, []);

  const startTutorial = (fromStep: number = 0) => {
    // First stop any existing tutorial to force Joyride to remount
    setRunTutorial(false);
    setStepIndex(fromStep);
    // Use setTimeout to ensure the reset happens before starting
    setTimeout(() => {
      setRunTutorial(true);
    }, 50);
  };

  const completeTutorial = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setRunTutorial(false);
    setTutorialCompleted(true);
  };

  const skipTutorial = () => {
    setRunTutorial(false);
    // Don't mark as completed - will show again next visit
  };

  const neverShowAgain = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setRunTutorial(false);
    setTutorialCompleted(true);
  };

  const resetTutorial = () => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    setTutorialCompleted(false);
    setStepIndex(0);
    setRunTutorial(true);
  };

  return {
    runTutorial,
    tutorialCompleted,
    stepIndex,
    setStepIndex,
    startTutorial,
    completeTutorial,
    skipTutorial,
    neverShowAgain,
    resetTutorial,
  };
}
