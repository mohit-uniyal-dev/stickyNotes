/**
 * Docked tray for minimized sticky notes.
 *
 * Minimizing a note hides its floating window and drops a compact pill into a
 * single shared, self-organizing strip anchored to the bottom-right of the
 * viewport, so any number of minimized notes stay tidy instead of scattering as
 * individual floating tokens. Clicking a pill restores the note to exactly
 * where it was.
 *
 * The tray lives in its own shadow root (isolated from page CSS), is created
 * lazily on first use, and removes itself when the last note is restored.
 */
const MinimizedTray = (() => {
    let trayHost = null;
    let listEl = null;

    const TRAY_STYLES = `
        :host { all: initial; }
        .tray {
            position: fixed;
            bottom: 12px;
            right: 12px;
            z-index: 2147483647;
            display: flex;
            flex-wrap: wrap-reverse;
            justify-content: flex-end;
            align-items: flex-end;
            gap: 8px;
            max-width: 60vw;
            margin: 0;
            padding: 0;
            /* Only the pills should capture clicks; the strip itself lets page
               clicks pass through the gaps around them. */
            pointer-events: none;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .pill {
            pointer-events: auto;
            box-sizing: border-box;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            max-width: 220px;
            height: 34px;
            margin: 0;
            padding: 0 12px;
            border: 1px solid #ebebee;
            border-radius: 999px;
            background: #ffffff;
            color: #0a0b0d;
            box-shadow: 0 6px 20px rgba(10, 11, 13, 0.16);
            cursor: pointer;
            font: inherit;
            font-size: 13px;
            font-weight: 600;
            letter-spacing: -0.01em;
            line-height: 1;
            transition: transform 120ms ease, box-shadow 150ms ease, border-color 150ms ease;
        }
        .pill:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 26px rgba(10, 11, 13, 0.2);
        }
        .pill:focus-visible {
            outline: none;
            box-shadow: 0 0 0 3px rgba(10, 11, 13, 0.18);
        }
        .dot {
            flex: 0 0 auto;
            width: 10px;
            height: 10px;
            border-radius: 999px;
            background: #0a0b0d;
        }
        .globe {
            flex: 0 0 auto;
            display: inline-flex;
            width: 15px;
            height: 15px;
        }
        .label {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .color-red { background: #dc2626; }
        .color-yellow { background: #ca8a04; }
        .color-green { background: #16803d; }
        .color-grey { background: #4b5563; }
        .color-purple { background: #7c3aed; }
        .color-pink { background: #db2777; }
        /* Global note pill: the same reserved gradient + globe used on the note
           itself, so it stays identifiable while minimized. */
        .pill--global {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: #0a0b0d;
            border-color: transparent;
            box-shadow: 0 6px 20px rgba(217, 119, 6, 0.34);
        }
        .pill--global:hover {
            box-shadow: 0 10px 26px rgba(217, 119, 6, 0.42);
        }
        .pill--global:focus-visible {
            box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.55);
        }
        .pill--global .globe { color: #0a0b0d; }
        @media (prefers-color-scheme: dark) {
            .pill {
                background: #141518;
                color: #f5f6f7;
                border-color: #26282d;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            }
            .pill:focus-visible { box-shadow: 0 0 0 3px rgba(245, 246, 247, 0.24); }
            .dot { background: #f5f6f7; }
            /* Keep the global pill on its reserved golden gradient in dark mode too. */
            .pill--global {
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                color: #0a0b0d;
                border-color: transparent;
            }
            .pill--global .globe { color: #0a0b0d; }
        }
    `;

    const ensureTray = () => {
        if (trayHost) return;
        trayHost = document.createElement('div');
        trayHost.className = 'sn-minimized-tray-host';
        const shadow = trayHost.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = TRAY_STYLES;

        listEl = document.createElement('div');
        listEl.className = 'tray';

        shadow.append(style, listEl);
        document.body.appendChild(trayHost);
    };

    const removeTrayIfEmpty = () => {
        if (listEl && listEl.children.length === 0 && trayHost) {
            trayHost.remove();
            trayHost = null;
            listEl = null;
        }
    };

    const previewText = (content) => {
        const text = String(content || '').trim();
        if (!text) return 'Empty note';
        const firstLine = text.split('\n')[0];
        return firstLine.length > 26 ? `${firstLine.slice(0, 26)}…` : firstLine;
    };

    // A stroked globe marker for the global note's pill.
    const createGlobe = () => {
        const svgNs = 'http://www.w3.org/2000/svg';
        const icon = document.createElementNS(svgNs, 'svg');
        icon.setAttribute('class', 'globe');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('aria-hidden', 'true');

        const circle = document.createElementNS(svgNs, 'circle');
        circle.setAttribute('cx', '12');
        circle.setAttribute('cy', '12');
        circle.setAttribute('r', '9');
        circle.setAttribute('stroke', 'currentColor');
        circle.setAttribute('stroke-width', '1.9');

        const meridians = document.createElementNS(svgNs, 'path');
        meridians.setAttribute('d', 'M3 12h18M12 3c2.5 2.4 3.8 5.6 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3Z');
        meridians.setAttribute('stroke', 'currentColor');
        meridians.setAttribute('stroke-width', '1.7');

        icon.append(circle, meridians);
        return icon;
    };

    // Add a pill for a note ({ id, content?, color?, scope? }) without persisting.
    const addPill = (note) => {
        ensureTray();
        if (listEl.querySelector(`[data-note-id="${note.id}"]`)) return;

        const isGlobal = note.scope === 'global';

        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = isGlobal ? 'pill pill--global' : 'pill';
        pill.setAttribute('data-note-id', note.id);
        pill.setAttribute('aria-label', isGlobal
            ? `Restore global note: ${previewText(note.content)}`
            : `Restore note: ${previewText(note.content)}`);

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = previewText(note.content);

        if (isGlobal) {
            // The global note carries a globe marker instead of a color dot.
            pill.append(createGlobe(), label);
        } else {
            const dot = document.createElement('span');
            dot.className = 'dot';
            if (note.color) dot.classList.add(`color-${note.color}`);
            pill.append(dot, label);
        }

        pill.addEventListener('click', () => restore(note.id));
        listEl.appendChild(pill);
    };

    // Remove a note's pill (on restore, or when the note is deleted elsewhere).
    const removePill = (id) => {
        if (!listEl) return;
        const pill = listEl.querySelector(`[data-note-id="${id}"]`);
        if (pill) pill.remove();
        removeTrayIfEmpty();
    };

    // Hide the note window and show it as a pill. Does NOT persist — callers
    // that represent a fresh user action persist the flag themselves; the
    // load-time path is already persisted.
    const minimize = (note) => {
        const host = SimpleShadowDOM.getHostById(note.id);
        if (host) {
            host.dataset.snMinimized = 'true';
            host.style.display = 'none';
        }
        addPill(note);
    };

    // Show the note window again, drop the pill, and persist minimized=false.
    const restore = (id) => {
        const host = SimpleShadowDOM.getHostById(id);
        if (host) {
            delete host.dataset.snMinimized;
            host.style.display = '';
        }
        removePill(id);
        chrome.runtime.sendMessage({ action: MESSAGE.UPDATE_MINIMIZED, id: id, minimized: false });
    };

    // Apply a minimized state that arrived from another tab (the global note's
    // shared state). Does NOT persist or message the background, so it never
    // echoes back into a sync loop. No-op if the note has no window on this tab.
    const syncMinimized = (note) => {
        const host = SimpleShadowDOM.getHostById(note.id);
        if (!host) return;

        if (note.minimized) {
            minimize(note);
        } else {
            delete host.dataset.snMinimized;
            host.style.display = '';
            removePill(note.id);
        }
    };

    return { minimize, restore, removePill, syncMinimized };
})();
