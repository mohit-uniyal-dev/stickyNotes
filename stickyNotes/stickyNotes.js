

let noteArr = []
let isHidden = false
const notesPerPage = 2;
let currentPage = 1;

let length = 0

document.addEventListener('DOMContentLoaded', function () {

    const addBtn = document.getElementById('add-note')
    const allListContainer = document.getElementById('allNotesList')
    const removeAllBtn = document.querySelector('.removeAll')
    const noOfNotesRow = document.querySelector('.noOfNotes')
    const title = document.querySelector('#title')
    const seeAllNotes = document.getElementById('seeAllNotes')
    const settingsBtn = document.getElementById('openTabButton')

    // Hidden until we know there are notes to count; the list's empty/loading
    // state carries the message otherwise, so the count row never duplicates it.
    noOfNotesRow.style.display = 'none'

    let url = ''
    let hostName = ''
    let isActiveTabReady = false

    seeAllNotes.innerText = getViewAllNotes()

    title.innerText = getHeading()
    addBtn.disabled = true
    removeAllBtn.disabled = true

    const setHostScopedActionsEnabled = (isEnabled) => {
        addBtn.disabled = !isEnabled
        removeAllBtn.disabled = !isEnabled
        isActiveTabReady = isEnabled
    }

    const initActiveTabContext = () => {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError)
                    return
                }

                const activeTab = tabs && tabs[0]
                if (!activeTab || !activeTab.url) {
                    reject(new Error('No active tab URL found.'))
                    return
                }

                try {
                    const activeUrl = new URL(activeTab.url)
                    hostName = activeUrl.hostname
                    url = activeTab.url
                    setHostScopedActionsEnabled(Boolean(hostName))
                    resolve()
                } catch (error) {
                    reject(error)
                }
            });
        })
    }

    // remove all btn logic
    removeAllBtn.addEventListener('click', () => {
        if (!isActiveTabReady || !hostName) {
            console.warn('Active tab context is not ready. Cannot remove notes.')
            return
        }

        if (confirm(` ${getDeleteAllMsg()} : ${hostName}`)) {
            document.getElementById('allNotesList').innerHTML = '';
            chrome.runtime.sendMessage({ action: MESSAGE.REMOVE_USING_HOST_NAME, hostName: hostName });
            chrome.runtime.sendMessage({ action: MESSAGE.REMOVE_TAB, title: "StickyNotes" });

            length = 0
            updateNoteLength(length)
        }
    })

    // const setLanaguegToEnglish = document.getElementById('setLanguage')


    // setLanaguegToEnglish.innerText = getLanguageMessage()

    // handle displaying and inserting card and creating pagination  //

    /*                          START                      */
    // get totoal no of page 
    const getTotalPages = async (preloaded) => {
        const allNotes = preloaded || await UserLocalStorage.retrieveNoteData()
        const filterNotes = allNotes.filter(noteObj => { return noteObj.hostName === hostName })
        return new Promise((resolve, reject) => {
            const result = Math.ceil(filterNotes.length / notesPerPage);
            resolve(result)
        })
    }


    // create pagination  pannel -chat gpt code - read it one time 
    const renderPagination = async (preloaded) => {
        const paginationContainer = document.querySelector('.pagination');
        paginationContainer.innerHTML = '';

        const totalPages = await getTotalPages(preloaded);

        const prevButton = document.createElement('a');
        prevButton.href = '#';
        prevButton.innerHTML = '&laquo;';
        prevButton.addEventListener('click', () => changePage(currentPage - 1));
        paginationContainer.appendChild(prevButton);

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('a');
            pageButton.href = '#';
            pageButton.innerText = i;
            if (i === currentPage) {
                pageButton.classList.add('select');
            }
            pageButton.addEventListener('click', () => changePage(i));
            paginationContainer.appendChild(pageButton);
        }

        const nextButton = document.createElement('a');
        nextButton.href = '#';
        nextButton.innerHTML = '&raquo;';
        nextButton.addEventListener('click', () => changePage(currentPage + 1));
        paginationContainer.appendChild(nextButton);
    }

    const updateNoteLength = (noteLength) => {

        if (noteLength == 0) {
            // Hide the whole count row; the list empty state already tells the
            // user there are no notes on this site.
            noOfNotesRow.style.display = 'none'
        } else {
            noOfNotesRow.style.display = 'flex'
            document.getElementById('notesNumber').innerText = `All Notes ${noteLength}`
            removeAllBtn.style.display = 'inline-flex'
        }

    }

    async function checkPagination(preloaded) {
        const length = await getSameHostNameLength(preloaded);

        const paginationContainer = document.querySelector('.pagination');

        if (length <= 2) {
            paginationContainer.style.display = 'none'
        } else {
            paginationContainer.style.display = 'flex'
        }
    }

    async function getSameHostNameLength(preloaded) {
        const noteArr = preloaded || await UserLocalStorage.retrieveNoteData();
        return noteArr.filter(noteObj => noteObj.hostName === hostName).length;
    }
    // Render a single centered message (loading / empty / error) into the
    // note list in place of note cards.
    const renderListMessage = (message) => {
        allListContainer.innerHTML = '';
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = message;
        allListContainer.appendChild(emptyState);
    };

    // render notes
    const renderNotes = async (preloaded) => {
        const allListContainer = document.getElementById('allNotesList');
        allListContainer.innerHTML = ''; // Clear the current notes

        // the start and end index display the no of cards should be display from what start to end
        const startIndex = (currentPage - 1) * notesPerPage;
        let endIndex = startIndex + notesPerPage;


        noteArr = preloaded || await UserLocalStorage.retrieveNoteData()
        // based of the start and end value get noteToShow 
        const filterNote = noteArr.filter(noteObj => { return noteObj.hostName === hostName })
        const notesToShow = filterNote.slice(startIndex, endIndex);
        length = filterNote.length
        updateNoteLength(length)

        if (filterNote.length === 0) {
            renderListMessage('No notes on this site yet. Click Add Note to create one.');
            return;
        }

        notesToShow.forEach(note => {
            if (hostName === note.hostName) {
                injectCards(note);
            }
        });

        tippy('.delete-btn', {
            content: getDeleteDes(),
            placement: 'bottom',
            theme: 'clean'
        });
        tippy('.pin-btn', {
            content: getPinMessage(),
            placement: 'bottom',
            theme: 'clean'
        });
    }

    // Load notes once, then drive the list, pagination, and pagination
    // visibility from that single read to avoid repeated storage reads within
    // one user action.
    const refreshNotesView = async (preloaded) => {
        const allNotes = preloaded || await UserLocalStorage.retrieveNoteData();
        await renderNotes(allNotes);
        await renderPagination(allNotes);
        await checkPagination(allNotes);
    };

    // change pages
    async function changePage(page) {
        const allNotes = await UserLocalStorage.retrieveNoteData();
        const totalPages = await getTotalPages(allNotes);

        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        currentPage = page;
        await renderNotes(allNotes);
        await renderPagination(allNotes);
    }

    // inject function
    function injectPopUps(note) {

        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            var activeTab = tabs[0];

            if (note.hostName === hostName && note.url === url && note.enablePin) {
                chrome.tabs.sendMessage(activeTab.id, { "message": MESSAGE.INJECT_POPUPS, "noteData": note, });
            }
        });
    }


    const retrieveData = async (preloaded) => {

        const noteArr = preloaded || await UserLocalStorage.retrieveNoteData()
        if (noteArr.length > 0) {

            noteArr.forEach((element, index) => {
                if (element.hostName === hostName && element.url === url && element.enablePin) {
                    injectPopUps(element)
                }
            });
        }

    }

    // Empty notes are cleaned up on note close and tab close, not on popup
    // open, so a freshly created blank note is not deleted the next time the
    // popup is opened before the user has typed anything.
    (async function initPopup() {
        renderListMessage('Loading notes...');
        try {
            await initActiveTabContext()
            const allNotes = await UserLocalStorage.retrieveNoteData()
            retrieveData(allNotes)
            await refreshNotesView(allNotes)
        } catch (error) {
            console.warn('Unable to initialize active tab context.', error)
            setHostScopedActionsEnabled(false)
            updateNoteLength(0)
            renderListMessage('Notes cannot be added on this page.')
        }
    })();

    // const sendHideMessage = () => {
    //     try {
    //         chrome.runtime.sendMessage({ action: 'hide', isHidden: isHidden });
    //     }
    //     catch (e) {
    //         console.log('error ', e)
    //     }
    // }

    /*                          END                      */


    const SVG_NS = 'http://www.w3.org/2000/svg';
    const popupTrashIconPaths = [
        {
            d: 'M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z'
        },
        {
            d: 'M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z'
        }
    ];
    const popupPinIconPaths = [
        {
            d: 'M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a6 6 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707s.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a6 6 0 0 1 1.013.16l3.134-3.133a3 3 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146m.122 2.112v-.002zm0-.002v.002a.5.5 0 0 1-.122.51L6.293 6.878a.5.5 0 0 1-.511.12H5.78l-.014-.004a5 5 0 0 0-.288-.076 5 5 0 0 0-.765-.116c-.422-.028-.836.008-1.175.15l5.51 5.509c.141-.34.177-.753.149-1.175a5 5 0 0 0-.192-1.054l-.004-.013v-.001a.5.5 0 0 1 .12-.512l3.536-3.535a.5.5 0 0 1 .532-.115l.096.022c.087.017.208.034.344.034q.172.002.343-.04L9.927 2.028q-.042.172-.04.343a1.8 1.8 0 0 0 .062.46z'
        }
    ];

    const createPopupIcon = (className, paths) => {
        const icon = document.createElementNS(SVG_NS, 'svg');
        icon.setAttribute('xmlns', SVG_NS);
        icon.setAttribute('width', '16');
        icon.setAttribute('height', '16');
        icon.setAttribute('fill', 'currentColor');
        icon.setAttribute('class', className);
        icon.setAttribute('viewBox', '0 0 16 16');

        paths.forEach((pathConfig) => {
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', pathConfig.d);
            icon.appendChild(path);
        });

        return icon;
    };

    // inject cards for the user 
    const injectCards = (note) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        const pinClass = note.enablePin ? 'selected' : 'disable'
        const dateStr = note.date.replace(/\//g, '-');
        const id = note.id

        const colorClass = note.color ? `color-${note.color}` : '';

        const wrapper = document.createElement('div');
        const header = document.createElement('div');
        header.className = `note-header ${colorClass}`;

        const dateLabel = document.createElement('span');
        dateLabel.textContent = dateStr;

        const actionShell = document.createElement('span');
        actionShell.className = 'cursor-pointer';
        const icons = document.createElement('div');
        icons.className = 'icons';

        const deleteBtn = document.createElement('button');
        deleteBtn.id = id;
        deleteBtn.type = 'button';
        deleteBtn.className = 'icon-btn delete-btn';
        deleteBtn.setAttribute('aria-label', 'Delete note');
        deleteBtn.appendChild(createPopupIcon('bi disbale bi-trash', popupTrashIconPaths));

        const pinBtn = document.createElement('button');
        pinBtn.type = 'button';
        pinBtn.dataset.noteId = id;
        pinBtn.className = `${pinClass} icon-btn pin-btn`;
        pinBtn.setAttribute('aria-label', 'Pin note');
        pinBtn.appendChild(createPopupIcon('bi bi-pin-angle', popupPinIconPaths));

        icons.append(deleteBtn, pinBtn);
        actionShell.appendChild(icons);
        header.append(dateLabel, actionShell);

        const contentContainer = document.createElement('div');
        contentContainer.contentEditable = 'false';
        contentContainer.className = 'note-content-container';
        contentContainer.textContent = note.content || '';

        wrapper.append(header, contentContainer);
        card.appendChild(wrapper);

        allListContainer.prepend(card);


        pinBtn.addEventListener('click', async (event) => {

            let enablePin = true;

            if (pinBtn.classList.contains('selected')) {
                pinBtn.classList.remove('selected');
                pinBtn.classList.add('disable');
                enablePin = false;
            } else {
                pinBtn.classList.add('selected');
                pinBtn.classList.remove('disable');
            }

            const id = pinBtn.dataset.noteId;


            await chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                var activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, { "message": MESSAGE.UPDATE_PIN_IN_CONTENT_SCRIPT, "isPinEnable": enablePin, "id": id });
            });


        });



        // event listner for delete btn 
        deleteBtn.addEventListener('click', async () => {
            if (confirm(getDeleteMessage())) {
                const noteArr = await UserLocalStorage.retrieveNoteData()
                if (noteArr.length > 0) {
                    noteArr.forEach(async (note) => {
                        const id = note.id

                        if (deleteBtn.id == id) {

                            // Remove the note from the array
                            const newArr = noteArr.filter((n) => n !== note);

                            await UserLocalStorage.setStorage(newArr)

                            // remove card
                            card.remove();

                            // Send a message to the background script to remove the tab
                            chrome.runtime.sendMessage({ action: MESSAGE.REMOVE_TAB, title: "StickyNotes" });

                            // remove the element from the dom 
                            chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                                var activeTab = tabs[0];
                                chrome.tabs.sendMessage(activeTab.id, { "action": MESSAGE.REMOVE_ELEMENT_FROM_DOM, "id": id });
                            });

                            chrome.runtime.sendMessage({ action: MESSAGE.REMOVE_TAB, title: "StickyNotes" });

                            const updateNote = await UserLocalStorage.retrieveNoteData()
                            if (updateNote.length % 2 !== 0) {
                                await changePage(currentPage - 1)
                                await checkPagination(updateNote)
                            } else {
                                await refreshNotesView(updateNote)
                            }

                        }
                    })
                }
            } else {
                console.warn("Note not removed");
            }

        });


    }

    /*                         EVENT LISTNER START                      */
    // allow the user to create multiple text areas
    addBtn.addEventListener('click', () => {
        if (!isActiveTabReady || !hostName || !url) {
            console.warn('Active tab context is not ready. Cannot add note.')
            return
        }

        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            var activeTab = tabs[0];
            const noteData = UserLocalStorage.createNote(url)
            chrome.tabs.sendMessage(activeTab.id, { "message": MESSAGE.START, "noteData": noteData }, async function (response) {
                if (response && response.status === "success") {
                    // update the data in localstorage
                    noteArr = await UserLocalStorage.retrieveNoteData()
                    noteArr.push(noteData)
                    await UserLocalStorage.setStorage(noteArr);
                    // Re-render from the array we just wrote; renderNotes
                    // recomputes and displays the note count.
                    await refreshNotesView(noteArr)
                }
            });
        });
    });

    // hide btn -currently not to use 
    // hideAllBtn.addEventListener('click', async () => {

    //     isHidden = !isHidden
    //     UserLocalStorage.setIsHidden(isHidden)
    //     if (isHidden === true) {
    //         hideAllBtn.innerText = 'Show All Notes'
    //     } else {
    //         hideAllBtn.innerText = 'Hide All Notes'
    //     }

    //     chrome.runtime.sendMessage({ action: 'hide', isHidden: isHidden });
    // });


    // document.getElementById('openTabButton').addEventListener('click', () => {
    //     chrome.runtime.sendMessage({ action: 'createTabAndInject' });
    //     // UserLocalStorage.deleteNoteData()
    // });


    settingsBtn.addEventListener('click', async (e) => {
        console.log('triggered!')
        e.stopPropagation();
        const settingsMenu = document.getElementById('settingsMenu');
        settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';

        const noteArr = await UserLocalStorage.retrieveNoteData();
        const displayUnpin = noteArr.some(note => note.enablePin === true);

        const unpinBtn = document.getElementById('unPinAll');
        unpinBtn.innerText = displayUnpin ? getUnPinMessage() : DisplayPin();

        if (!displayUnpin) {
            console.log(unpinBtn.getAttribute('state'), 'check')
            unpinBtn.setAttribute('state', true);
        }
    });

    seeAllNotes.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: MESSAGE.CREATE_TAB_AND_INJECT });
        // UserLocalStorage.deleteNoteData()
    });


    document.getElementById('unPinAll').addEventListener('click', async () => {
        console.log('triggered !')
        const button = document.getElementById('unPinAll');
        const noteArr = await UserLocalStorage.retrieveNoteData();
        const filterNote = noteArr.filter(note => note.hostName === hostName);

        // if state is not false then it is true 
        const shouldUnpin = button.getAttribute('state') !== 'false';

        console.log(shouldUnpin, 'check')

        // it create a new updated filter with all true value 
        const updatedFilterNote = filterNote.map(note => {
            return {
                ...note,
                enablePin: shouldUnpin
            };
        });


        // we update the attribute 
        button.setAttribute('state', !shouldUnpin);
        // change the inner text 
        button.innerText = shouldUnpin ? getUnPinMessage() : DisplayPin();

        console.log(button.innerHTML, 'check inner text')

        await UserLocalStorage.updateNote(updatedFilterNote, shouldUnpin)
        renderNotes()

    });



    /*                         EVENT LISTNER ENDa                    */

    tippy('.delete-btn', {
        content: getDeleteMessage(),
        placement: 'bottom',
        theme: 'clean'
    });

    tippy('.pin-btn', {
        content: getPinMessage(),
        placement: 'bottom',
        theme: 'clean'
    });
});






