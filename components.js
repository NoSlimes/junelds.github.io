// components.js - reusable UI components for Junelds

(function () {
    // Hjälpfunktioner för att välja element
    function qs(selector, el = document) { return el.querySelector(selector); }
    function qsa(selector, el = document) { return Array.from(el.querySelectorAll(selector)); }

    const bookingEmail = 'anna.juneld@gmail.com';
    
    // Här lagrar vi turerna när de laddats från JSON-filen
    let toursData = {};
    // Här lagrar vi övriga tjänster
    let servicesData = {};

    // Hjälp: Lös ut en bild-URL från ett fält så att användaren kan ange
    // - en enkel filnamn (t.ex. "tomteritt.jpg") -> prefixes with `media/`
    // - en relative path starting with `media/` or `/` -> left as-is
    // - a full URL (https://...) or protocol-relative (//...) or data: -> left as-is
    function resolveImagePath(src) {
        if (!src) return '';
        // data: or absolute path
        if (src.startsWith('data:') || src.startsWith('/') || src.startsWith('media/') || src.startsWith('//')) return src;
        // protocol (http:, https:, etc.)
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(src)) return src;
        // otherwise treat as filename inside media/
        return `media/${src}`;
    }

    // Apply optional image transform/style fields from JSON to an <img> element.
    // Supported fields on the data object:
    // - imageStyle: raw CSS string appended to the element (e.g. 'filter:grayscale(1);')
    // - imageTransform: CSS transform string (e.g. 'scale(1.1) translateY(-10px)')
    // - imageTransformOrigin: CSS transform-origin (e.g. '50% 30%')
    // - imageObjectPosition: sets object-position (e.g. 'center 40%')
    // - imageFit: sets object-fit (e.g. 'cover'|'contain')
    // - imageScale, imageTranslateX/Y: convenience numeric/string values appended to transform
    function applyImageTransforms(img, data) {
        if (!img || !data) return;

        if (typeof data.imageStyle === 'string' && data.imageStyle.trim()) {
            // append raw style - be careful not to overwrite width/height classes
            img.style.cssText += ';' + data.imageStyle;
        }

        if (typeof data.imageObjectPosition === 'string') img.style.objectPosition = data.imageObjectPosition;
        if (typeof data.imageFit === 'string') img.style.objectFit = data.imageFit;
        if (typeof data.imageTransformOrigin === 'string') img.style.transformOrigin = data.imageTransformOrigin;
        if (typeof data.imageTransform === 'string') img.style.transform = data.imageTransform;
        // If the user supplied a simple translateY in pixels (common for focal shift),
        // some layouts clip transforms or they behave inconsistently. As a reliable
        // fallback, convert `translateY(<n>px)` into an `object-position` adjustment
        // after the image has loaded. This preserves the visual focal shift.
        (function handleTranslateYFallback() {
            try {
                const m = typeof data.imageTransform === 'string' && data.imageTransform.match(/^translateY\(([-\d.]+)px\)$/);
                if (!m) return;
                const px = parseFloat(m[1]);
                // on load compute relative shift and apply as object-position
                function applyFallback() {
                    try {
                        const h = img.clientHeight || img.naturalHeight || 1;
                        // percent shift relative to displayed height (positive px moves down, we invert)
                        const percent = -(px / h) * 100;
                        // center baseline (50%) shifted by percent
                        const y = 50 + percent;
                        img.style.objectPosition = `50% ${y}%`;
                        // Preserve any scale() present in the computed transform so imageScale isn't lost
                        try {
                            const current = img.style.transform || '';
                            const scaleMatch = current.match(/scale\(([^)]+)\)/);
                            const preservedScale = scaleMatch ? `scale(${scaleMatch[1]})` : '';
                            img.style.transform = preservedScale;
                        } catch (e) {
                            img.style.transform = '';
                        }
                    } catch (e) {}
                }
                if (img.complete && img.naturalHeight) applyFallback();
                else img.addEventListener('load', applyFallback, { once: true });
            } catch (e) {}
        })();

        // convenience numeric/string props that augment transform (appended)
        let extraTransforms = '';
        if (data.imageScale !== undefined) {
            extraTransforms += ` scale(${data.imageScale})`;
        }
        if (data.imageTranslateX !== undefined || data.imageTranslateY !== undefined) {
            const tx = data.imageTranslateX !== undefined ? data.imageTranslateX : 0;
            const ty = data.imageTranslateY !== undefined ? data.imageTranslateY : 0;
            extraTransforms += ` translate(${tx}px, ${ty}px)`;
        }
        if (extraTransforms) {
            img.style.transform = (img.style.transform || '') + extraTransforms;
        }

        // expose as data-attr for debugging/testing
        try {
            if (data.imageTransform) img.dataset.imageTransform = data.imageTransform;
            if (data.imageScale !== undefined) img.dataset.imageScale = String(data.imageScale);
            if (data.imageTranslateY !== undefined) img.dataset.imageTranslateY = String(data.imageTranslateY);
            // mark that we applied transforms
            img.dataset.imageApplied = '1';
            // attach human-readable id/title if available for debugging
            if (data.id) img.dataset.imageFor = data.id;
            else if (data.title) img.dataset.imageFor = data.title;
            // verbose debug log
            console.debug('applyImageTransforms', img.dataset.imageFor || '', {
                imageTransform: data.imageTransform,
                imageScale: data.imageScale,
                imageTranslateY: data.imageTranslateY,
                imageObjectPosition: data.imageObjectPosition,
                imageFit: data.imageFit
            });
        } catch (e) {}
    }

    // Funktion för att bygga HTML till modalen
    function buildTourDetailsHtml(data) {
        let detailsHtml = '';
        if (data.details && Array.isArray(data.details)) {
            detailsHtml = '<ul>' + data.details.map(item => `<li>${item}</li>`).join('') + '</ul>';
        }
        return `
            <div class="modal-section modal-desc">
                <h4>Beskrivning</h4>
                <p>${data.description || ''}</p>
            </div>
            <hr class="modal-sep" />
            <div class="modal-section modal-facts">
                <h4>Pris & fakta</h4>
                ${data.price ? `<p><strong>${data.price}</strong></p>` : ''}
                ${detailsHtml}
            </div>
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
                // Skip tours that are marked as featured or hidden
                if (!t) return;
                if (t.featured === true) return;
                if (t.hidden === true) return;

                const art = document.createElement('article');
                art.className = 'tour-card';
                art.setAttribute('data-tour-id', t.id);
                art.setAttribute('tabindex', '0');

                const img = document.createElement('img');
                img.className = 'tour-image';
                img.src = resolveImagePath(t.image || (t.id + '.jpg'));
                img.alt = t.title;
                // allow JSON to control image transforms/positioning
                applyImageTransforms(img, t);

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

        // --- Services: load and render services from data/services.json ---
        async function loadServices() {
            try {
                const res = await fetch('data/services.json');
                if (!res.ok) throw new Error('Kunde inte läsa services.json');
                const parsed = await res.json();
                // Expecting an array of service objects
                servicesData = {};
                if (Array.isArray(parsed)) {
                    parsed.forEach(item => {
                        if (!item || !item.id) return;
                        const summary = item.summary || (item.description ? (item.description.split('. ')[0] + '.') : '');
                        servicesData[item.id] = Object.assign({ summary }, item);
                    });
                }
            } catch (e) {
                console.error('Fel vid laddning av services.json:', e);
            }
        }

        function renderServices() {
            const holder = qs('#services-list');
            if (!holder) return;
            holder.innerHTML = '';
            const keys = Object.keys(servicesData || {});
            if (!keys.length) {
                holder.innerHTML = '<p>Inga tjänster hittades.</p>';
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'tours-grid';

            keys.forEach(id => {
                const s = servicesData[id];
                if (s && s.hidden === true) return;

                const art = document.createElement('article');
                art.className = 'tour-card service-card';
                art.setAttribute('data-service-id', s.id);
                art.setAttribute('tabindex', '0');

                // Image (match tour-card behavior)
                const img = document.createElement('img');
                img.className = 'tour-image';
                img.src = resolveImagePath(s.image || (s.id + '.jpg'));
                img.alt = s.title || '';
                // allow JSON to control image transforms/positioning
                applyImageTransforms(img, s);

                const icon = document.createElement('div');
                icon.className = 'tour-icon';
                icon.setAttribute('aria-hidden', 'true');
                icon.textContent = s.icon || '';

                const h3 = document.createElement('h3');
                h3.textContent = s.title || '';

                const p = document.createElement('p');
                p.textContent = s.summary || s.description || '';

                art.appendChild(img);
                art.appendChild(icon);
                art.appendChild(h3);
                art.appendChild(p);

                art.addEventListener('click', function (ev) { if (!ev.target.closest('a, button')) openServiceModal(s.id); });
                art.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openServiceModal(s.id); } });

                grid.appendChild(art);
            });

            holder.appendChild(grid);
        }

        function buildServiceDetailsHtml(data) {
            return `
                    <div class="modal-section modal-desc">
                        <h4>Beskrivning</h4>
                        <p>${data.description || ''}</p>
                    </div>
                    <hr class="modal-sep" />
                    <div class="modal-section modal-facts">
                        <h4>Pris</h4>
                        ${data.price ? '<p><strong>' + data.price + '</strong></p>' : '<p>Pris enligt offert</p>'}
                    </div>
                `;
        }

        function openServiceModal(key) {
            const modal = qs('#modal');
            const titleEl = qs('#modal-title');
            const bodyEl = qs('#modal-body');
            const data = servicesData[key];
            if (!data) {
                console.error(`Hittade ingen service för id: ${key}`);
                return;
            }

            titleEl.textContent = data.title || '';
            bodyEl.innerHTML = buildServiceDetailsHtml(data);

            const modalBook = qs('#modal-book');
            if (modalBook) {
                const newBtn = modalBook.cloneNode(true);
                modalBook.parentNode.replaceChild(newBtn, modalBook);
                newBtn.addEventListener('click', function (ev) {
                    ev.preventDefault();
                    closeModal();
                    fillContactForm(data.title || 'Tjänst');
                });
            }

            modal.setAttribute('aria-hidden', 'false');
            modal.classList.add('open');
            modal.__lastFocus = document.activeElement;
            const closeBtn = qs('.modal-close'); if (closeBtn) closeBtn.focus();
            document.body.style.overflow = 'hidden';
        }

        function createLi(text) { const li = document.createElement('li'); li.textContent = text; return li; }

        await loadTours();
        await loadServices();
        renderTours();
        renderServices();
        renderFeatured();
        // Mobile nav toggle
        (function initNavToggle(){
            const toggle = qs('.nav-toggle');
            const links = qs('.nav-links');
            if (!toggle || !links) return;
            toggle.addEventListener('click', function (){
                const isOpen = links.classList.toggle('open');
                toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });
            // Close menu when a link is clicked
            qsa('.nav-links a').forEach(a => a.addEventListener('click', () => {
                links.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }));
            // Close on Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    links.classList.remove('open');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });
        })();
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

            const featuredList = all.filter(t => t.featured === true && t.hidden !== true);

            if (!featuredList.length) {
                // If none marked featured, remove the section entirely
                section.remove();
                return;
            }

            // Render featured items as a grid of featured-card elements (image left, content right)
            const grid = document.createElement('div');
            grid.className = 'featured-grid';

            featuredList.forEach(feat => {
                const card = document.createElement('article');
                card.className = 'featured-card';
                card.setAttribute('data-tour-id', feat.id);
                card.setAttribute('tabindex', '0');

                const img = document.createElement('img');
                img.className = 'featured-image';
                img.src = resolveImagePath(feat.image || (feat.id + '.jpg'));
                img.alt = feat.title || '';
                // allow JSON to control image transforms/positioning
                applyImageTransforms(img, feat);

                const content = document.createElement('div');
                content.className = 'featured-content';
                const h3 = document.createElement('h3');
                h3.textContent = feat.title || '';
                const p = document.createElement('p');
                p.textContent = feat.summary || feat.description || '';

                const ul = document.createElement('ul');
                if (feat.length) ul.appendChild(createLi('Längd: ' + feat.length));
                if (feat.minAge) ul.appendChild(createLi('Ålder: ' + feat.minAge));

                content.appendChild(h3);
                content.appendChild(p);
                content.appendChild(ul);

                card.appendChild(img);
                card.appendChild(content);

                card.addEventListener('click', function (ev) { if (!ev.target.closest('a, button')) openModal(feat.id); });
                card.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openModal(feat.id); } });

                grid.appendChild(card);
            });

            holder.appendChild(grid);
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