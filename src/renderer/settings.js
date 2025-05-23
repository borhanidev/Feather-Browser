const { ipcRenderer } = require('electron');
const Store = require('electron-store');
const store = new Store();

// DOM Elements
const themeSelect = document.getElementById('theme-select');
const tabStyleSelect = document.getElementById('tab-style-select');
const searchEngineSelect = document.getElementById('search-engine-select');
const trackingProtectionSelect = document.getElementById('tracking-protection-select');
const homepageInput = document.getElementById('homepage-input');
const downloadLocationInput = document.getElementById('download-location-input');
const themePreview = document.getElementById('theme-preview');
const useCustomHomepageToggle = document.getElementById('use-custom-homepage-toggle');

// Default settings
const defaultSettings = {
  theme: 'light',
  tabStyle: 'rounded',
  searchEngine: 'google',
  trackingProtection: 'standard',
  homepage: 'https://www.google.com',
  downloadLocation: '~/Downloads',
  useCustomHomepage: true
};

// Load settings
function loadSettings() {
  const settings = store.get('settings') || defaultSettings;
  
  themeSelect.value = settings.theme;
  tabStyleSelect.value = settings.tabStyle;
  searchEngineSelect.value = settings.searchEngine;
  trackingProtectionSelect.value = settings.trackingProtection;
  homepageInput.value = settings.homepage;
  downloadLocationInput.value = settings.downloadLocation;
  useCustomHomepageToggle.checked = settings.useCustomHomepage;
  
  updateThemePreview(settings.theme);
  applySettings(settings);
}

// Save settings
function saveSettings() {
  const settings = {
    theme: themeSelect.value,
    tabStyle: tabStyleSelect.value,
    searchEngine: searchEngineSelect.value,
    trackingProtection: trackingProtectionSelect.value,
    homepage: homepageInput.value,
    downloadLocation: downloadLocationInput.value,
    useCustomHomepage: useCustomHomepageToggle.checked
  };
  
  store.set('settings', settings);
  applySettings(settings);
  ipcRenderer.send('settings-updated', settings);
}

// Apply settings
function applySettings(settings) {
  // Handle system theme preference
  if (settings.theme === 'system') {
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDarkMode ? 'dark' : 'light');
    
    // Listen for changes in system theme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
  } else {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }
  
  document.documentElement.setAttribute('data-tab-style', settings.tabStyle);
}

// Update theme preview
function updateThemePreview(theme) {
  if (theme === 'system') {
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    themePreview.style.backgroundColor = prefersDarkMode ? '#202124' : '#ffffff';
    themePreview.style.border = prefersDarkMode ? '1px solid #5f6368' : '1px solid #dfe1e5';
    themePreview.style.backgroundImage = 'linear-gradient(45deg, #202124 50%, #ffffff 50%)';
  } else {
    themePreview.style.backgroundColor = theme === 'dark' ? '#202124' : '#ffffff';
    themePreview.style.border = theme === 'dark' ? '1px solid #5f6368' : '1px solid #dfe1e5';
    themePreview.style.backgroundImage = 'none';
  }
}

// Event listeners
themeSelect.addEventListener('change', () => {
  updateThemePreview(themeSelect.value);
  saveSettings();
});

tabStyleSelect.addEventListener('change', saveSettings);
searchEngineSelect.addEventListener('change', saveSettings);
trackingProtectionSelect.addEventListener('change', saveSettings);
homepageInput.addEventListener('change', saveSettings);
downloadLocationInput.addEventListener('change', saveSettings);
useCustomHomepageToggle.addEventListener('change', saveSettings);

// Initialize settings
loadSettings();