let selectedNoteContainer = null;
// get note data which has been inserted
let flag = true
let isViewGrid = true
let isSideBarVisible = true
const grid = document.getElementsByClassName('grid')
const containerEle = document.querySelector('.contentContainer');

(async function checkIsView() {
    isViewGrid = await UserLocalStorage.getIsViewGrid()

})()


const getNotesDataInSideBar = async () => {
    const notesData = await UserLocalStorage.retrieveNoteData();
    return notesData;
};

const getSelectedHostName = () => {
    if (!selectedNoteContainer || !document.body.contains(selectedNoteContainer)) {
        return null;
    }

    return selectedNoteContainer.getAttribute('hostName');
};

const getUniqueHostNotes = (notes) => {
    const uniqueSet = new Set();

    return notes.filter((note) => {
        if (uniqueSet.has(note.hostName)) {
            return false;
        }

        uniqueSet.add(note.hostName);
        return true;
    });
};

const findSidebarItemByHost = (hostName) => {
    if (!hostName) {
        return null;
    }

    return Array.from(document.querySelectorAll('.noteContainer')).find((noteContainer) => {
        return noteContainer.getAttribute('hostName') === hostName;
    }) || null;
};

// Reflect the visual `.select` state to assistive tech via aria-pressed so a
// screen reader announces which host card is active.
const syncHostCardPressedState = () => {
    document.querySelectorAll('.noteContainer').forEach((noteContainer) => {
        noteContainer.setAttribute('aria-pressed', noteContainer.classList.contains('select') ? 'true' : 'false');
    });
};

const selectSidebarItem = (hostName) => {
    document.querySelectorAll('.noteContainer.select').forEach((noteContainer) => {
        noteContainer.classList.remove('select');
    });

    selectedNoteContainer = findSidebarItemByHost(hostName);

    if (selectedNoteContainer) {
        selectedNoteContainer.classList.add('select');
    }

    syncHostCardPressedState();
    return selectedNoteContainer;
};

const createEmptyState = (message) => {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = message;
    return emptyState;
};

const renderSidebarEmptyState = (message) => {
    const sidebarContainer = document.querySelector('.list_notes');
    sidebarContainer.innerHTML = '';
    sidebarContainer.appendChild(createEmptyState(message));
};

const renderMainEmptyState = (message) => {
    const contentContainer = document.querySelector('.contentContainer');
    contentContainer.innerHTML = '';
    contentContainer.appendChild(createEmptyState(message));
};

const renderMainNotesForHost = (notes, hostName, query = '') => {
    const contentContainer = document.querySelector('.contentContainer');
    contentContainer.innerHTML = '';

    if (!hostName) {
        return;
    }

    let hasRenderedNotes = false;

    notes.forEach((note) => {
        if (note.hostName === hostName) {
            hasRenderedNotes = true;
            if (query.trim() !== '') {
                searchAndHighlight(note, query);
            } else {
                insertContentInMain(note);
            }
        }
    });

    if (!hasRenderedNotes) {
        renderMainEmptyState(query.trim() !== '' ? 'No matching notes' : 'No notes saved');
    }
};

const sideBar = document.querySelector('#sideBar')
const stickyNoteSideBar = document.querySelector('.stickyNoteSideBar')
const sideBarImg = document.querySelector('.open-position')

sideBar.addEventListener('click', (event) => {
    isSideBarVisible = !isSideBarVisible

    if (isSideBarVisible === false) {
        // stickyNoteSideBar.style.display = 'none'
        stickyNoteSideBar.classList.add('sideBarCloseBtn')
        sideBar.classList.remove('sideBarOpen')
        sideBar.classList.add('sideBarClose')
        sideBarImg.style.left = "-10px"

    } else {
        stickyNoteSideBar.style.display = 'block'
        stickyNoteSideBar.classList.remove('sideBarCloseBtn')
        sideBar.classList.add('sideBarOpen')
        sideBar.classList.remove('sideBarClose')
        sideBarImg.style.left = "0px"
    }
})

