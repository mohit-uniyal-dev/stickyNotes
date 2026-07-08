const makeDraggable = (element, handle, id, position) => {
    const noteId = id;

    let isDragging = false;
    let startX, startY, initialPointerX, initialPointerY;
    // Offset between the element's layout box (left/top) and its rendered box
    // (the note is centered with translate(-50%, -50%)), plus its rendered
    // size. Captured on pointer-down so dragging can keep the note on-screen
    // without hard-coding the transform.
    let renderOffsetX = 0, renderOffsetY = 0, renderWidth = 0, renderHeight = 0;

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

        const rect = element.getBoundingClientRect();
        renderOffsetX = rect.left - startX;
        renderOffsetY = rect.top - startY;
        renderWidth = rect.width;
        renderHeight = rect.height;

        // Capture the pointer so move/up keep firing on the handle even when
        // the pointer leaves it, without global document listeners.
        handle.setPointerCapture(e.pointerId);

        e.preventDefault(); // Prevent text selection
    };

    const pointerMoveHandler = (e) => {
        if (!isDragging) return;

        const dx = e.clientX - initialPointerX;
        const dy = e.clientY - initialPointerY;

        // Keep the whole note within the viewport. minLeft/maxLeft are in the
        // element's layout space; adding renderOffset maps to the rendered box.
        const minLeft = -renderOffsetX;
        const maxLeft = window.innerWidth - renderWidth - renderOffsetX;
        const minTop = -renderOffsetY;
        const maxTop = window.innerHeight - renderHeight - renderOffsetY;

        // Math.max(min, Math.min(value, max)) also yields `min` when the note is
        // larger than the viewport (max < min), pinning it to the top-left edge.
        const nextLeft = Math.max(minLeft, Math.min(startX + dx, maxLeft));
        const nextTop = Math.max(minTop, Math.min(startY + dy, maxTop));

        element.style.left = `${nextLeft}px`;
        element.style.top = `${nextTop}px`;
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
