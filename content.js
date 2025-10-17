(() => {
    'use strict';

    let state = null;

    function toggleNotepad() {
        if (!state) {
            loadInitialState((initialNote, initialPattern) => {
                state = NotepadState.getInstance(initialNote, initialPattern);
                injectNote(state);
                attachEventListeners(state);
                showNote(state.getNoteElement());
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

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'toggleNotes') {
            toggleNotepad();
            sendResponse({ success: true });
        }
    });
})();

function loadInitialState(callback) {
    const currentUrl = window.location.href;

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

function injectNote(state) {
    const noteElement = state.getNoteElement();
    document.body.appendChild(noteElement);

    hideNote(noteElement);
}

function getStorageKey(url) {
    return url;
}

function createNoteHTML() {
    return `
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
}


function createNoteElement() {
    const noteElement = document.createElement('div');
    noteElement.id = 'sidenote-container';
    noteElement.innerHTML = createNoteHTML();
    return noteElement;
};

function updateStatus(noteElement, text) {
    const status = noteElement.querySelector('.sn-status');
    if (status) status.textContent = text;
};

function getTextareaContent(noteElement) {
    const textarea = noteElement.querySelector('.sn-textarea');
    return textarea ? textarea.value : '';
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

function toggleMinimize(noteElement) {
    noteElement.classList.toggle('sn-minimized');
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
    const key = getStorageKey(pattern);
    chrome.storage.local.set({
        [key]: content,
    }, onSuccess);
};

function loadNoteFromStorage(pattern, onSuccess) {
    const key = getStorageKey(pattern);
    chrome.storage.local.get([key], (result) => {
        const content = result[key] || '';
        onSuccess(content);
    });
};

function removeNoteFromStorage(pattern, onSuccess) {
    const key = getStorageKey(pattern);
    chrome.storage.local.remove(key, onSuccess);
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

    getNote() {
        return this.#note;
    }

    setNote(noteContent) {
        this.#note = noteContent;
        setTextareaContent(this.#noteElement, this.#note);

        const pattern = getUrlPattern(this.#noteElement);
        saveNoteToStorage(pattern, this.#note, () => { });
    }

    setCurrentPattern(pattern) {
        const prevPattern = this.#currentPattern;
        this.#currentPattern = pattern;

        setUrlPattern(this.#noteElement, pattern);

        if (prevPattern && prevPattern !== pattern) {
            removeNoteFromStorage(prevPattern, () => {
                saveNoteToStorage(pattern, this.#note, () => { });
            });
        }
    }
}

function attachEventListeners(state) {
    const noteElement = state.getNoteElement();

    const handleTextareaInput = (e) =>
        state.setNote(e.target.value)

    const handleUrlPatternInput = (e) =>
        state.setCurrentPattern(e.target.value)

    const handleClose = () =>
        hideNote(noteElement)

    const closeBtn = noteElement.querySelector('.sn-close');
    const urlInput = noteElement.querySelector('.sn-url-input');
    const textarea = noteElement.querySelector('.sn-textarea');

    closeBtn?.addEventListener('click', handleClose);
    textarea?.addEventListener('input', handleTextareaInput);
    urlInput?.addEventListener('change', handleUrlPatternInput);
}