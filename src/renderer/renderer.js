const { ipcRenderer } = require('electron');
const { v4: uuidv4 } = require('uuid');

// DOM Elements
const tabsContainer = document.getElementById('tabs');
const webviewContainer = document.getElementById('webview-container');
const urlInput = document.getElementById('url-input');
const backButton = document.getElementById('back');
const forwardButton = document.getElementById('forward');
const reloadButton = document.getElementById('reload');
const newTabButton = document.getElementById('new-tab');
const bookmarkButton = document.getElementById('bookmark');
const menuButton = document.getElementById('menu');
const menuPopup = document.getElementById('menu-popup');

// State management
let tabs = [];
let activeTabId = null;

// Window controls
document.querySelector('.minimize').addEventListener('click', () => {
  ipcRenderer.send('minimize-window');
});

document.querySelector('.maximize').addEventListener('click', () => {
  ipcRenderer.send('maximize-window');
});

document.querySelector('.close').addEventListener('click', () => {
  ipcRenderer.send('close-window');
});

// Tab management
function createTab(url) {
  const tabId = uuidv4();
  const webview = document.createElement('webview');
  webview.setAttribute('data-tab-id', tabId);
  const initialUrl = url || 'file://' + __dirname + '/homepage.html';
  webview.setAttribute('src', initialUrl);
  webviewContainer.appendChild(webview);
  
  // Immediately hide URL if needed
  if (shouldHideUrl(initialUrl)) {
    urlInput.value = '';
  }
  
  // Set up navigation event listeners
  setupWebviewListeners(webview);
  
  // Create tab element
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.setAttribute('data-tab-id', tabId);
  tab.innerHTML = `
    <span class="tab-title">New Tab</span>
    <button class="tab-close">
      <span class="material-icons">close</span>
    </button>
  `;

  // Add click handler for tab activation
  tab.addEventListener('click', (e) => {
    if (!e.target.closest('.tab-close')) {
      setActiveTab(tabId);
    }
  });

  // Handle tab close
  tab.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tabId);
  });
  
  // Add elements to DOM
  tabsContainer.appendChild(tab);
  
  // Update state
  tabs.push({ id: tabId });
  setActiveTab(tabId);
  
  // Handle webview events
  webview.addEventListener('did-fail-load', () => {
    console.error('Failed to load URL:', url);
  });
  
  webview.addEventListener('crashed', () => {
    console.error('Webview crashed:', url);
    closeTab(tabId);
  });
}

ipcRenderer.on('tab-created', (event, tabId) => {
  // Create tab element
  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.setAttribute('data-tab-id', tabId);
  tab.innerHTML = `
    <span class="tab-title">New Tab</span>
    <button class="tab-close">
      <span class="material-icons">close</span>
    </button>
  `;

  // Add elements to DOM
  tabsContainer.appendChild(tab);

  // Update state
  tabs.push({ id: tabId });
  setActiveTab(tabId);
});

// URLs to hide from address bar
const hiddenUrls = [
  'file:///D:/Browser/src/renderer/homepage.html',
  'file:///C:/Users/borha/AppData/Local/Programs/modern-browser/resources/app.asar/src/renderer/homepage.html',
];

function shouldHideUrl(url) {
  return hiddenUrls.some(hiddenUrl => url.startsWith(hiddenUrl));
}

function setActiveTab(tabId) {
  // Update active tab
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab-id') === tabId);
  });
  
  document.querySelectorAll('webview').forEach(webview => {
    webview.classList.toggle('active', webview.getAttribute('data-tab-id') === tabId);
  });
  
  activeTabId = tabId;
  const activeWebview = getActiveWebview();
  if (activeWebview) {
    const currentUrl = activeWebview.getURL();
    urlInput.value = shouldHideUrl(currentUrl) ? '' : currentUrl;
    updateNavigationButtons(activeWebview);
  }
}

function closeTab(tabId) {
  const tabIndex = tabs.findIndex(tab => tab.id === tabId);
  if (tabIndex === -1) return;
  
  const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  const webviewElement = document.querySelector(`webview[data-tab-id="${tabId}"]`);
  
  if (tabElement) tabElement.remove();
  if (webviewElement) webviewElement.remove();

  const wasActive = activeTabId === tabId;
  tabs = tabs.filter(tab => tab.id !== tabId);

  if (wasActive) {
    if (tabs.length > 0) {
      const newActiveTab = tabs[Math.max(tabIndex - 1, 0)];
      setActiveTab(newActiveTab.id);
    } else {
      ipcRenderer.send('close-window');
    }
  }
}