const setView = (cards) => {
    if (isViewGrid) {
        containerEle.classList.remove('flex-column', 'align-items-center', 'd-flex');
        containerEle.classList.add('gridView');
        cards.forEach((card, index) => {
            if (card) {
                card.classList.remove('w-50');
                card.classList.add('w-100')

            } else {
                console.log(`card at index ${index} is undefined`);
            }
        });
    } else {
        containerEle.classList.remove('gridView');
        cards.forEach((card, index) => {
            if (card) {
                card.classList.add('w-50');
                card.classList.remove('w-100');
            } else {
                console.log(`card at index ${index} is undefined`);
            }
        });
        containerEle.classList.add('flex-column', 'align-items-center', 'd-flex');
    }
}
const SVG_NS = 'http://www.w3.org/2000/svg';
const TRASH_ICON_PATHS = [
    {
        d: 'M9 11v6M15 11v6M4 7h16M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1Z',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
    },
    {
        d: 'm6 7 1 13h10l1-13',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linejoin': 'round'
    }
];

const NAVIGATION_ICON_PATHS = [
    {
        d: 'M7 17 17 7M9 7h8v8',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
    }
];

const createElement = (tagName, className = '') => {
    const element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    return element;
};

const createSvgIcon = ({ className, paths, attributes = {} }) => {
    const icon = document.createElementNS(SVG_NS, 'svg');
    icon.setAttribute('xmlns', SVG_NS);
    icon.setAttribute('width', '16');
    icon.setAttribute('height', '16');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('class', className);
    icon.setAttribute('viewBox', '0 0 24 24');

    Object.entries(attributes).forEach(([name, value]) => {
        icon.setAttribute(name, value);
    });

    paths.forEach((pathAttributes) => {
        const path = document.createElementNS(SVG_NS, 'path');
        Object.entries(pathAttributes).forEach(([name, value]) => {
            path.setAttribute(name, value);
        });
        icon.appendChild(path);
    });

    return icon;
};

// Build a real, keyboard-operable icon button. The interactive class (used by
// the click handlers and tooltips) lives on the button; the SVG inside is
// decorative and hidden from assistive tech.
const createIconButton = ({ className, label, paths, attributes = {}, iconClassName = 'bi' }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.setAttribute('aria-label', label);

    Object.entries(attributes).forEach(([name, value]) => {
        button.setAttribute(name, value);
    });

    const icon = createSvgIcon({ className: iconClassName, paths });
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);

    return button;
};

const appendHighlightedText = (element, text, query) => {
    const sourceText = text || '';
    const searchText = query ? query.trim() : '';
    element.textContent = '';

    if (!searchText) {
        element.textContent = sourceText;
        return;
    }

    const lowerSource = sourceText.toLowerCase();
    const lowerSearch = searchText.toLowerCase();
    let cursor = 0;
    let matchIndex = lowerSource.indexOf(lowerSearch, cursor);

    while (matchIndex !== -1) {
        if (matchIndex > cursor) {
            element.appendChild(document.createTextNode(sourceText.slice(cursor, matchIndex)));
        }

        const mark = document.createElement('mark');
        mark.textContent = sourceText.slice(matchIndex, matchIndex + searchText.length);
        element.appendChild(mark);

        cursor = matchIndex + searchText.length;
        matchIndex = lowerSource.indexOf(lowerSearch, cursor);
    }

    if (cursor < sourceText.length) {
        element.appendChild(document.createTextNode(sourceText.slice(cursor)));
    }
};

// html 
const createCardsForNote = (note, query) => {
    const noteContainer = createElement('div', 'd-flex flex-column border border-light noteContainer');
    noteContainer.id = note.id;
    noteContainer.setAttribute('hostName', note.hostName);
    // Keyboard/AT support: the whole card acts as a toggle that shows the
    // host's notes, so expose it as a focusable button with a name and state.
    noteContainer.setAttribute('role', 'button');
    noteContainer.setAttribute('tabindex', '0');
    noteContainer.setAttribute('aria-pressed', 'false');
    noteContainer.setAttribute('aria-label', `Show notes for ${note.hostName}`);

    const header = createElement('div', 'note-header url px-3 py-3 d-flex justify-content-between align-items-center');
    header.dataset.url = note.url;

    const hostName = createElement('div', 'cursor-pointer hostName');
    appendHighlightedText(hostName, note.hostName, query);

    const actions = createElement('div', 'sidebar-card-actions');
    const navigationIcon = createIconButton({
        className: 'navigation toolTipNav',
        label: 'Open this note\'s page in a new tab',
        paths: NAVIGATION_ICON_PATHS,
        attributes: { 'data-url': note.url },
        iconClassName: 'bi bi-arrow-up-right-square'
    });
    const deleteIcon = createIconButton({
        className: 'delete-note custom-margin-10',
        label: 'Delete all notes for this site',
        paths: TRASH_ICON_PATHS,
        iconClassName: 'bi bi-trash'
    });

    actions.append(navigationIcon, deleteIcon);
    header.append(hostName, actions);
    noteContainer.appendChild(header);

    return noteContainer;
};

