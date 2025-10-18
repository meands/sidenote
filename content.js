(() => {
    'use strict';

    let state = null;

    function toggleNotepad() {
        if (!state) {
            loadInitialState((initialNote, initialPattern) => {
                state = NotepadState.getInstance(initialNote, initialPattern);
                const noteElement = state.getNoteElement();
                document.body.appendChild(noteElement);
                attachEventListeners(state);
                showNote(noteElement);
            });
            return;
        }

        const noteElement = state.getNoteElement();
        if (isNoteVisible(noteElement)) {
            hideNote(noteElement);
        } else {
            showNote(noteElement);
        }
    }

    function updateUrl() {
        const currentUrl = getUrlWithoutHash(window.location.href);

        if (!state || state.getCurrentPattern() === currentUrl) {
            console.log('URL unchanged, skipping update');
            return;
        }

        console.log('URL changed, loading new notes for:', currentUrl);
        loadInitialState((note, pattern) => {
            state.loadNote(note, pattern);
        });
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'ping') {
            sendResponse({ alive: true });
            return;
        }

        if (message.action === 'toggleNotes') {
            toggleNotepad();
            sendResponse({ success: true });
            return;
        }

        if (message.action === 'urlChanged') {
            updateUrl(message.url);
            sendResponse({ success: true });
            return;
        }
    });
})();

function loadInitialState(callback) {
    const currentUrl = getUrlWithoutHash(window.location.href);

    chrome.storage.local.get(null, (items) => {
        const patterns = Object.keys(items);
        const matchingPattern = patterns.find(pattern => {
            return pattern && currentUrl.startsWith(pattern);
        });

        if (matchingPattern && items[matchingPattern]) {
            callback(items[matchingPattern], matchingPattern);
        } else {
            callback('', currentUrl);
        }
    });
}

function createNoteElement() {
    const noteElement = document.createElement('div');
    noteElement.id = 'sidenote-container';
    noteElement.innerHTML = `
    <div class="sn-header">
        <input 
            type="text" 
            class="sn-url-input" 
            placeholder="URL pattern"
        />
        <button class="sn-btn sn-close" title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    </div>
    <textarea 
        class="sn-textarea" 
        placeholder="Notes..."
    ></textarea>
    `;
    return noteElement;
};

function setTextareaContent(noteElement, content) {
    const textarea = noteElement.querySelector('.sn-textarea');
    if (textarea) textarea.value = content;
};

function getUrlPattern(noteElement) {
    const input = noteElement.querySelector('.sn-url-input');
    return input ? input.value : '';
};

function setUrlPattern(noteElement, pattern) {
    const input = noteElement.querySelector('.sn-url-input');
    if (input) input.value = pattern;
};

function showNote(noteElement) {
    noteElement.style.display = 'flex';
};

function hideNote(noteElement) {
    noteElement.style.display = 'none';
};

function isNoteVisible(noteElement) {
    return noteElement.style.display === 'flex';
}

function saveNoteToStorage(pattern, content, onSuccess) {
    chrome.storage.local.set({ [pattern]: content }, onSuccess);
};

function removeNoteFromStorage(pattern, onSuccess) {
    chrome.storage.local.remove(pattern, onSuccess);
};

class NotepadState {
    static #instance = null;

    #noteElement;
    #note;
    #currentPattern;

    constructor(initialNote, initialPattern) {
        if (NotepadState.#instance) {
            return NotepadState.#instance;
        }

        this.#noteElement = createNoteElement();
        this.#note = initialNote;
        this.#currentPattern = initialPattern;

        if (this.#note) {
            setTextareaContent(this.#noteElement, this.#note);
        }
        if (this.#currentPattern) {
            setUrlPattern(this.#noteElement, this.#currentPattern);
        }

        NotepadState.#instance = this;
    }

    static getInstance(initialNote, initialPattern) {
        if (!NotepadState.#instance) {
            NotepadState.#instance = new NotepadState(initialNote, initialPattern);
        }
        return NotepadState.#instance;
    }

    getNoteElement() {
        return this.#noteElement;
    }

    getCurrentPattern() {
        return this.#currentPattern;
    }

    loadNote(noteContent, pattern) {
        this.#note = noteContent;
        this.#currentPattern = pattern;
        setTextareaContent(this.#noteElement, this.#note);
        setUrlPattern(this.#noteElement, pattern);
    }

    setNote(noteContent) {
        this.#note = noteContent;
        const pattern = getUrlPattern(this.#noteElement);
        saveNoteToStorage(pattern, this.#note, () => { });
    }

    setCurrentPattern(pattern, replace = false) {
        const prevPattern = this.#currentPattern;
        this.#currentPattern = pattern;

        setUrlPattern(this.#noteElement, pattern);

        if (replace && prevPattern && prevPattern !== pattern) {
            removeNoteFromStorage(prevPattern, () => {
                saveNoteToStorage(pattern, this.#note, () => { });
            });
        }
    }
}

function attachEventListeners(state) {
    const noteElement = state.getNoteElement();

    noteElement.querySelector('.sn-close')?.addEventListener('click', () => hideNote(noteElement));
    noteElement.querySelector('.sn-textarea')?.addEventListener('input', (e) => state.setNote(e.target.value));
    noteElement.querySelector('.sn-url-input')?.addEventListener('change', (e) => state.setCurrentPattern(e.target.value, true));
}

function getUrlWithoutHash(url) {
    const hashIndex = url.indexOf('#');
    return hashIndex !== -1 ? url.substring(0, hashIndex) : url;
}