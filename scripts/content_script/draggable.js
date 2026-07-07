const makeDraggable = (element, handle, id, position) => {
    const noteId = id;

    let isDragging = false;
    let startX, startY, initialPointerX, initialPointerY;

    // Apply the initial position if provided
    if (position) {
        element.style.left = position.left || '0px';
        element.style.top = position.top || '0px';
    }

    const savePosition = () => {
        chrome.runtime.sendMessage({
            action: MESSAGE.STORE_POSITION,
            id: noteId,
            position: {
                left: element.style.left,
                top: element.style.top
            }
        });
    };

    const pointerDownHandler = (e) => {
        // Only start on the primary mouse button; touch and pen always pass.
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        // Don't hijack clicks on the note's controls (add / options / pin / close).
        if (e.target.closest('button')) return;

        isDragging = true;
        startX = element.offsetLeft;
        startY = element.offsetTop;
        initialPointerX = e.clientX;
        initialPointerY = e.clientY;

        // Capture the pointer so move/up keep firing on the handle even when
        // the pointer leaves it, without global document listeners.
        handle.setPointerCapture(e.pointerId);

        e.preventDefault(); // Prevent text selection
    };

    const pointerMoveHandler = (e) => {
        if (!isDragging) return;

        const dx = e.clientX - initialPointerX;
        const dy = e.clientY - initialPointerY;

        element.style.left = `${startX + dx}px`;
        element.style.top = `${startY + dy}px`;
    };

    const pointerUpHandler = (e) => {
        if (!isDragging) return;
        isDragging = false;

        if (handle.hasPointerCapture(e.pointerId)) {
            handle.releasePointerCapture(e.pointerId);
        }

        // Persist once, when the drag actually ends.
        savePosition();
    };

    handle.addEventListener('pointerdown', pointerDownHandler);
    handle.addEventListener('pointermove', pointerMoveHandler);
    handle.addEventListener('pointerup', pointerUpHandler);
    handle.addEventListener('pointercancel', pointerUpHandler);
};