const createMainNoteCard = (note, query) => {
    const id = note.id;
    const cardClass = isViewGrid ? 'w-100' : 'w-50';
    const colorClass = note.color ? `color-${note.color}` : '';

    const card = createElement('div', `${id} card-size ${cardClass} mx-2 my-2`);
    card.id = 'Cards';

    const heading = createElement('div', `w-100 heading text-dark px-3 py-2 ${colorClass}`);
    const headingRow = createElement('div', 'w-100 d-flex justify-content-between');
    const meta = createElement('div', 'note-card-meta');

    const date = createElement('span', 'px-2');
    date.textContent = note.date.replace(/\//g, '-');
    const time = createElement('span', 'px-2');
    time.textContent = note.time;
    meta.append(date, time);

    const actionContainer = document.createElement('div');
    const deleteIcon = createIconButton({
        className: 'deleteNoteBtn',
        label: 'Delete note',
        paths: TRASH_ICON_PATHS,
        attributes: { 'unique-id': id },
        iconClassName: 'bi bi-trash'
    });
    actionContainer.appendChild(deleteIcon);

    headingRow.append(meta, actionContainer);
    heading.appendChild(headingRow);

    const noteBody = createElement('div', 'textAreaForNotes resize border border-light w-100 bg-transparent text-light p-2');
    noteBody.setAttribute('contenteditable', 'true');
    noteBody.setAttribute('uniqueId', id);
    appendHighlightedText(noteBody, note.content, query);

    card.append(heading, noteBody);

    return card;
};



// logic 
const insertContentInSideBar = (note, query) => {
    console.log(query, 'check query')

    const container = document.querySelector('.list_notes');
    container.appendChild(createCardsForNote(note, query));


}


const insertContentInMain = (note) => {
    // for content page 
    const container = document.querySelector('.contentContainer');
    container.appendChild(createMainNoteCard(note));



    // Tooltip for the 'Delete Note' button
    tippy('.deleteNoteBtn', {
        content: getDeleteDes(),
        placement: 'bottom'
    });
    tippy('.toolTipNav', {
        content: getMessageForNav(),
        placement: 'bottom'
    });
    tippy('.delete-note', {
        content: getDeleteAllDescription(),
        placement: 'bottom'
    });

}



const toggleNoteContainerSelection = () => {
    const noteContainers = document.querySelectorAll('.noteContainer');

    if (noteContainers.length === 0) {
        selectedNoteContainer = null;
        document.querySelector('.contentContainer').innerHTML = '';
        flag = true;
        return;
    }

    if (noteContainers.length > 0) {
        const currentHostName = getSelectedHostName();
        const initialHostName = findSidebarItemByHost(currentHostName)
            ? currentHostName
            : noteContainers[0].getAttribute('hostName');

        // Select the first note container by default
        selectSidebarItem(initialHostName);

        const hostName = getSelectedHostName();

        if (flag) {
            UserLocalStorage.retrieveNoteData().then(async (storeArr) => {
                renderMainNotesForHost(storeArr, hostName);
                eventListenerForEditBtn()
                eventListenerForDeleteBtn()

                const isViewGrid = await UserLocalStorage.getIsViewGrid();
                const cards = document.querySelectorAll('#Cards');
                setView(cards);
                await UserLocalStorage.setIsViewGrid(isViewGrid);
            });
        }


    }


    noteContainers.forEach(noteContainer => {
        noteContainer.addEventListener('click', async () => {

            if (selectedNoteContainer === noteContainer) {

                // Deselect if the same container is clicked again
                noteContainer.classList.remove('select');
                selectedNoteContainer = null;

                // Clear main content container
                document.querySelector('.contentContainer').innerHTML = '';
            } else {

                // If a different container is selected
                if (selectedNoteContainer) {
                    selectedNoteContainer.classList.remove('select');
                }

                // When user clicks, value will be selected
                noteContainer.classList.add('select');
                selectedNoteContainer = noteContainer;

                const hostName = noteContainer.getAttribute('hostName');

                // Get the data from local storage
                const storeArr = await UserLocalStorage.retrieveNoteData();
                // Inject content in main
                const searchBox = document.getElementById('searchBox');
                const hasEmptySearch = searchBox.value.trim() === '';


                if (hasEmptySearch === true) {
                    renderMainNotesForHost(storeArr, hostName);
                } else {
                    insertFilterNote(searchBox.value)
                }

                flag = true
            }
            syncHostCardPressedState();
            eventListenerForEditBtn()
            eventListenerForDeleteBtn()
        });

        // Activate selection with the keyboard when the card itself is focused
        // (ignore keys bubbling up from the nested action buttons).
        noteContainer.addEventListener('keydown', (event) => {
            if (event.target !== noteContainer) return;
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                noteContainer.click();
            }
        });
    });


    flag = true
}


