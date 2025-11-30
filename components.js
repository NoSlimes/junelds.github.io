// components.js - reusable UI components for Junelds

(function () {
    const tours = {
        nyborjartur: {
            title: 'Nybörjartur',
            body: '<p>En lugn tur lämpad för nybörjare. Vi går igenom säkerhet, utrustning och grundläggande kommando innan vi rider ut tillsammans med en erfaren guide.</p><ul><li>Längd: 1 timme</li><li>Pris: 400 kr</li><li>Ålder: Från 6 år</li></ul>'
        },
        skogstur: {
            title: 'Skogstur',
            body: '<p>Två timmar i Kårestads skogar. Krävande terräng på vissa partier, god grundkänsla rekommenderas.</p><ul><li>Längd: 2 timmar</li><li>Pris: 700 kr</li></ul>'
        },
        solnedgangstur: {
            title: 'Solnedgångstur',
            body: '<p>Romantisk ridtur i solnedgången. Ta med varma kläder — det kan bli kyligt när solen går ner.</p><ul><li>Längd: 2.5 timmar</li><li>Pris: 850 kr</li></ul>'
        },
        heldag: {
            title: 'Heldag i sadeln',
            body: '<p>En långdag i sadeln med lunch vid sjön och möjlighet att prova olika ridutmaningar. För erfarna ryttare.</p><ul><li>Längd: 6 timmar</li><li>Pris: 1800 kr</li></ul>'
        }
    };

    function qs(selector, el = document) { return el.querySelector(selector); }
    function qsa(selector, el = document) { return Array.from(el.querySelectorAll(selector)); }

    function buildTourDetailsHtml(tourKey) {
        return `<div class="tour-details">${tours[tourKey].body}</div>`;
    }

    function openModal(key) {
        const modal = qs('#modal');
        const titleEl = qs('#modal-title');
        const bodyEl = qs('#modal-body');
        const data = tours[key];
        if (!data) return;
        titleEl.textContent = data.title;
        // populate body with tour details only
        bodyEl.innerHTML = buildTourDetailsHtml(key);

        // wire up modal 'Boka nu' button to scroll to contact section and close modal
        const modalBook = qs('#modal-book');
        if (modalBook) {
            const newBtn = modalBook.cloneNode(true);
            modalBook.parentNode.replaceChild(newBtn, modalBook);
            newBtn.addEventListener('click', function (ev) {
                ev.preventDefault();
                const target = qs('#kontakt');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
                closeModal();
            });
        }

        modal.setAttribute('aria-hidden', 'false');
        // save last focused
        modal.__lastFocus = document.activeElement;
        // focus modal for accessibility
        qs('.modal-close').focus();
        document.documentElement.style.overflow = 'hidden';
    }

    // Note: persistent contact autofill removed per request.

    function closeModal() {
        const modal = qs('#modal');
        modal.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
        // restore focus
        try { modal.__lastFocus && modal.__lastFocus.focus(); } catch (e) {}
    }

    function onKey(e) {
        if (e.key === 'Escape') closeModal();
    }

    document.addEventListener('DOMContentLoaded', function () {
        // make whole tour card clickable (and keyboard accessible)
        qsa('.tour-card').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', function (ev) {
                // ignore clicks on inner links or buttons
                if (ev.target.closest('a, button')) return;
                const key = card.dataset.tourId || card.dataset.tour;
                openModal(key);
            });
            card.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    const key = card.dataset.tourId || card.dataset.tour;
                    openModal(key);
                }
            });
        });

        // close handlers (backdrop + close button)
        qsa('[data-action="close"]').forEach(el => el.addEventListener('click', closeModal));

        // keyboard
        document.addEventListener('keydown', onKey);

        // trap focus in modal (basic)
        const modal = qs('#modal');
        modal.addEventListener('keydown', function (e) {
            if (e.key !== 'Tab') return;
            const focusable = qsa('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', modal)
                .filter(el => el.offsetParent !== null);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
        });

        // Simple enhancement: if media files are present in /media, show placeholders (no filesystem access in static JS)
        // In a dynamic setup you could fetch an index.json created at build time. For now we keep a placeholder.

        // No persistent contact form handler (mail form removed).
    });

})();
