// components.js - reusable UI components for Junelds

(function () {
    // Hjälpfunktioner för att välja element
    function qs(selector, el = document) { return el.querySelector(selector); }
    function qsa(selector, el = document) { return Array.from(el.querySelectorAll(selector)); }

    const bookingEmail = 'anna.juneld@gmail.com';
    
    // Här lagrar vi turerna när de laddats från JSON-filen
    let toursData = {};

    // Funktion för att bygga HTML till modalen
    function buildTourDetailsHtml(data) {
        let detailsHtml = '';
        if (data.details && Array.isArray(data.details)) {
            detailsHtml = '<ul>' + data.details.map(item => `<li>${item}</li>`).join('') + '</ul>';
        }
        return `
            <div class="tour-description"><p>${data.description}</p></div>
            <div class="tour-facts">${detailsHtml}</div>
        `;
    }

    // Öppna modalen
    function openModal(key) {
        const modal = qs('#modal');
        const titleEl = qs('#modal-title');
        const bodyEl = qs('#modal-body');
        
        const data = toursData[key];

        if (!data) {
            console.error(`Hittade ingen data för id: ${key}. Kontrollera att tours.json matchar HTML:ens data-tour-id.`);
            return;
        }

        titleEl.textContent = data.title;
        bodyEl.innerHTML = buildTourDetailsHtml(data);

        // Koppla "Boka nu"-knappen i modalen till formuläret
        const modalBook = qs('#modal-book');
        if (modalBook) {
            // Klona knappen för att rensa gamla event listeners
            const newBtn = modalBook.cloneNode(true);
            modalBook.parentNode.replaceChild(newBtn, modalBook);
            
            newBtn.addEventListener('click', function (ev) {
                ev.preventDefault();
                closeModal();
                fillContactForm(data.title);
            });
        }

        // Visa modalen
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('open'); // För styling om det behövs
        
        // Tillgänglighet: Spara fokus och lås scroll
        modal.__lastFocus = document.activeElement;
        const closeBtn = qs('.modal-close');
        if(closeBtn) closeBtn.focus();
        document.body.style.overflow = 'hidden';
    }

    // Fyll i kontaktformuläret och scrolla dit
    function fillContactForm(tourTitle) {
        const messageEl = qs('#contact-message');
        const form = qs('#contact-form');

        const defaultMessage = `Hej Junelds,\n\nJag är intresserad av att boka: ${tourTitle}.\n\nVi är X personer.\nÖnskat datum:\n\nÖvriga frågor:\n`;
        
        if (messageEl) {
            messageEl.value = defaultMessage;
        }

        if (form) {
            form.scrollIntoView({ behavior: 'smooth' });
            // Fokusera rutan efter scrollen
            setTimeout(() => { 
                if(messageEl) messageEl.focus(); 
            }, 800);
        }
    }

    // Stäng modalen
    function closeModal() {
        const modal = qs('#modal');
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.remove('open');
        document.body.style.overflow = ''; // Återställ scroll
        
        // Återställ fokus
        try { 
            if (modal.__lastFocus) modal.__lastFocus.focus(); 
        } catch (e) {}
    }

    // Lyssna på tangentbord (Escape)
    function onKey(e) {
        if (e.key === 'Escape') closeModal();
    }

    // Huvudfunktion som körs när sidan laddat
    document.addEventListener('DOMContentLoaded', async function () {
        async function loadTours() {
            function processArray(arr) {
                toursData = {};
                arr.forEach(item => {
                    if (!item || !item.id) return;
                    // ensure summary and image defaults
                    const summary = item.summary || (item.description ? (item.description.split('. ')[0] + '.') : '');
                    toursData[item.id] = Object.assign({ summary, image: item.image || `${item.id}.jpg`, icon: item.icon || '' }, item);
                });
            }

            function processObject(obj) {
                toursData = {};
                Object.keys(obj).forEach(key => {
                    const val = obj[key];
                    const id = key;
                    const title = val.title || '';
                    const description = val.description || '';
                    const details = Array.isArray(val.details) ? val.details : [];
                    const summary = val.summary || (description ? (description.split('. ')[0] + '.') : '');
                    toursData[id] = { id, title, description, details, summary, image: `${id}.jpg`, icon: '' };
                });
            }

            try {
                const res = await fetch('data/tours.json');
                if (!res.ok) throw new Error('Kunde inte läsa tours.json');
                const parsed = await res.json();
                if (Array.isArray(parsed)) processArray(parsed);
                else if (typeof parsed === 'object' && parsed !== null) processObject(parsed);
                else throw new Error('Okänt format i tours.json');
            } catch (e) {
                console.error('Fel vid laddning av tours.json:', e);
            }
        }

        function renderTours() {
            const grid = qs('#tours-grid');
            if (!grid) return;
            grid.innerHTML = '';
            Object.keys(toursData).forEach(id => {
                const t = toursData[id];
                // Skip tours that are marked as featured to avoid duplication
                if (t && t.featured === true) return;
                const art = document.createElement('article');
                art.className = 'tour-card';
                art.setAttribute('data-tour-id', t.id);
                art.setAttribute('tabindex', '0');

                const img = document.createElement('img');
                img.className = 'tour-image';
                img.src = `media/${t.image}`;
                img.alt = t.title;

                const icon = document.createElement('div');
                icon.className = 'tour-icon';
                icon.setAttribute('aria-hidden', 'true');
                icon.textContent = t.icon || '';

                const h3 = document.createElement('h3');
                h3.textContent = t.title;

                const p = document.createElement('p');
                p.textContent = t.summary || t.description || '';

                const ul = document.createElement('ul');
                if (t.length) ul.appendChild(createLi('Längd: ' + t.length));
                if (t.price) ul.appendChild(createLi('Pris: ' + t.price));
                if (t.minAge) ul.appendChild(createLi('Ålder: ' + t.minAge));

                art.appendChild(img);
                art.appendChild(icon);
                art.appendChild(h3);
                art.appendChild(p);
                art.appendChild(ul);

                art.style.cursor = 'pointer';
                art.addEventListener('click', function (ev) {
                    if (ev.target.closest('a, button')) return;
                    openModal(t.id);
                });
                art.addEventListener('keydown', function (ev) {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        openModal(t.id);
                    }
                });

                grid.appendChild(art);
            });
        }

        function createLi(text) { const li = document.createElement('li'); li.textContent = text; return li; }

        await loadTours();
        renderTours();
        renderFeatured();
        qsa('[data-action="close"]').forEach(el => el.addEventListener('click', closeModal));

        document.addEventListener('keydown', onKey);

        const contactSend = qs('#contact-send');
        if (contactSend) {
            contactSend.addEventListener('click', function () {
                const name = qs('#contact-name').value || '';
                const email = qs('#contact-email').value || '';
                const date = qs('#contact-date').value || '';
                const msg = qs('#contact-message').value || '';

                if (!name || !msg) {
                    alert('Vänligen fyll i namn och meddelande.');
                    return;
                }

                const subject = `Bokningsförfrågan från ${name}`;
                const body = `Hej Junelds,%0D%0A%0D%0A${encodeURIComponent(msg)}%0D%0A%0D%0ANamn: ${encodeURIComponent(name)}%0D%0AE-post: ${encodeURIComponent(email)}%0D%0AÖnskat datum: ${encodeURIComponent(date)}`;
                window.location.href = `mailto:${bookingEmail}?subject=${encodeURIComponent(subject)}&body=${body}`;
            });
        }

        function renderGallery(items) {
            const grid = qs('#gallery .media-grid');
            if (!grid) return;
            grid.innerHTML = '';
            // make carousel-like horizontal gallery
            items.forEach((it, idx) => {
                const fig = document.createElement('figure');
                fig.className = 'media-item';
                const img = document.createElement('img');
                img.className = 'media-thumb';
                img.src = `media/gallery/${it.file}`;
                img.alt = it.alt || it.caption || '';
                img.loading = 'lazy';
                img.dataset.index = idx;
                // open lightbox on click
                img.addEventListener('click', () => openLightbox(idx, items));
                fig.appendChild(img);
                // intentionally do not render captions in the carousel (user requested images only)
                grid.appendChild(fig);
            });

            // add simple left/right scroll controls (if not already present)
            const gallery = qs('#gallery');
            if (gallery && !qs('.gallery-controls', gallery)) {
                const controls = document.createElement('div');
                controls.className = 'gallery-controls';
                const left = document.createElement('button');
                left.className = 'carousel-btn';
                left.textContent = '◀';
                const right = document.createElement('button');
                right.className = 'carousel-btn';
                right.textContent = '▶';
                controls.appendChild(left);
                controls.appendChild(right);
                gallery.appendChild(controls);

                left.addEventListener('click', () => {
                    grid.scrollBy({ left: -grid.clientWidth * 0.8, behavior: 'smooth' });
                });
                right.addEventListener('click', () => {
                    grid.scrollBy({ left: grid.clientWidth * 0.8, behavior: 'smooth' });
                });
            }
            // Autoplay: scroll a step every second
            const autoplayDelay = 2500; // ms
            let _autoplayTimer = null;
            function stopAutoplay() {
                if (_autoplayTimer) { clearInterval(_autoplayTimer); _autoplayTimer = null; }
            }
            function startAutoplay() {
                stopAutoplay();
                const firstItem = grid.querySelector('.media-item');
                if (!firstItem) return;
                const gap = parseInt(getComputedStyle(grid).gap) || 12;
                const step = firstItem.offsetWidth + gap;
                _autoplayTimer = setInterval(() => {
                    // don't autoplay while lightbox open
                    const lbOpen = qs('.lightbox') && qs('.lightbox').classList.contains('open');
                    if (lbOpen) return;
                    // if at end, wrap to start
                    if (grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 5) {
                        grid.scrollTo({ left: 0, behavior: 'smooth' });
                    } else {
                        grid.scrollBy({ left: step, behavior: 'smooth' });
                    }
                }, autoplayDelay);
            }

            // Pause on hover/focus, resume on leave
            grid.addEventListener('mouseenter', stopAutoplay);
            grid.addEventListener('mouseleave', startAutoplay);
            grid.addEventListener('focusin', stopAutoplay);
            grid.addEventListener('focusout', startAutoplay);

            // start autoplay
            startAutoplay();
        }

        // Render featured tour (if a tour has "featured": true, use it; otherwise do not render the section)
        function renderFeatured() {
            const section = qs('#featured');
            const holder = section ? qs('#featured .featured-inner') : null;
            if (!section || !holder) return;
            holder.innerHTML = '';
            const all = Object.values(toursData || {});
            if (!all.length) {
                // No tours at all — remove featured section
                section.remove();
                return;
            }
            // Find only explicitly marked featured tour
            const featured = all.find(t => t.featured === true);
            if (!featured) {
                // If none marked featured, remove the section entirely
                section.remove();
                return;
            }

            const card = document.createElement('article');
            // Give featured card the same base styles/behavior as other tour cards
            card.className = 'featured-card tour-card';
            card.setAttribute('data-tour-id', featured.id);
            card.setAttribute('tabindex', '0');

            const img = document.createElement('img');
            img.className = 'featured-image';
            img.src = `media/${featured.image || (featured.id + '.jpg')}`;
            img.alt = featured.title || '';

            const content = document.createElement('div');
            content.className = 'featured-content';
            const h3 = document.createElement('h3');
            h3.textContent = featured.title || '';
            const p = document.createElement('p');
            p.textContent = featured.summary || featured.description || '';

            // Featured content: title + summary only (no separate "Läs mer" button)
            content.appendChild(h3);
            content.appendChild(p);

            card.appendChild(img);
            card.appendChild(content);

            // open modal on click / keyboard
            card.addEventListener('click', function (ev) { if (!ev.target.closest('a, button')) openModal(featured.id); });
            card.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openModal(featured.id); } });

            holder.appendChild(card);
        }

        // Lightbox implementation
        let _lightboxState = { open: false, items: [], index: 0 };
        function createLightboxIfNeeded() {
            if (qs('.lightbox')) return;
            const lb = document.createElement('div');
            lb.className = 'lightbox';
            lb.innerHTML = `
                <button class="lightbox-close" aria-label="Stäng">&times;</button>
                <div class="lightbox-content">
                    <button class="lightbox-nav lb-prev" aria-label="Föregående">◀</button>
                    <div class="lightbox-stage">
                        <img class="lightbox-img" src="" alt="">
                        <div class="lightbox-caption"></div>
                    </div>
                    <button class="lightbox-nav lb-next" aria-label="Nästa">▶</button>
                </div>
            `;
            document.body.appendChild(lb);

            qs('.lightbox-close', lb).addEventListener('click', closeLightbox);
            qs('.lb-prev', lb).addEventListener('click', () => showLightbox(_lightboxState.index - 1));
            qs('.lb-next', lb).addEventListener('click', () => showLightbox(_lightboxState.index + 1));
            lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
        }

        function openLightbox(index, items) {
            _lightboxState.open = true;
            _lightboxState.items = items;
            createLightboxIfNeeded();
            showLightbox(index);
            document.addEventListener('keydown', lightboxKey);
            document.body.style.overflow = 'hidden';
        }

        function closeLightbox() {
            const lb = qs('.lightbox');
            if (!lb) return;
            lb.classList.remove('open');
            _lightboxState.open = false;
            document.removeEventListener('keydown', lightboxKey);
            document.body.style.overflow = '';
        }

        function showLightbox(idx) {
            const items = _lightboxState.items || [];
            if (!items.length) return;
            if (idx < 0) idx = items.length - 1;
            if (idx >= items.length) idx = 0;
            _lightboxState.index = idx;
            const item = items[idx];
            const lb = qs('.lightbox');
            if (!lb) return;
            const img = qs('.lightbox-img', lb);
            const cap = qs('.lightbox-caption', lb);
            img.src = `media/gallery/${item.file}`;
            img.alt = item.alt || item.caption || '';
            cap.textContent = item.caption || '';
            lb.classList.add('open');
        }

        function lightboxKey(e) {
            if (!_lightboxState.open) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') showLightbox(_lightboxState.index - 1);
            if (e.key === 'ArrowRight') showLightbox(_lightboxState.index + 1);
        }

        (function loadGalleryIndex(){
            fetch('media/gallery/index.json', { cache: 'no-store' })
                .then(res => { if (!res.ok) throw new Error('Ingen index'); return res.json(); })
                .then(data => { if (Array.isArray(data) && data.length) renderGallery(data); })
                .catch(()=>{});
        })();
    });

})();