export function alignMobileTitleBetweenTopAndBox() {
    const title = document.querySelector('.app-title');
    if (!title) return;
    title.style.removeProperty('transform');
}
