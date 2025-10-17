const injectedTabs = new Set();

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle-notes') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            await injectNotesIfNeeded(tab.id);
            chrome.tabs.sendMessage(tab.id, { action: 'toggleNotes' }).catch(() => {
                // Ignore errors if content script isn't ready yet
            });
        }
    }
});

async function injectNotesIfNeeded(tabId) {
    if (injectedTabs.has(tabId)) {
        return;
    }

    try {
        await chrome.scripting.insertCSS({
            target: { tabId },
            files: ['styles.css']
        });

        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        });

        injectedTabs.add(tabId);

        chrome.tabs.onRemoved.addListener((closedTabId) => {
            if (closedTabId === tabId) {
                injectedTabs.delete(closedTabId);
            }
        });
    } catch (error) {
        console.error('Failed to inject notes:', error);
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
        injectedTabs.delete(tabId);
    }
});