const insertFilterNote = async (query) => {

    const notesData = await getNotesDataInSideBar();
    const hostName = getSelectedHostName();
    const contentContainer = document.querySelector('.contentContainer');
    contentContainer.innerHTML = '';

    if (!hostName) {
        renderMainEmptyState('Select a site to view matching notes');
        return;
    }

    const filteredNotes = notesData.filter(note =>
        note.hostName.toLowerCase().includes(query.toLowerCase()) ||
        (note.content || '').toLowerCase().includes(query.toLowerCase())
    );
    renderMainNotesForHost(filteredNotes, hostName, query);


}

const eventListenerForDeleteBtn = () => {
    document.querySelectorAll('.deleteNoteBtn').forEach((deleteBtn) => {

        deleteBtn.addEventListener('click', async (event) => {
            if (confirm(getDeleteMsg())) {
                const deleteBtn = event.currentTarget
                // Ensure you're using the correct attribute name
                const id = deleteBtn.getAttribute('unique-id');
                // Use querySelector to find the card element with the id
                const cardToRemove = document.querySelector(`.${CSS.escape(id)}`);

                if (cardToRemove) {
                    cardToRemove.remove();

                    const noteArr = await UserLocalStorage.retrieveNoteData()
                    const filerArr = noteArr.filter(note => note.id !== id)
                    await UserLocalStorage.setStorage(filerArr)

                    chrome.tabs.query({}, function (tabs) {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, { action: MESSAGE.REMOVE_ELEMENT_FROM_DOM, id: id });
                        });
                    });
                    toggleNoteContainerSelection()

                } else {
                    console.error(`Element with class ${id} not found.`);
                }
            }
        })
    })
}


const eventListenerForEditBtn = () => {
    document.querySelectorAll('.textAreaForNotes').forEach((textArea) => {
        // Make each textarea content editable
        textArea.setAttribute('contenteditable', 'true');

        // Add event listener for input
        const debouncedUpdate = debounce(() => {
            const updatedContent = textArea.innerText;
            const id = textArea.getAttribute('uniqueId');

            // Send the updated content to the background script or storage
            chrome.runtime.sendMessage({
                action: MESSAGE.UPDATE_NOTE_CONTENT,
                id: id,
                content: updatedContent
            });
        }, 500); // Adjust the delay as needed

        textArea.addEventListener('input', debouncedUpdate);

        // Focus and move cursor to the end when user clicks on the textarea
        textArea.addEventListener('focus', () => {
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(textArea);
            range.collapse(false); // Collapse to end of the content
            selection.removeAllRanges();
            selection.addRange(range);
        });
    });

    // Debounce function to delay the execution of a function
    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }


}
const searchAndHighlight = (note, query) => {
    console.log(note, 'check note')
    const container = document.querySelector('.contentContainer');
    container.appendChild(createMainNoteCard(note, query));

    // Initialize tooltips for buttons
    tippy('.deleteNoteBtn', {
        content: getDeleteDes(),
        placement: 'bottom'
    });
    tippy('.toolTipNav', {
        content: getMessageForNav(),
        placement: 'bottom'
    });
    tippy('.delete-note', {
        content: getDeleteAllDescription(),
        placement: 'bottom'
    });
};


