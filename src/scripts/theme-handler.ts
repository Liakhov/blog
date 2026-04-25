const THEME_KEY = 'theme';
const Themes = { LIGHT: 'light', DARK: 'dark' } as const satisfies Record<string, Theme>;

// 1. Pick up the value already set by the inline script in <head>
let themeValue: Theme = (window.theme?.themeValue as Theme) ?? Themes.LIGHT;

function reflectPreference(): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeValue);

  const themeBtn = document.querySelector('#theme-btn');
  themeBtn?.setAttribute('aria-label', `Current theme: ${themeValue}`);

  // Update meta theme-color for mobile browsers
  if (document.body) {
    const bgColor = getComputedStyle(document.body).backgroundColor;
    document.querySelector("meta[name='theme-color']")?.setAttribute('content', bgColor);
  }
}

function setPreference(): void {
  localStorage.setItem(THEME_KEY, themeValue);
  reflectPreference();
}

// 2. Upgrade the minimal inline API to a full-featured one
window.theme = {
  ...window.theme,
  getTheme: () => themeValue,
  setTheme: (val: Theme) => {
    themeValue = val;
    setPreference();
  }
};

function initThemeFeatures(): void {
  reflectPreference();

  const themeBtn = document.querySelector('#theme-btn');
  // Important: remove old listener if any (useful for Astro View Transitions)
  themeBtn?.replaceWith(themeBtn.cloneNode(true));
  document.querySelector('#theme-btn')?.addEventListener('click', () => {
    themeValue = themeValue === Themes.LIGHT ? Themes.DARK : Themes.LIGHT;
    window.theme.setTheme(themeValue);
  });
}

// Initialize
initThemeFeatures();

// Astro specific listeners
document.addEventListener('astro:after-swap', initThemeFeatures);

// Cross-tab sync
window.addEventListener('storage', e => {
  if (e.key === THEME_KEY && e.newValue) {
    themeValue = e.newValue as Theme;
    reflectPreference();
  }
});
