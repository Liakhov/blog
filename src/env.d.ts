type Theme = 'light' | 'dark';

interface Window {
  theme: {
    themeValue: Theme;
    getTheme: () => Theme;
    setTheme: (val: Theme) => void;
    s?: () => void;
    reflectPreference?: () => void;
  };
}

interface CloudflareEnv {
  DB: D1Database;
  ANALYTICS_SALT: string;
}