const filterNotes = async (query) => {
    const notesData = await getNotesDataInSideBar();
    const previousHostName = getSelectedHostName();

    // Clear current notes
    const sidebarContainer = document.querySelector('.list_notes');
    sidebarContainer.innerHTML = '';

    const mainContainer = document.querySelector('.contentContainer');
    mainContainer.innerHTML = '';

    // Filter notes based on query
    const filteredNotes = notesData.filter(note =>
        note.hostName.toLowerCase().includes(query.toLowerCase()) ||
        (note.content || '').toLowerCase().includes(query.toLowerCase())
    );

    // Display filtered notes in sidebar and main container
    const noteArr = getUniqueHostNotes(filteredNotes);

    if (noteArr.length === 0) {
        selectedNoteContainer = null;
        renderSidebarEmptyState(query.trim() === '' ? 'No notes saved' : 'No matching sites');
        renderMainEmptyState(query.trim() === '' ? 'No notes saved' : 'No matching notes');
        flag = false;
        return;
    }

    noteArr.forEach(note => {
        insertContentInSideBar(note, query);  // Inserting into the sidebar as usual
    });

    const firstMatchingHostName = noteArr.length > 0 ? noteArr[0].hostName : null;
    const hostName = noteArr.some(note => note.hostName === previousHostName) ? previousHostName : firstMatchingHostName;
    selectSidebarItem(hostName);

    console.log(filteredNotes, 'check filteredNote')
    renderMainNotesForHost(filteredNotes, hostName, query);

    flag = false;
    eventListenerForNavigation();
    eventListenerForEditBtn();
    eventListenerForDeleteBtn();
    eventListenerForDeleteAllHostNote();
    toggleNoteContainerSelection();
};

const eventListenerForDeleteAllHostNote = () => {

    document.querySelectorAll('.delete-note').forEach(deleteButton => {

        deleteButton.addEventListener('click', (event) => {
            const message = getDeleteMessage()
            if (confirm(getDeleteAllMsg())) {
                event.stopPropagation();
                (deleteButton, 'deletebtn remove')
                deleteButton.closest('.noteContainer').remove();
                const hostName = deleteButton.closest('.noteContainer').getAttribute('hostName')
                const id = deleteButton.closest('.noteContainer').id

                // remove logic for main container 
                const contentContainer = document.querySelector('.contentContainer');
                contentContainer.innerHTML = '';
                chrome.runtime.sendMessage({ action: MESSAGE.REMOVE_USING_HOST_NAME, hostName: hostName },);
                toggleNoteContainerSelection()

            }
        });
    });
}
const eventListenerForNavigation = () => {
    // event lister for visit web pages 
    document.querySelectorAll('.navigation').forEach(hostElement => {
        hostElement.addEventListener('click', (event) => {

            event.stopPropagation();
            const url = event.currentTarget.getAttribute('data-url');
            if (url) {
                window.open(url, '_blank');
            }
        });
    });
}

const handleCardData = async () => {
    // Get all the note data 
    const notesData = await getNotesDataInSideBar();


    if (notesData) {
        const noteArr = getUniqueHostNotes(notesData);

        if (noteArr.length === 0) {
            selectedNoteContainer = null;
            renderSidebarEmptyState('No notes saved');
            renderMainEmptyState('No notes saved');
        }

        noteArr.forEach(note => {
            //    for side bar 
            insertContentInSideBar(note)
        });

        if (noteArr.length > 0) {
            toggleNoteContainerSelection()
        }

        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('navigate')) {
                const url = event.target.getAttribute('data-url');
                if (url) {
                    window.open(url, '_blank');
                }
            }
        });

        //
    }

    // event handling 
    eventListenerForNavigation()
    eventListenerForEditBtn()
    eventListenerForDeleteBtn()
    eventListenerForDeleteAllHostNote()

    grid[0].addEventListener('click', async (event) => {
        isViewGrid = !isViewGrid;
        const cards = document.querySelectorAll('#Cards')
        setView(cards)
        await UserLocalStorage.setIsViewGrid(isViewGrid)
    });

    document.getElementById('searchBox').addEventListener('input', (event) => {
        const query = event.target.value;
        filterNotes(query);
    });
    document.getElementById('refresh').addEventListener('click', () => {
        location.reload();
    });


};


// IIFE
(() => {
    // This function creates all the note cards 
    handleCardData();
})();


