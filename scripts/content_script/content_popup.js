class SimpleShadowDOM {
    static getHtmlTemplate(note) {
        const id = note.id;
        const isGlobal = note.scope === 'global';
        const pinClass = note.enablePin ? 'selected' : 'disable';
        // A global note carries a reserved theme, so it ignores any per-note
        // color class and gets the scope-global hook instead.
        const colorClass = (!isGlobal && note.color) ? `color-${note.color}` : '';
        const scopeClass = isGlobal ? 'scope-global' : '';
        const headingLabel = isGlobal ? 'Global note' : 'Stick it';
        const globeBadge = isGlobal ? `
                <span class="global-badge" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.9"/>
                        <path d="M3 12h18M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3Z" stroke="currentColor" stroke-width="1.7"/>
                    </svg>
                </span>` : '';

        return `
        <div uniqueId="${id}" class="note-container ${scopeClass}">
            <div class="note-title ${colorClass}">
                <button class="note-action add-btn" type="button" aria-label="Add note">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                    </svg>
                </button>
                ${globeBadge}
                <span class="heading">${headingLabel}</span>
                <div class="dropdown">
                    <button id="options" class="note-action options" type="button" aria-label="Note color">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6.5h.01M12 12h.01M12 17.5h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        </svg>
                    </button>
                    <button pinId="${id}" class="note-action bg-transparent ${pinClass} pin" type="button" aria-label="Pin note">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                            <path d="m14 4 6 6-3 1-4 4v4l-2 2-3.5-3.5L4 14l2-2h4l4-4 1-4Z" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="note-action minimize-btn" type="button" aria-label="Minimize note">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 17h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                    <button uniqueId="${id}" class="note-action close-btn" type="button" aria-label="Close note">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="color-palette" aria-label="Note color palette">
                <button class="btn color-btn color-red" data-color="red" type="button" aria-label="Red"></button>
                <button class="btn color-btn color-yellow" data-color="yellow" type="button" aria-label="Yellow"></button>
                <button class="btn color-btn color-default" data-color="default" type="button" aria-label="Default"></button>
                <button class="btn color-btn color-grey" data-color="grey" type="button" aria-label="Grey"></button>
                <button class="btn color-btn color-purple" data-color="purple" type="button" aria-label="Purple"></button>
                <button class="btn color-btn color-pink" data-color="pink" type="button" aria-label="Pink"></button>
            </div>
            <div id="${id}" class="textarea" contenteditable="true" aria-label="Note content"></div>
            <div class="resize-handle top"></div>
            <div class="resize-handle right"></div>
            <div class="resize-handle bottom"></div>
            <div class="resize-handle left"></div>
        </div>
        `;
    }

    static createPopup(note) {
        const id = note.id;
        const position = note.position;
        const size = { width: note.width, height: note.height };

        const container = document.createElement('div');
        container.className = 'model-notes';
        const shadowRoot = container.attachShadow({ mode: 'open' });

        shadowRoot.innerHTML = SimpleShadowDOM.getHtmlTemplate(note);
        const textArea = shadowRoot.getElementById(id);
        if (textArea) {
            textArea.textContent = note.content || '';
        }

        document.body.appendChild(container);

        const noteContainer = shadowRoot.querySelector('.note-container');

        setTimeout(() => {
            noteContainer.classList.add('show');
        }, 50);

        addStyleSheetlink(shadowRoot);

        makeDraggable(shadowRoot.querySelector('.note-container'), shadowRoot.querySelector('.note-title'), id, position);
        eventListenerForNote(shadowRoot, container, noteContainer);
        makeResizable(shadowRoot.querySelector('.note-container'), size);

        // A note saved in the minimized state comes back as a tray pill rather
        // than a full window.
        if (note.minimized) {
            MinimizedTray.minimize(note);
        }
    }

    static removeElementFromDom(id) {
        // Drop any tray pill for this note as well, so deleting a minimized
        // note doesn't leave an orphaned pill behind.
        MinimizedTray.removePill(id);

        const containers = document.querySelectorAll('.model-notes');
        if (containers) {
            containers.forEach((container) => {
                const shadowRoot = container.shadowRoot;
                const existingElement = shadowRoot.getElementById(id);
                if (existingElement) {
                    existingElement.parentElement.remove();
                }
            });
        }
    }

    static getHostById(id) {
        const containers = document.querySelectorAll('.model-notes');
        for (const container of containers) {
            if (container.shadowRoot && container.shadowRoot.getElementById(id)) {
                return container;
            }
        }
        return null;
    }

    static hideAllElementsFromDom() {
        document.querySelectorAll('.model-notes').forEach(element => {
            element.dataset.originalDisplay = element.style.display;
            element.style.display = 'none';
        });
    }

    static showAllElementsFromDom() {
        document.querySelectorAll('.model-notes').forEach(element => {
            // Keep minimized notes hidden; they are represented by a tray pill.
            if (element.dataset.snMinimized === 'true') return;
            element.style.display = element.dataset.originalDisplay || 'block';
        });
    }
}

