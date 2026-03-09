export function alignMobileTitleBetweenTopAndBox() {
    const title = document.querySelector('.app-title');
    const box = document.querySelector('.login-container');
    if (!title || !box) return;

    if (!window.matchMedia('(max-width: 900px)').matches) {
        title.style.removeProperty('transform');
        return;
    }

    title.style.setProperty('transform', 'none', 'important');
    const titleRect = title.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const desiredTop = Math.max(4, (boxRect.top - titleRect.height) / 2);
    const deltaY = Math.round(desiredTop - titleRect.top);
    title.style.setProperty('transform', `translateY(${deltaY}px)`, 'important');
}
