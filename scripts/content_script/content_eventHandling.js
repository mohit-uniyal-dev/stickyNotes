
const eventListenerForNote = (shadowRoot, container, noteContainer) => {
    // add btn 
    shadowRoot.querySelector('.add-btn').addEventListener('click', async () => {
        // created a code for id and inner html 
        const url = window.location.href

        chrome.runtime.sendMessage({ action: MESSAGE.STORE_NOTE_DATA, url: url }, (response) => {
            const id = response.noteData.id
            if (id) {
                const title = response.noteData.title
                SimpleShadowDOM.createPopup(response.noteData);
            }
        });


    });

    // close btn
    const closeBtn = shadowRoot.querySelector('.close-btn');
    const pin = shadowRoot.querySelector('.pin');
    const title = shadowRoot.querySelector('.title')
    const options = shadowRoot.querySelector('#options')


    // event listner for option button 
    options.addEventListener('click', function (event) {
        const colorMenu = shadowRoot.querySelector('.color-palette')
        colorMenu.style.display = colorMenu.style.display === 'flex' ? 'none' : 'flex';

        if (colorMenu.style.display === 'flex') {
            eventListenerForColorBtns(colorMenu)
        }
    });


    // event listner for the color buttons 



    if (pin) {
        pin.addEventListener('click', (event) => {

            // event target
            let enablePin = true

            if (pin.classList.contains('selected')) {
                pin.classList.remove('selected');
                pin.classList.add('disable');
                enablePin = false
            } else {
                pin.classList.add('selected');
                pin.classList.remove('disable');
            }
            const id = pin.getAttribute('pinId')
            chrome.runtime.sendMessage({ action: MESSAGE.ENABLE_PIN, isPinEnable: enablePin, id: id });
        })
    }


    closeBtn.addEventListener('click', async () => {
        // Remove the 'show' class
        noteContainer.classList.remove('show');

        // Add a slight delay before adding the 'close' class to allow for any potential transition effects
        setTimeout(() => {
            noteContainer.classList.add('close');
            container.remove()
        }, 100); // Adjust the delay as needed

        // Get the uniqueId attribute from the closeBtn button
        const id = closeBtn.getAttribute('uniqueId');

        // Send message to the background script
        chrome.runtime.sendMessage({
            action: MESSAGE.UPDATE_PIN,
            isPinEnable: false, // or true, depending on what you want to set
            id: id
        });

        // Optional: Remove the container after the transition has ended
        container.addEventListener('transitionend', () => {
            if (container.classList.contains('close')) {
                container.remove();
            }
        }, { once: true });
    });





    const textArea = shadowRoot.querySelector('.textarea');
    preventUnintendedEvents(textArea)
    // Debounce function to delay execution
    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Event listener with debounce
    textArea.addEventListener('input', debounce(() => {
        const noteContent = textArea.innerText;
        chrome.runtime.sendMessage({
            action: MESSAGE.UPDATE_NOTE_CONTENT,
            id: textArea.id,
            content: noteContent
        });
        chrome.runtime.sendMessage({ action: MESSAGE.REMOVE_TAB, title: "StickyNotes" });
    }, 500)); // Adjust the delay (in milliseconds) as needed


    function preventUnintendedEvents(element) {
        // Prevent event propagation while allowing default behavior
        element.addEventListener('keydown', function (event) {
            event.stopPropagation();
        });

        element.addEventListener('keypress', function (event) {
            event.stopPropagation();
        });

        element.addEventListener('keyup', function (event) {
            event.stopPropagation();
        });

        // Specially handle focus-related events
        element.addEventListener('focus', function (event) {
            event.stopPropagation();
        }, true);
    }

    function eventListenerForColorBtns(ele) {
        ele.addEventListener('click', function (event) {
            if (event.target.classList.contains('color-btn')) {
                const selectedColor = event.target.getAttribute('data-color');
                const noteHeader = event.target.closest('.note-container').querySelector('.note-title');

                noteHeader.classList.remove('color-red', 'color-yellow', 'color-default', 'color-grey', 'color-purple', 'color-pink');
                noteHeader.classList.add(`color-${selectedColor}`);

                const buttons = document.querySelectorAll('.color-btn');
                buttons.forEach(btn => btn.classList.remove('color-selected'));

                event.target.classList.add('color-selected');
                const uniqueId = event.target.closest('.note-container').getAttribute('uniqueid')
                console.log(`Selected color is: ${selectedColor} , and uniue id : ${uniqueId}`);

                chrome.runtime.sendMessage({ action: MESSAGE.ADD_SELECTED_COLOR, selectedColor: selectedColor, uniqueId: uniqueId });
            }
        })
    }

}