const makeResizable = (element, size) => {
    if (size && size.width !== undefined && size.height !== undefined) {
        element.style.width = `${size.width}px`;
        element.style.height = `${size.height}px`;
    }

    const handles = {
        top: element.querySelector('.resize-handle.top'),
        right: element.querySelector('.resize-handle.right'),
        bottom: element.querySelector('.resize-handle.bottom'),
        left: element.querySelector('.resize-handle.left'),
    };

    let startX, startY, startWidth, startHeight, startLeft, startTop;
    let direction = null;
    let activeHandle = null;

    const resize = (e) => {
        if (!direction) return;
        if (direction === 'right') {
            element.style.width = `${startWidth + (e.clientX - startX)}px`;
        } else if (direction === 'bottom') {
            element.style.height = `${startHeight + (e.clientY - startY)}px`;
        } else if (direction === 'left') {
            const newWidth = startWidth - (e.clientX - startX);
            if (newWidth > 0) {
                element.style.width = `${newWidth}px`;
                element.style.left = `${startLeft + (e.clientX - startX)}px`;
            }
        } else if (direction === 'top') {
            const newHeight = startHeight - (e.clientY - startY);
            if (newHeight > 0) {
                element.style.height = `${newHeight}px`;
                element.style.top = `${startTop + (e.clientY - startY)}px`;
            }
        }
    };

    const stopResize = (e) => {
        if (!direction) return;

        if (activeHandle && activeHandle.hasPointerCapture(e.pointerId)) {
            activeHandle.releasePointerCapture(e.pointerId);
        }
        direction = null;
        activeHandle = null;

        const width = element.offsetWidth;
        const height = element.offsetHeight;
        const id = element.getAttribute('uniqueId');

        chrome.runtime.sendMessage({
            action: MESSAGE.STORE_AND_UPDATE_SIZE,
            id: id,
            width: width,
            height: height,
        });
    };

    const startResize = (e, resizeDirection) => {
        // Only the primary mouse button starts a resize; touch and pen pass.
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.offsetWidth;
        startHeight = element.offsetHeight;
        startLeft = element.offsetLeft;
        startTop = element.offsetTop;
        direction = resizeDirection;
        activeHandle = e.currentTarget;

        // Capture so move/up keep firing on this handle for the whole gesture.
        activeHandle.setPointerCapture(e.pointerId);
        e.preventDefault();
    };

    Object.entries(handles).forEach(([resizeDirection, handleEl]) => {
        handleEl.addEventListener('pointerdown', (e) => startResize(e, resizeDirection));
        handleEl.addEventListener('pointermove', resize);
        handleEl.addEventListener('pointerup', stopResize);
        handleEl.addEventListener('pointercancel', stopResize);
    });
};

const addStyleSheetlink = (shadowRoot) => {
    const linkElement = document.createElement('link');
    linkElement.setAttribute('rel', 'stylesheet');
    linkElement.setAttribute('href', chrome.runtime.getURL('styles/content_script.css'));
    shadowRoot.appendChild(linkElement);
};

const createCardAndUpdate = (note) => {
    const id = note.id;
    const containers = document.querySelectorAll('.model-notes');
    let elementExists = false;

    containers.forEach((container) => {
        const shadowRoot = container.shadowRoot;
        const existingElement = shadowRoot.getElementById(id);
        if (existingElement) {
            elementExists = true;

            // Reassigning textContent collapses the caret to the start of a
            // contenteditable. When the background echoes this note's own edit
            // back (or a re-injection arrives mid-edit), skip the element the
            // user is currently typing in, and skip no-op rewrites, so the
            // cursor is never reset out from under them.
            const nextContent = note.content || '';
            const isBeingEdited = shadowRoot.activeElement === existingElement;
            if (!isBeingEdited && existingElement.textContent !== nextContent) {
                existingElement.textContent = nextContent;
            }

            // Keep the on-page pin button in sync with the stored pin state so
            // toggling the pin from the popup is reflected on the note itself.
            const pinBtn = shadowRoot.querySelector(`[pinId="${id}"]`);
            if (pinBtn) {
                pinBtn.classList.toggle('selected', Boolean(note.enablePin));
                pinBtn.classList.toggle('disable', !note.enablePin);
            }

            // Keep the header color in sync so a color change echoed from another
            // tab (notably the global note, whose recolors are broadcast) updates
            // an already-rendered note. Global notes keep their reserved theme and
            // ignore per-note colors.
            const noteTitle = shadowRoot.querySelector('.note-title');
            if (noteTitle && note.scope !== 'global') {
                noteTitle.classList.remove(
                    'color-red', 'color-yellow', 'color-green',
                    'color-grey', 'color-purple', 'color-pink', 'color-default'
                );
                if (note.color) {
                    noteTitle.classList.add(`color-${note.color}`);
                }
            }
        }
    });

    if (!elementExists) {
        SimpleShadowDOM.createPopup(note);
    }
};

const injectCards = (noteData) => {
    createCardAndUpdate(noteData);
};

// Apply the global note's shared position, size, and minimized state that
// arrived from another tab, so every open instance stays in sync. Applies only
// to an existing note element (no-op if this tab has no window for the note),
// and does not persist — the originating tab already saved the change.
const syncNoteState = (note) => {
    if (!note || !note.id) {
        return;
    }

    const host = SimpleShadowDOM.getHostById(note.id);
    if (host && host.shadowRoot) {
        const container = host.shadowRoot.querySelector('.note-container');
        if (container) {
            if (note.position) {
                if (note.position.left) container.style.left = note.position.left;
                if (note.position.top) container.style.top = note.position.top;
            }
            if (typeof note.width === 'number') container.style.width = `${note.width}px`;
            if (typeof note.height === 'number') container.style.height = `${note.height}px`;
        }
    }

    // Mirror the minimized/restored state (hide/show the window and pill).
    MinimizedTray.syncMinimized(note);
};