function getActiveWebview() {
  return document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
}

function updateNavigationButtons(webview) {
  backButton.disabled = !webview.canGoBack();
  forwardButton.disabled = !webview.canGoForward();
}

// Handle messages from homepage webview
// Update the existing message listener
window.addEventListener('message', (event) => {
  if (event.data.type === 'open-url') {
    createTab(event.data.url);
  }
  // Keep existing loadURL handler
  if (event.data.type === 'loadURL' && event.data.url) {
    getActiveWebview().loadURL(event.data.url);
  }
});

// Navigation
urlInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    let url = urlInput.value.trim();
    
    // Don't attempt to load empty URLs
    if (!url) return;
    
    // Get current settings
    const currentSettings = store.get('settings') || {
      searchEngine: 'google'
    };
    
    // Search engine URLs
    const searchEngineUrls = {
      google: 'https://www.google.com/search?q=',
      bing: 'https://www.bing.com/search?q=',
      duckduckgo: 'https://duckduckgo.com/?q='
    };
    
    // Check if it's a valid URL or needs to be searched
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
      // Check if it might be a valid domain (contains a dot)
      if (url.includes('.') && !url.includes(' ')) {
        url = `https://${url}`;
      } else {
        // Use the configured search engine
        url = `${searchEngineUrls[currentSettings.searchEngine]}${encodeURIComponent(url)}`;
      }
    }
    
    try {
      const activeWebview = getActiveWebview();
      if (activeWebview) {
        activeWebview.loadURL(url);
        updateNavigationButtons(activeWebview);
      }
    } catch (error) {
      console.error('Failed to load URL:', error);
    }
  }
});

// Add navigation button event listeners
backButton.addEventListener('click', () => {
  const activeWebview = getActiveWebview();
  if (activeWebview && activeWebview.canGoBack()) {
    activeWebview.goBack();
    updateNavigationButtons(activeWebview);
  }
});

forwardButton.addEventListener('click', () => {
  const activeWebview = getActiveWebview();
  if (activeWebview && activeWebview.canGoForward()) {
    activeWebview.goForward();
    updateNavigationButtons(activeWebview);
  }
});

// Update navigation state when webview navigates
function setupWebviewListeners(webview) {
  webview.addEventListener('did-start-loading', () => {
    updateNavigationButtons(webview);
    const currentUrl = webview.getURL();
    if (shouldHideUrl(currentUrl)) {
      urlInput.value = '';
    }
    document.getElementById('loading-spinner').style.display = 'flex';
  });

  webview.addEventListener('did-stop-loading', () => {
    updateNavigationButtons(webview);
    const currentUrl = webview.getURL();
    if (shouldHideUrl(currentUrl)) {
      urlInput.value = '';
    } else {
      urlInput.value = currentUrl;
    }
    document.getElementById('loading-spinner').style.display = 'none';
  });

  webview.addEventListener('did-navigate', () => {
    updateNavigationButtons(webview);
    const currentUrl = webview.getURL();
    if (shouldHideUrl(currentUrl)) {
      urlInput.value = '';
    } else {
      urlInput.value = currentUrl;
    }
    document.getElementById('loading-spinner').style.display = 'none';
  });
}

backButton.addEventListener('click', () => {
  const webview = getActiveWebview();
  if (webview.canGoBack()) {
    webview.goBack();
  }
});

forwardButton.addEventListener('click', () => {
  const webview = getActiveWebview();
  if (webview.canGoForward()) {
    webview.goForward();
  }
});

reloadButton.addEventListener('click', () => {
  const webview = getActiveWebview();
  if (reloadButton.querySelector('.material-icons').textContent === 'refresh') {
    webview.reload();
  } else {
    webview.stop();
  }
});

// New tab
newTabButton.addEventListener('click', () => {
  createTab();
});

// Bookmarks
bookmarkButton.addEventListener('click', () => {
  const webview = getActiveWebview();
  ipcRenderer.send('add-bookmark', webview.getURL(), webview.getTitle());
});

// Menu popup functionality
menuButton.addEventListener('click', () => {
  menuPopup.style.display = menuPopup.style.display === 'block' ? 'none' : 'block';
});

// Close menu popup when clicking outside
document.addEventListener('click', (e) => {
  if (!menuButton.contains(e.target) && !menuPopup.contains(e.target)) {
    menuPopup.style.display = 'none';
  }
});

