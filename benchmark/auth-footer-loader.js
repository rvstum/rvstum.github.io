(function () {
    function getPathDepthPrefix() {
        const pathname = (window.location.pathname || '').toLowerCase();
        const isNestedAuthPage = /\/benchmark\/(sign-up|forgot-password|verification-sent)(\/|$|\/index\.html$)/.test(pathname);
        return isNestedAuthPage ? '../../' : '../';
    }

    function inferReturnTo() {
        const pathname = (window.location.pathname || '').toLowerCase();
        if (pathname.includes('/sign-up')) return 'signup';
        if (pathname.includes('/forgot-password')) return 'forgot-password';
        if (pathname.includes('/verification-sent')) return 'verification-sent';
        return 'login';
    }

    function ensureLanguageSelect() {
        if (document.getElementById('authLanguageSelect')) return;
        const container = document.querySelector('.login-container');
        if (!container) return;

        const select = document.createElement('select');
        select.id = 'authLanguageSelect';
        select.className = 'auth-lang-select';
        container.insertBefore(select, container.firstChild);
    }

    function ensureFooter() {
        if (document.querySelector('footer.auth-footer')) return;

        const prefix = getPathDepthPrefix();
        const returnTo = inferReturnTo();

        const footer = document.createElement('footer');
        footer.className = 'legal-footer auth-footer';
        footer.innerHTML = `
            <div class="benchmark-footer-inner">
                <div class="legal-footer-icon-wrap">
                    <img class="legal-baddy-icon" src="${prefix}icons/baddy.png" alt="Baddy icon">
                </div>
                <div class="legal-footer-text"><span data-auth-i18n="footer_site_made_by">Site made by</span> <span class="legal-author">Rustum</span>.</div>
                <div class="legal-footer-disclaimer" data-auth-i18n="footer_disclaimer">This site is not affiliated, maintained, endorsed or sponsored by GraalOnline. All assets &copy; 2026 GraalOnline</div>
                <div class="legal-footer-links">
                    <a href="${prefix}terms-and-condition/index.html?from=benchmark&returnTo=${returnTo}" target="_blank" rel="noopener noreferrer" data-auth-i18n="footer_terms">Terms &amp; Conditions</a>
                    <span class="legal-divider">|</span>
                    <a href="${prefix}privacy-policy/index.html?from=benchmark&returnTo=${returnTo}" target="_blank" rel="noopener noreferrer" data-auth-i18n="footer_privacy">Privacy Policy</a>
                    <span class="legal-divider">|</span>
                    <a href="${prefix}cookie-policy/index.html?from=benchmark&returnTo=${returnTo}" target="_blank" rel="noopener noreferrer" data-auth-i18n="footer_cookie">Cookie Policy</a>
                    <span class="legal-divider">|</span>
                    <a href="${prefix}dmca-copyright-policy/index.html?from=benchmark&returnTo=${returnTo}" target="_blank" rel="noopener noreferrer" data-auth-i18n="footer_dmca">DMCA Policy</a>
                </div>
            </div>
        `;

        document.body.appendChild(footer);
    }

    function initAuthFooter() {
        ensureLanguageSelect();
        ensureFooter();
    }

    // Run immediately so auth language setup can bind before module scripts execute.
    initAuthFooter();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthFooter, { once: true });
    }
})();
