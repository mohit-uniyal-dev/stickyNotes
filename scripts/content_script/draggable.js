const makeDraggable = (element, handle, id, position) => {
    const noteId = id;

    let isDragging = false;
    let startX, startY, initialMouseX, initialMouseY;

    // Apply the initial position if provided
    if (position) {
        element.style.left = position.left || '0px';
        element.style.top = position.top || '0px';
    }

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const savePosition = (id, position) => {
        chrome.runtime.sendMessage({ action: MESSAGE.STORE_POSITION, id: id, position: position });
    };

    const debouncedSavePosition = debounce(savePosition, 500); // 500ms delay after the user stops moving

    const mouseDownHandler = (e) => {
        isDragging = true;
        startX = element.offsetLeft;
        startY = element.offsetTop;
        initialMouseX = e.clientX;
        initialMouseY = e.clientY;

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);

        e.preventDefault(); // Prevent text selection
    };

    const mouseMoveHandler = (e) => {
        if (!isDragging) return;

        const dx = e.clientX - initialMouseX;
        const dy = e.clientY - initialMouseY;

        element.style.left = `${startX + dx}px`;
        element.style.top = `${startY + dy}px`;

        // Reset the debounce timer each time the user moves the element
        const finalPosition = {
            left: element.style.left,
            top: element.style.top
        };
        debouncedSavePosition(noteId, finalPosition);
    };

    const mouseUpHandler = () => {
        isDragging = false;
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    };

    handle.addEventListener('mousedown', mouseDownHandler);
};
