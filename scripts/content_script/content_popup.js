class SimpleShadowDOM {
    static getHtmlTemplate(note) {
        const id = note.id;
        const pinClass = note.enablePin ? 'selected' : 'disable';
        const colorClass = note.color ? `color-${note.color}` : '';

        return `
        <div uniqueId="${id}" class="note-container">
            <div class="note-title ${colorClass}">
                <button class="note-action add-btn" type="button" aria-label="Add note">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                    </svg>
                </button>
                <span class="heading">Stick it</span>
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
    }

    static removeElementFromDom(id) {
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

    static updatePin(id) {
        const containers = document.querySelectorAll('.model-notes');

        for (const container of containers) {
            const shadowRoot = container.shadowRoot;
            const pinBtn = shadowRoot.querySelector(`[pinId="${id}"]`);

            if (pinBtn) {
                if (pinBtn.classList.contains('selected')) {
                    pinBtn.classList.remove('selected');
                    pinBtn.classList.add('disable');
                } else {
                    pinBtn.classList.add('selected');
                    pinBtn.classList.remove('disable');
                }

                break;
            }
        }
    }

    static hideAllElementsFromDom() {
        document.querySelectorAll('.model-notes').forEach(element => {
            element.dataset.originalDisplay = element.style.display;
            element.style.display = 'none';
        });
    }

    static showAllElementsFromDom() {
        document.querySelectorAll('.model-notes').forEach(element => {
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

    let startX, startY, startWidth, startHeight, startLeft, startTop, direction;

    const resize = (e) => {
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

    const stopResize = () => {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);

        const width = element.offsetWidth;
        const height = element.offsetHeight;
        const id = element.getAttribute('uniqueId');

        chrome.runtime.sendMessage({
            action: 'StoreAndUpdateWidthAndHeight',
            id: id,
            width: width,
            height: height,
        });
    };

    const startResize = (e, resizeDirection) => {
        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.offsetWidth;
        startHeight = element.offsetHeight;
        startLeft = element.offsetLeft;
        startTop = element.offsetTop;
        direction = resizeDirection;

        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    };

    handles.right.addEventListener('mousedown', (e) => startResize(e, 'right'));
    handles.bottom.addEventListener('mousedown', (e) => startResize(e, 'bottom'));
    handles.left.addEventListener('mousedown', (e) => startResize(e, 'left'));
    handles.top.addEventListener('mousedown', (e) => startResize(e, 'top'));
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
            existingElement.textContent = note.content || '';
        }
    });

    if (!elementExists) {
        SimpleShadowDOM.createPopup(note);
    }
};

const injectCards = (noteData) => {
    createCardAndUpdate(noteData);
};
