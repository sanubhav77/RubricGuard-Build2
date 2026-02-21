import React, { useState, useEffect } from 'react';
import { GradingSessionProvider } from './context/GradingSessionContext';
import { GradingScreen } from './types';
import S1_Setup from './screens/S1_Setup';
import S2_Calibration from './screens/S2_Calibration';
import S3_ActiveGrading from './screens/S3_ActiveGrading';
import S4_LiveAnalytics from './screens/S4_LiveAnalytics';
import S5_Reflection from './screens/S5_Reflection';
import S6_Finalization from './screens/S6_Finalization';
import ThemeToggle from './components/ThemeToggle'; // Import the new ThemeToggle component

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<GradingScreen>(GradingScreen.Setup);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    // Initialize theme from localStorage or default to 'system'
    const savedTheme = localStorage.getItem('theme');
    return (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') ? savedTheme : 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (theme === 'dark' || (theme === 'system' && prefersDark.matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    // Listen for changes in system preference if theme is 'system'
    const mediaQueryListener = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    prefersDark.addEventListener('change', mediaQueryListener);

    // Save theme to localStorage whenever it changes
    localStorage.setItem('theme', theme);

    return () => {
      prefersDark.removeEventListener('change', mediaQueryListener);
    };
  }, [theme]); // Re-run effect when theme changes

  const renderScreen = () => {
    switch (currentScreen) {
      case GradingScreen.Setup:
        return <S1_Setup setScreen={setCurrentScreen} />;
      case GradingScreen.Calibration:
        return <S2_Calibration setScreen={setCurrentScreen} />;
      case GradingScreen.ActiveGrading:
        return <S3_ActiveGrading setScreen={setCurrentScreen} />;
      case GradingScreen.LiveAnalytics:
        return <S4_LiveAnalytics setScreen={setCurrentScreen} />;
      case GradingScreen.Reflection:
        return <S5_Reflection setScreen={setCurrentScreen} />;
      case GradingScreen.Finalization:
        return <S6_Finalization setScreen={setCurrentScreen} />;
      default:
        return <S1_Setup setScreen={setCurrentScreen} />;
    }
  };

  return (
    <GradingSessionProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
        {/* Top Header (mock for now, can be expanded) */}
        <header className="bg-white dark:bg-gray-800 shadow-sm p-4 sticky top-0 z-10">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI Grading Assistant</h1>
            {/* Theme Toggle */}
            <ThemeToggle currentTheme={theme} setTheme={setTheme} />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 container mx-auto p-4 md:p-8">
          {renderScreen()}
        </main>
      </div>
    </GradingSessionProvider>
  );
};

export default App;