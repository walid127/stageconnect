/**
 * Positions a fixed dropdown below a trigger while keeping it inside the viewport horizontally.
 * Use with max-width classes like min(20rem, calc(100vw - 1rem)).
 */
export function computeBellDropdownPosition(buttonEl, options = {}) {
    const margin = options.margin ?? 8;
    const gap = options.gap ?? 8;
    const maxWidthPx = options.maxWidthPx ?? 320;

    if (!buttonEl || typeof buttonEl.getBoundingClientRect !== 'function') {
        return { top: gap, right: margin };
    }

    const rect = buttonEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const maxW = Math.min(maxWidthPx, vw - 2 * margin);
    const rawRight = vw - rect.right;
    const right = Math.min(Math.max(0, rawRight), Math.max(0, vw - maxW - margin));

    return {
        top: rect.bottom + gap,
        right,
    };
}