// Show bookmarks window
document.getElementById('show-bookmarks').addEventListener('click', () => {
  const bookmarksWindow = window.open('bookmarks.html', 'bookmarks', 'width=800,height=600');
  menuPopup.style.display = 'none';
});

// Handle bookmark notifications
ipcRenderer.on('bookmark-added', () => {
  bookmarkButton.classList.add('active');
  // Show notification
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = 'Page bookmarked!';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
    bookmarkButton.classList.remove('active');
  }, 2000);
});

// Handle URL loading from bookmarks
ipcRenderer.on('url-to-load', (event, url) => {
  createTab(url);
});

// Menu
menuButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const buttonRect = menuButton.getBoundingClientRect();
  menuPopup.style.top = `${buttonRect.bottom + 2}px`;
  menuPopup.style.right = `${window.innerWidth - buttonRect.right}px`;
  menuPopup.classList.toggle('show');
});

// Settings menu item
const settingsMenuItem = document.createElement('div');
settingsMenuItem.className = 'menu-item';
settingsMenuItem.innerHTML = '<span class="material-icons">settings</span> Settings';
settingsMenuItem.addEventListener('click', () => {
  ipcRenderer.send('open-settings');
  menuPopup.classList.remove('show');
});
menuPopup.appendChild(settingsMenuItem);

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  if (!menuButton.contains(e.target) && !menuPopup.contains(e.target)) {
    menuPopup.classList.remove('show');
  }
});

// Menu items
document.getElementById('show-bookmarks').addEventListener('click', () => {
  createTab('file://' + __dirname + '/bookmarks.html');
});

document.getElementById('show-history').addEventListener('click', () => {
  createTab('chrome://history');
});

document.getElementById('show-downloads').addEventListener('click', () => {
  createTab('chrome://downloads');
});

document.getElementById('show-settings').addEventListener('click', () => {
  ipcRenderer.send('open-settings');
});

// Settings handling
ipcRenderer.on('settings-updated', (event, settings) => {
  // Apply theme to browser UI
  document.documentElement.setAttribute('data-theme', settings.theme);
  document.documentElement.setAttribute('data-tab-style', settings.tabStyle);
  
  // Store updated settings for use in URL handling
  store.set('settings', settings);
});


// Load initial settings
const Store = require('electron-store');
const store = new Store();
const settings = store.get('settings') || {
  theme: 'light',
  tabStyle: 'rounded',
  searchEngine: 'google',
  trackingProtection: 'standard',
  homepage: 'https://www.google.com',
  downloadLocation: '~/Downloads'
};

// Apply initial settings
document.documentElement.setAttribute('data-theme', settings.theme);
document.documentElement.setAttribute('data-tab-style', settings.tabStyle);

// Initialize first tab
createTab();

window.onload = function() {
  const currentURL = window.location.href;
  const homepagePath = 'homepage.html';
  if (currentURL.includes(homepagePath)) {
    document.querySelector('.address-bar').value = '';
  }
};

// Add to message listener in renderer.js
window.addEventListener('message', (event) => {
  if (event.data.type === 'open-url') {
    createTab(event.data.url);
  }
});

// Zoom control
let zoomLevels = {}; // Store zoom levels for each tab

document.addEventListener('keydown', (e) => {
  const activeWebview = getActiveWebview();
  if (!activeWebview) return;

  // Get current zoom level for this tab
  const tabId = activeWebview.getAttribute('data-tab-id');
  if (!zoomLevels[tabId]) zoomLevels[tabId] = 1.0;

  // Handle zoom in (Ctrl + Plus or Ctrl + =)
  if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === 'Equal')) {
    e.preventDefault();
    zoomLevels[tabId] = Math.min(zoomLevels[tabId] + 0.1, 3.0);
    activeWebview.setZoomLevel(Math.log2(zoomLevels[tabId]));
  }

  // Handle zoom out (Ctrl + Minus)
  if ((e.ctrlKey || e.metaKey) && e.key === '-') {
    e.preventDefault();
    zoomLevels[tabId] = Math.max(zoomLevels[tabId] - 0.1, 0.3);
    activeWebview.setZoomLevel(Math.log2(zoomLevels[tabId]));
  }

  // Handle zoom reset (Ctrl + 0)
  if ((e.ctrlKey || e.metaKey) && e.key === '0') {
    e.preventDefault();
    zoomLevels[tabId] = 1.0;
    activeWebview.setZoomLevel(0);
  }
});