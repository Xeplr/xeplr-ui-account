import { createContext, useContext, useState, useCallback, useEffect } from 'react';

var STORAGE_KEY = 'xeplr-theme';
var DEFAULT_THEME = 'dark';
var BUILT_IN_THEMES = ['dark', 'light', 'medium', 'bright'];

var ThemeContext = createContext(null);

/**
 * ThemeProvider — wraps your app to provide theme state.
 *
 * Props:
 *   theme       — initial theme name (default: 'dark', or last saved)
 *   persist     — save to localStorage (default: true)
 *   children    — React children
 *
 * The provider applies a `xeplr-theme-{name}` class to a wrapper div.
 * Any xeplr-ui component inside will pick up the theme via CSS variables.
 *
 * Usage:
 *   <ThemeProvider theme="dark">
 *     <App />
 *   </ThemeProvider>
 *
 * Custom themes:
 *   1. Define `.xeplr-theme-corporate { --xeplr-bg-primary: ...; }` in your CSS
 *   2. Use <ThemeProvider theme="corporate">
 */
export function ThemeProvider({ theme: initialTheme, persist = true, children }) {
  var [theme, setThemeState] = useState(function() {
    if (persist) {
      try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return saved;
      } catch (e) {}
    }
    return initialTheme || DEFAULT_THEME;
  });

  var setTheme = useCallback(function(newTheme) {
    setThemeState(newTheme);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, newTheme); } catch (e) {}
    }
  }, [persist]);

  var value = {
    theme: theme,
    setTheme: setTheme,
    themes: BUILT_IN_THEMES,
    className: 'xeplr-theme-' + theme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <div className={'xeplr-theme-' + theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

/**
 * useTheme — access current theme and setter.
 *
 * Returns null if no ThemeProvider is wrapping the app.
 * Use useThemeStrict() if you want it to throw.
 *
 * Returns: { theme, setTheme, themes, className }
 */
export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * useThemeStrict — throws if no ThemeProvider found.
 */
export function useThemeStrict() {
  var ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('[xeplr] useThemeStrict() must be used inside <ThemeProvider>');
  return ctx;
}

export { BUILT_IN_THEMES, DEFAULT_THEME };
