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
        // Hover hints (native tooltips) explaining each control.
        const pinTitle = isGlobal
            ? 'Pin — show on every site. Unpin to hide it.'
            : 'Pin — keep this note shown. Unpin to hide it.';
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
                <button class="note-action add-btn" type="button" aria-label="Add note" title="Add another note on this page">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                    </svg>
                </button>
                ${globeBadge}
                <span class="heading">${headingLabel}</span>
                <div class="dropdown">
                    <button id="options" class="note-action options" type="button" aria-label="Note color" title="Change note color">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6.5h.01M12 12h.01M12 17.5h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        </svg>
                    </button>
                    <button pinId="${id}" class="note-action bg-transparent ${pinClass} pin" type="button" aria-label="Pin note" title="${pinTitle}">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a6 6 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707s.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a6 6 0 0 1 1.013.16l3.134-3.133a3 3 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146m.122 2.112v-.002zm0-.002v.002a.5.5 0 0 1-.122.51L6.293 6.878a.5.5 0 0 1-.511.12H5.78l-.014-.004a5 5 0 0 0-.288-.076 5 5 0 0 0-.765-.116c-.422-.028-.836.008-1.175.15l5.51 5.509c.141-.34.177-.753.149-1.175a5 5 0 0 0-.192-1.054l-.004-.013v-.001a.5.5 0 0 1 .12-.512l3.536-3.535a.5.5 0 0 1 .532-.115l.096.022c.087.017.208.034.344.034q.172.002.343-.04L9.927 2.028q-.042.172-.04.343a1.8 1.8 0 0 0 .062.46z"/>
                        </svg>
                    </button>
                    <button class="note-action minimize-btn" type="button" aria-label="Minimize note" title="Minimize into the tray">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 17h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                    <button uniqueId="${id}" class="note-action close-btn" type="button" aria-label="Close note" title="Close — hides this note">
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
