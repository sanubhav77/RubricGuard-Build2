import React from 'react';

interface ThemeToggleProps {
  currentTheme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ currentTheme, setTheme }) => {
  const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];

  const getNextTheme = (current: 'light' | 'dark' | 'system'): 'light' | 'dark' | 'system' => {
    const currentIndex = themes.indexOf(current);
    const nextIndex = (currentIndex + 1) % themes.length;
    return themes[nextIndex];
  };

  const handleClick = () => {
    setTheme(getNextTheme(currentTheme));
  };

  const renderIcon = () => {
    switch (currentTheme) {
      case 'light':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
        ); // Sun icon
      case 'dark':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
          </svg>
        ); // Moon icon
      case 'system':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9.25 21H14.75L14.25 17M12 4C5.5 4 2 8 2 11V15H22V11C22 8 18.5 4 12 4Z"></path>
          </svg>
        ); // Computer / System icon
      default:
        return null;
    }
  };

  const tooltipText = `Switch to ${getNextTheme(currentTheme).charAt(0).toUpperCase() + getNextTheme(currentTheme).slice(1)} Mode`;

  return (
    <button
      onClick={handleClick}
      aria-label={tooltipText}
      title={tooltipText}
      className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      {renderIcon()}
    </button>
  );
};

export default ThemeToggle;