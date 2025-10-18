const activeTabs = new Set();

chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'toggle-notes') return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab?.url) return;

    try {
        await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        console.log('Content script alive in tab', tab.id);

        chrome.tabs.sendMessage(tab.id, {
            action: 'urlChanged',
            url: tab.url
        }).catch((e) => console.error('Failed to notify URL:', e));
    } catch (e) {
        console.log('Content script not found, injecting...');

        try {
            await chrome.scripting.insertCSS({
                target: { tabId: tab.id },
                files: ['styles.css']
            });

            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            console.log('Successfully injected into', tab.url);
        } catch (error) {
            console.error('Failed to inject:', error);
            return;
        }
    }

    activeTabs.add(tab.id);

    chrome.tabs.sendMessage(tab.id, { action: 'toggleNotes' }).catch((e) => {
        console.error(e);
    });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (!activeTabs.has(details.tabId)) return;

    console.log('SPA navigation detected:', details.url);
    chrome.tabs.sendMessage(details.tabId, {
        action: 'urlChanged',
        url: details.url
    }).catch(() => {
        console.log('Content script gone, removing from active tabs');
        activeTabs.delete(details.tabId);
    });
});

chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) return;
    if (!activeTabs.has(details.tabId)) return;

    console.log('Full page navigation detected, removing from active tabs:', details.tabId);
    activeTabs.delete(details.tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
    activeTabs.delete(tabId);
});