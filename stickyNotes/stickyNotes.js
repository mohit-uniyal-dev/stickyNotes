

let noteArr = []
let isHidden = false
const notesPerPage = 2;
let currentPage = 1;

let length = 0

document.addEventListener('DOMContentLoaded', function () {

    const addBtn = document.getElementById('add-note')
    const allListContainer = document.getElementById('allNotesList')
    const removeAllBtn = document.querySelector('.removeAll')
    const title = document.querySelector('#title')
    const seeAllNotes = document.getElementById('seeAllNotes')
    seeAllNotes.innerText = getViewAllNotes()

    title.innerText = getHeading()

    // remove all btn logic
    removeAllBtn.addEventListener('click', () => {

        if (confirm(` ${getDeleteAllMsg()} : ${hostName}`)) {
            document.getElementById('allNotesList').innerHTML = '';
            chrome.runtime.sendMessage({ action: 'removeUsingHostName', hostName: hostName });
            chrome.runtime.sendMessage({ action: "removeTab", title: "StickyNotes" });

            length = 0
            updateNoteLength(length)
        }
    })

    // const setLanaguegToEnglish = document.getElementById('setLanguage')


    // setLanaguegToEnglish.innerText = getLanguageMessage()


    let url = ''
    let hostName = ''


    // query
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        hostName = new URL(tabs[0].url).hostname;
        url = tabs[0].url;

    });

    // handle displaying and inserting card and creating pagination  //

    /*                          START                      */
    // get totoal no of page 
    const getTotalPages = async () => {
        const allNotes = await UserLocalStorage.retriveNoteData()
        const filterNotes = allNotes.filter(noteObj => { return noteObj.hostName === hostName })
        return new Promise((resolve, reject) => {
            const result = Math.ceil(filterNotes.length / notesPerPage);
            resolve(result)
        })
    }


    // create pagination  pannel -chat gpt code - read it one time 
    const renderPagination = async () => {
        const paginationContainer = document.querySelector('.pagination');
        paginationContainer.innerHTML = '';

        const totalPages = await getTotalPages();

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
            const element = this.getElementById('notesNumber')
            element.innerText = `No Notes Saved`
            removeAllBtn.style.display = 'none'
        } else {
            const element = this.getElementById('notesNumber')
            element.innerText = `All Notes ${noteLength}`
            removeAllBtn.style.display = 'inline-flex'
        }

    }

    async function checkPagination() {
        const length = await getSameHostNameLength();

        const paginationContainer = document.querySelector('.pagination');

        if (length <= 2) {
            paginationContainer.style.display = 'none'
        } else {
            paginationContainer.style.display = 'flex'
        }
    }

    function getSameHostNameLength() {
        return UserLocalStorage.retriveNoteData().then(noteArr => {
            const filterNote = noteArr.filter(noteObj => noteObj.hostName === hostName);
            return filterNote.length;
        });
    }
    // render notes 
    const renderNotes = async () => {
        const allListContainer = document.getElementById('allNotesList');
        allListContainer.innerHTML = ''; // Clear the current notes

        // the start and end index display the no of cards should be display from what start to end 
        const startIndex = (currentPage - 1) * notesPerPage;
        let endIndex = startIndex + notesPerPage;


        noteArr = await UserLocalStorage.retriveNoteData()
        // based of the start and end value get noteToShow 
        const filterNote = noteArr.filter(noteObj => { return noteObj.hostName === hostName })
        const notesToShow = filterNote.slice(startIndex, endIndex);
        length = filterNote.length
        updateNoteLength(length)


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
        tippy('#pin', {
            content: getPinMessage(),
            placement: 'bottom',
            theme: 'clean'
        });
    }

    // change pages
    async function changePage(page) {
        const totalPages = await getTotalPages();
        console.log(totalPages, 'totalPage', page, 'page')

        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;

        currentPage = page;
        renderNotes();
        renderPagination();
    }

    // inject function
    function injectPopUps(note) {

        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            var activeTab = tabs[0];

            if (note.hostName == hostName) {
                chrome.tabs.sendMessage(activeTab.id, { "message": "injectPopUps", "noteData": note, });
            }
        });
    }


    const retriveData = async () => {

        const noteArr = await UserLocalStorage.retriveNoteData()
        if (noteArr.length > 0) {

            noteArr.forEach((element, index) => {
                if (element.hostName == hostName && element.enablePin) {
                    injectPopUps(element)
                }
            });
        }

    }

    // retriveData 
    (async function removeEmptyContent() {

        const noteArr = await UserLocalStorage.retriveNoteData()
        const updatedNoteArr = noteArr.filter((note) => note.content.replace(/\s+/g, '') !== '')

        // removiung the element from dom 
        const removeElementArray = noteArr.filter((note) => note.content.replace(/\s+/g, '') === '')

        // send message to bg 
        // removeElementArray.forEach(note => {
        //     const id = note.id
        //     chrome.tabs.query({}, function (tabs) {
        //         tabs.forEach(tab => {

        //             chrome.tabs.sendMessage(tab.id, { action: 'removeElementFromDom', id: id });

        //         });
        //     });
        // })

        // await UserLocalStorage.setStorage(updatedNoteArr)


    })().then(() => {
        retriveData()
        renderNotes();
        renderPagination();
        checkPagination()
    });

    // const sendHideMessage = () => {
    //     try {
    //         chrome.runtime.sendMessage({ action: 'hide', isHidden: isHidden });
    //     }
    //     catch (e) {
    //         console.log('error ', e)
    //     }
    // }

    /*                          END                      */

    // get data time 
    function getDateAndTime() {
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString();
        const timestamp = now.getTime(); // High-resolution timestamp
        const randomComponent = Math.random().toString(36).substring(2, 15); // Random string
        const uniqueId = `${timestamp}-${randomComponent}`; // Combine timestamp and random string
        const pin = false

        return {
            id: uniqueId,
            date: dateStr,
            time: timeStr,
            hostName: hostName,
            url: url,
            content: '',
            enablePin: true
        };
    }

    // inject cards for the user 
    const injectCards = (note) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        const pinClass = note.enablePin ? 'selected' : 'disable'
        const dateStr = note.date.replace(/\//g, '-');
        const content = note.content
        const id = note.id

        const colorClass = note.color ? `color-${note.color}` : '';

        card.innerHTML = `
        <div>
                <div class="note-header ${colorClass}">
                    <span> ${dateStr}</span>
                    <span  class=' cursor-pointer'>
                    <div class="icons">
                     <button id="${id}" class="icon-btn delete-btn">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi disbale bi-trash" viewBox="0 0 16 16">
  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
</svg>
                     </button>

<button  id='pin' uniqueId="${id}" class="${pinClass}  icon-btn">
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pin-angle " viewBox="0 0 16 16">
  <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a6 6 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707s.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a6 6 0 0 1 1.013.16l3.134-3.133a3 3 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146m.122 2.112v-.002zm0-.002v.002a.5.5 0 0 1-.122.51L6.293 6.878a.5.5 0 0 1-.511.12H5.78l-.014-.004a5 5 0 0 0-.288-.076 5 5 0 0 0-.765-.116c-.422-.028-.836.008-1.175.15l5.51 5.509c.141-.34.177-.753.149-1.175a5 5 0 0 0-.192-1.054l-.004-.013v-.001a.5.5 0 0 1 .12-.512l3.536-3.535a.5.5 0 0 1 .532-.115l.096.022c.087.017.208.034.344.034q.172.002.343-.04L9.927 2.028q-.042.172-.04.343a1.8 1.8 0 0 0 .062.46z"/>
</svg>
</button>
                    </div>

                </div>
                <div contenteditable="false" class="note-content-container" >${content}</div>
        </div>
            `;

        allListContainer.prepend(card);

        const pinBtn = document.querySelector('#pin'); // Ensure the selector matches an existing element


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

            // Use pinBtn instead of pin to get the attribute
            const id = pinBtn.getAttribute('uniqueId');


            await chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                var activeTab = tabs[0];
                chrome.tabs.sendMessage(activeTab.id, { "message": "updatePinInContentScript", "isPinEnable": enablePin, "id": id });
            });


        });



        // event listner for delete btn 
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async () => {
            if (confirm(getDeleteMessage())) {
                const noteArr = await UserLocalStorage.retriveNoteData()
                if (noteArr.length > 0) {
                    noteArr.forEach(async (note) => {
                        const id = note.id

                        if (deleteBtn.id == id) {

                            // Remove the note from the array
                            const newArr = noteArr.filter((n) => n !== note);

                            UserLocalStorage.setStorage(newArr)

                            // remove card
                            card.remove();

                            // Send a message to the background script to remove the tab
                            chrome.runtime.sendMessage({ action: "removeTab", title: "StickyNotes" });

                            // remove the element from the dom 
                            chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
                                var activeTab = tabs[0];
                                chrome.tabs.sendMessage(activeTab.id, { "action": "removeElementFromDom", "id": id });
                            });

                            chrome.runtime.sendMessage({ action: "removeTab", title: "StickyNotes" });

                            length = length - 1
                            updateNoteLength(length)

                            const updateNote = await UserLocalStorage.retriveNoteData()
                            if (updateNote.length % 2 !== 0) {
                                changePage(currentPage - 1)
                                checkPagination()
                            } else {
                                renderNotes()
                                renderPagination()
                                checkPagination()
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

        chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
            var activeTab = tabs[0];
            const noteData = getDateAndTime()
            chrome.tabs.sendMessage(activeTab.id, { "message": "start", "noteData": noteData }, async function (response) {
                if (response && response.status === "success") {
                    // update the data in loaclstorage
                    noteArr = await UserLocalStorage.retriveNoteData()
                    noteArr.push(noteData)
                    chrome.storage.local.set({ notes: noteArr });
                    // inject a add in the extension with the id data 
                    length = length + 1
                    updateNoteLength(length)
                    renderNotes()
                    renderPagination()
                    checkPagination()
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


    document.getElementById('openTabButton').addEventListener('click', async (e) => {
        console.log('triggered!')
        e.stopPropagation();
        const settingsMenu = document.getElementById('settingsMenu');
        settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';

        const noteArr = await UserLocalStorage.retriveNoteData();
        const displayUnpin = noteArr.some(note => note.enablePin === true);

        const unpinBtn = document.getElementById('unPinAll');
        unpinBtn.innerText = displayUnpin ? getUnPinMessage() : DisplayPin();

        if (!displayUnpin) {
            console.log(unpinBtn.getAttribute('state'), 'check')
            unpinBtn.setAttribute('state', true);
        }
    });

    seeAllNotes.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'createTabAndInject' });
        // UserLocalStorage.deleteNoteData()
    });


    document.getElementById('unPinAll').addEventListener('click', async () => {
        console.log('triggered !')
        const button = document.getElementById('unPinAll');
        const noteArr = await UserLocalStorage.retriveNoteData();
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

    tippy('#pin', {
        content: getDeleteMessage(),
        placement: 'bottom',
        theme: 'clean'
    });
});






