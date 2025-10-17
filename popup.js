document.addEventListener('DOMContentLoaded', () => {
    const notesList = document.getElementById('notesList');
    const emptyState = document.getElementById('emptyState');

    function loadNotes() {
        chrome.storage.local.get(null, (items) => {
            const patterns = Object.keys(items);

            if (patterns.length === 0) {
                notesList.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            notesList.style.display = 'flex';
            emptyState.style.display = 'none';
            notesList.innerHTML = '';

            patterns.sort().forEach((pattern) => {
                const noteItem = createNoteItem(pattern, items[pattern]);
                notesList.appendChild(noteItem);
            });
        });
    }

    function createNoteItem(pattern, note) {
        const item = document.createElement('div');
        item.className = 'note-item';

        const header = document.createElement('div');
        header.className = 'note-header';

        const patternEl = document.createElement('div');
        patternEl.className = 'note-pattern';
        patternEl.textContent = pattern;
        patternEl.title = pattern;

        const actions = document.createElement('div');
        actions.className = 'note-actions';

        const openBtn = document.createElement('button');
        openBtn.className = 'btn-icon';
        openBtn.title = 'Open URL';
        openBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
        `;
        openBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: pattern });
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon delete';
        deleteBtn.title = 'Delete note';
        deleteBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
        `;
        deleteBtn.addEventListener('click', () => {
            if (confirm(`Delete note for:\n${pattern}`)) {
                deleteNote(pattern);
            }
        });

        actions.appendChild(openBtn);
        actions.appendChild(deleteBtn);

        header.appendChild(patternEl);
        header.appendChild(actions);

        item.appendChild(header);

        const contentEl = document.createElement('div');
        contentEl.className = 'note-content';
        contentEl.textContent = note;
        item.appendChild(contentEl);

        return item;
    }

    function deleteNote(pattern) {
        chrome.storage.local.remove(pattern, () => {
            loadNotes();
        });
    }

    // Initial load
    loadNotes();
});
