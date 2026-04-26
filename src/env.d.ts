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

declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ANALYTICS_SALT: string;
    CRON_SECRET: string;
  }
}
