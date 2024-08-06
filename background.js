const initializeContextMenu = () => {
  chrome.contextMenus.create({
    id: "searchCourse",
    title: "What's That Course?",
    contexts: ["selection"]
  });
};

const resetDetectionState = () => {
  chrome.storage.local.set({ detectCoursesRunning: false });
};


chrome.runtime.onInstalled.addListener(() => {
  initializeContextMenu();
  resetDetectionState();
});

chrome.runtime.onStartup.addListener(resetDetectionState);

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "searchCourse") {
    const selectedText = info.selectionText.trim();
    chrome.storage.local.set({ courseCode: selectedText });
    chrome.action.openPopup();
  }
});

let activeTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'courseLink':
      chrome.tabs.create({ url: message.courseLink });
      break;
    case 'startDetection':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id !== undefined) {
          activeTabId = tabs[0].id;
          chrome.storage.local.set({ detectCoursesRunning: true });
          sendResponse({ status: 'ok' });
        } else {
          console.error('No active tab found for startDetection');
          sendResponse({ status: 'error', message: 'No active tab found' });
        }
      });
      return true; // Will respond asynchronously
    case 'detectionComplete':
      chrome.storage.local.set({ detectCoursesRunning: false });
      activeTabId = null;
      sendResponse({ status: 'ok' });
      return true; // Will respond asynchronously
  }
});


chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    chrome.storage.local.set({ detectCoursesRunning: false });
    activeTabId = null;
  }
});