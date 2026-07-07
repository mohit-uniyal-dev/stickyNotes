let selectedNoteContainer = null;
// get note data which has been inserted
let flag = true
let isViewGrid = true
let isSideBarVisiable = true
const grid = document.getElementsByClassName('grid')
const containerEle = document.querySelector('.contentContainer');

(async function checkIsView() {
    isViewGrid = await UserLocalStorage.getIsViewGrid()

})()


const getNotesDataInSideBar = async () => {
    const notesData = await UserLocalStorage.retriveNoteData();
    return notesData;
};

const sideBar = document.querySelector('#sideBar')
const stickyNoteSideBar = document.querySelector('.stickyNoteSideBar')
const sideBarImg = document.querySelector('.open-position')

sideBar.addEventListener('click', (event) => {
    isSideBarVisiable = !isSideBarVisiable

    if (isSideBarVisiable === false) {
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

    const header = createElement('div', 'note-header url px-3 py-3 d-flex justify-content-between align-items-center');
    header.dataset.url = note.url;

    const hostName = createElement('div', 'cursor-pointer hostName');
    appendHighlightedText(hostName, note.hostName, query);

    const actions = createElement('div', 'sidebar-card-actions');
    const navigationIcon = createSvgIcon({
        className: 'bi navigation bi-arrow-up-right-square toolTipNav',
        paths: NAVIGATION_ICON_PATHS,
        attributes: { 'data-url': note.url }
    });
    const deleteIcon = createSvgIcon({
        className: 'bi delete-note bi-trash custom-margin-10',
        paths: TRASH_ICON_PATHS
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
    const deleteIcon = createSvgIcon({
        className: 'bi bi-trash deleteNoteBtn',
        paths: TRASH_ICON_PATHS,
        attributes: { 'unique-id': id }
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

    if (noteContainers.length > 0) {
        // Select the first note container by default
        selectedNoteContainer = noteContainers[0];
        selectedNoteContainer.classList.add('select');

        const hostName = selectedNoteContainer.getAttribute('hostName');

        if (flag) {
            UserLocalStorage.retriveNoteData().then(async (storeArr) => {
                // Filter based on hostName
                const updateArr = storeArr.filter(note => note.hostName === hostName);

                // Remove everything from the container
                const contentContainer = document.querySelector('.contentContainer');
                contentContainer.innerHTML = '';

                // Inject content in main
                updateArr.forEach(note => {
                    insertContentInMain(note);
                });
                eventListenerForEditBtn()
                eventListenerForDeleteBtn()

                const isViewGrid = await UserLocalStorage.getIsViewGrid();
                const cards = document.querySelectorAll('#Cards');
                setView(cards);
                UserLocalStorage.setIsViewGrid(isViewGrid);
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
                const storeArr = await UserLocalStorage.retriveNoteData();
                // Filter based on hostName
                const updateArr = storeArr.filter(note => note.hostName === hostName);

                // Remove everything from the container
                const contentContainer = document.querySelector('.contentContainer');
                contentContainer.innerHTML = '';

                // Inject content in main
                const searchBox = document.getElementById('searchBox');
                const flag = searchBox.value.trim() === '';


                if (flag === true) {
                    updateArr.forEach(note => {
                        insertContentInMain(note);
                    });
                } else {
                    insertFilterNote(searchBox.value)
                }

                flag == true
            }
            eventListenerForEditBtn()
            eventListenerForDeleteBtn()
        });
    });


    flag = true
}


const insertFilterNote = async (query) => {

    const notesData = await getNotesDataInSideBar();

    const filteredNotes = notesData.filter(note =>
        note.hostName.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase())
    );
    const hostName = selectedNoteContainer.getAttribute('hostName')
    filteredNotes.forEach(note => {
        if (note.hostName == hostName) {
            searchAndHighlight(note, query)
        }
    })


}

const eventListenerForDeleteBtn = () => {
    document.querySelectorAll('.deleteNoteBtn').forEach((deleteBtn) => {

        deleteBtn.addEventListener('click', async (event) => {
            if (confirm(getDeleteMsg())) {
                const deleteBtn = event.target
                // Ensure you're using the correct attribute name
                const id = deleteBtn.getAttribute('unique-id');
                // Use querySelector to find the card element with the id
                const cardToRemove = document.querySelector(`.${CSS.escape(id)}`);

                if (cardToRemove) {
                    cardToRemove.remove();

                    const noteArr = await UserLocalStorage.retriveNoteData()
                    const filerArr = noteArr.filter(note => note.id !== id)
                    UserLocalStorage.setStorage(filerArr)

                    chrome.tabs.query({}, function (tabs) {
                        tabs.forEach(tab => {
                            chrome.tabs.sendMessage(tab.id, { action: 'removeElementFromDom', id: id });
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
                action: 'updateNoteContent',
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

    // Clear current notes
    const sidebarContainer = document.querySelector('.list_notes');
    sidebarContainer.innerHTML = '';

    const mainContainer = document.querySelector('.contentContainer');
    mainContainer.innerHTML = '';

    // Filter notes based on query
    const filteredNotes = notesData.filter(note =>
        note.hostName.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase())
    );

    // Display filtered notes in sidebar and main container
    const uniqueSet = new Set();
    const noteArr = filteredNotes.filter(note => {
        if (uniqueSet.has(note.hostName)) {
            return false;
        } else {
            uniqueSet.add(note.hostName);
            return true;
        }
    });

    const hostName = selectedNoteContainer.getAttribute('hostName');

    noteArr.forEach(note => {
        insertContentInSideBar(note, query);  // Inserting into the sidebar as usual
    });

    console.log(filteredNotes, 'check filteredNote')
    filteredNotes.forEach(note => {
        if (hostName === note.hostName) {
            if (query.trim() !== '') {
                searchAndHighlight(note, query);  // Use searchAndHighlight for main container
            } else {
                insertContentInMain(note)
            }
        }
    });

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
                chrome.runtime.sendMessage({ action: "removeUsingHostName", hostName: hostName },);
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
            const url = event.target.getAttribute('data-url');
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

        const uniqueSet = new Set()

        const noteArr = notesData.filter(note => {
            if (uniqueSet.has(note.hostName)) {
                return false
            } else {
                uniqueSet.add(note.hostName);
                return true;
            }
        })

        noteArr.forEach(note => {
            //    for side bar 
            insertContentInSideBar(note)
        });

        toggleNoteContainerSelection()

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

    grid[0].addEventListener('click', (event) => {
        isViewGrid = !isViewGrid;
        const cards = document.querySelectorAll('#Cards')
        setView(cards)
        UserLocalStorage.setIsViewGrid(isViewGrid)
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


