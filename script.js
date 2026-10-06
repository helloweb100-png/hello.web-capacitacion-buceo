/* ==========================================================================
   BUCEO INDUSTRIAL Y SOLDADURA SUBMARINA - Landing page
   Dependencias opcionales (CDN): GSAP + ScrollTrigger + Lenis.
   Si alguna falla, la página sigue siendo completa y usable (sin esas animaciones).

   Índice
     00 Configuración        07 Hero (parallax del puntero y scroll)
     01 Utilidades           08 Reveals / manifiesto / contadores
     02 WhatsApp             09 Método (scroll horizontal anclado)
     03 Navegación y menú    10 Interacciones (tiras, FAQ, foco, magnético)
     04 Scroll suave         11 Formulario
     05 Loader               12 Arranque
     06 Océano (canvas)
   ========================================================================== */

/* --------------------------------------------------------------------------
   00 CONFIGURACIÓN  (lo único que hay que editar para publicar)
   -------------------------------------------------------------------------- */
const CONFIG = {
    // TODO: número de WhatsApp con código de país, solo dígitos, sin "+" ni espacios.
    // Ejemplo para México: '5217641234567'
    whatsapp: '52XXXXXXXXXX',
    defaultMessage: 'Hola, quiero información sobre los cursos de buceo industrial y soldadura submarina.'
};

(() => {
    'use strict';

    /* ----------------------------------------------------------------------
       01 UTILIDADES
       ---------------------------------------------------------------------- */
    const $ = (selector, ctx = document) => ctx.querySelector(selector);
    const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const rand = (min, max) => min + Math.random() * (max - min);

    const root = document.documentElement;
    const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const desktopMQ = window.matchMedia('(min-width: 900px)');

    const reduce = () => reduceMQ.matches;
    const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
    const waReady = /^\d{10,15}$/.test(CONFIG.whatsapp);

    let lenis = null;

    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
    else root.classList.add('no-gsap');

    /* ----------------------------------------------------------------------
       02 WHATSAPP  (todos los CTA salen de aquí: data-wa="mensaje")
       ---------------------------------------------------------------------- */
    const waUrl = (message) =>
        `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message || CONFIG.defaultMessage)}`;

    function initWhatsApp() {
        if (!waReady) {
            console.warn('[Landing] Falta configurar CONFIG.whatsapp en script.js. Los botones llevarán al formulario.');
            return;
        }
        $$('[data-wa]').forEach((link) => {
            link.href = waUrl(link.dataset.wa);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        });
    }

    /* ----------------------------------------------------------------------
       03 NAVEGACIÓN Y MENÚ
       ---------------------------------------------------------------------- */
    function initNav() {
        const nav = $('#nav');
        if (!nav) return;

        // Centinela en el tope de la página: cuando sale de vista, el nav se vuelve "cristal"
        const sentinel = document.createElement('div');
        sentinel.setAttribute('aria-hidden', 'true');
        sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:72px;pointer-events:none';
        document.body.prepend(sentinel);

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => {
                nav.classList.toggle('is-stuck', !entry.isIntersecting);
            }).observe(sentinel);
        } else {
            nav.classList.add('is-stuck');
        }
    }

    function initMenu() {
        const burger = $('#burger');
        const menu = $('#menu');
        if (!burger || !menu) return;

        menu.inert = true;

        const setOpen = (open) => {
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            menu.classList.toggle('is-open', open);
            menu.setAttribute('aria-hidden', String(!open));
            menu.inert = !open;
            if (lenis) open ? lenis.stop() : lenis.start();
            root.style.overflow = open ? 'hidden' : '';
            if (open) $('a', menu).focus({ preventScroll: true });
        };

        burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
        menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); burger.focus(); }
        });
        desktopMQ.addEventListener('change', (e) => { if (e.matches) setOpen(false); });
    }

    /* ----------------------------------------------------------------------
       04 SCROLL SUAVE (Lenis) + anclas
       ---------------------------------------------------------------------- */
    function startLenis() {
        if (reduce() || !window.Lenis) return;

        lenis = new Lenis({
            duration: 1.15,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true
        });

        if (hasGSAP) {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
    }

    function initAnchors() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link || link.target === '_blank') return;

            const id = link.getAttribute('href');
            if (id.length < 2) return;
            const target = $(id);
            if (!target) return;

            e.preventDefault();
            const offset = -(parseFloat(getComputedStyle(target).scrollMarginTop) || 0);

            if (lenis) lenis.scrollTo(target, { offset, duration: 1.5 });
            else target.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });

            history.replaceState(null, '', id);
        });
    }

    /* ----------------------------------------------------------------------
       05 LOADER: ojo de buey con progreso, termina abriéndose como un iris
       ---------------------------------------------------------------------- */
    function initLoader() {
        const loader = $('#loader');
        if (!loader) { root.classList.add('is-ready'); root.classList.remove('is-loading'); startLenis(); return; }

        const arc = $('#loaderArc');
        const pct = $('#loaderPct');
        const status = $('#loaderStatus');
        const phases = [[0, 'Revisando equipo'], [28, 'Presurizando'], [58, 'Descendiendo'], [88, 'Listo para la inmersión']];
        const state = { p: 0 };
        let finished = false;

        const render = () => {
            const value = Math.round(state.p);
            arc.style.strokeDashoffset = String(100 - state.p);
            pct.textContent = value;
            phases.forEach(([from, text]) => { if (value >= from && status.textContent !== text) status.textContent = text; });
        };

        const complete = () => {
            if (finished) return;
            finished = true;
            root.classList.add('is-ready');
            loader.hidden = true;
            root.classList.remove('is-loading');
            startLenis();
            if (hasGSAP) ScrollTrigger.refresh();
        };

        // Seguro: pase lo que pase, el loader no puede bloquear el sitio
        window.setTimeout(complete, 9000);

        // Ruta simple: sin GSAP o con movimiento reducido
        if (!hasGSAP || reduce()) {
            const go = () => {
                state.p = 100; render();
                root.classList.add('is-ready');
                loader.style.transition = 'opacity .5s ease';
                loader.style.opacity = '0';
                window.setTimeout(complete, 520);
            };
            if (document.readyState === 'complete') go();
            else window.addEventListener('load', go, { once: true });
            return;
        }

        const tl = gsap.timeline();
        tl.to(state, { p: 90, duration: 2.4, ease: 'power2.inOut', onUpdate: render })
            // espera a que cargue de verdad la página antes de cerrar
            .add(() => {
                tl.pause();
                const resume = () => tl.resume();
                if (document.readyState === 'complete') resume();
                else window.addEventListener('load', resume, { once: true });
            })
            .to(state, { p: 100, duration: .6, ease: 'power2.out', onUpdate: render })
            .to('.loader__core', { scale: 1.16, opacity: 0, duration: .65, ease: 'power3.in' }, '+=.2')
            .add(() => root.classList.add('is-ready'), '<+=.2')           // el hero entra bajo el iris
            .to(loader, { '--hole': '150%', duration: 1.35, ease: 'power3.inOut' }, '<')
            .add(complete);
    }

    /* ----------------------------------------------------------------------
       06 OCÉANO: burbujas y nieve marina en canvas (parallax con el scroll)
       ---------------------------------------------------------------------- */
    function initOcean() {
        const canvas = $('#ocean');
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');

        let W = 0, H = 0, dpr = 1;
        let bubbles = [], snow = [];
        let last = performance.now();
        let lastScroll = window.scrollY;
        let pointer = { x: -999, y: -999 };
        let running = false;

        const makeBubble = (initial) => {
            const big = Math.random() < 0.1;
            const r = big ? rand(9, 15) : rand(1.6, 8);
            return {
                x: rand(0, W),
                y: initial ? rand(0, H) : H + r + rand(0, H * 0.5),
                r,
                v: rand(26, 62) * (0.55 + r / 16),         // px/s
                amp: rand(5, 20), freq: rand(0.5, 1.5), phase: rand(0, Math.PI * 2),
                par: 0.12 + r / 42,                         // parallax con el scroll
                a: rand(0.45, 1)
            };
        };
        const makeSnow = () => ({
            x: rand(0, W), y: rand(0, H), r: rand(0.5, 1.7), v: rand(4, 16),
            par: rand(0.03, 0.2), a: rand(0.12, 0.45), f: rand(0.2, 0.8), p: rand(0, Math.PI * 2)
        });

        const seed = () => {
            const nb = clamp(Math.round((W * H) / 44000), 14, 44);
            const ns = clamp(Math.round((W * H) / 17000), 36, 120);
            bubbles = Array.from({ length: nb }, () => makeBubble(true));
            snow = Array.from({ length: ns }, makeSnow);
        };

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = window.innerWidth; H = window.innerHeight;
            canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
            if (reduce()) draw(0, 0);
        };

        const draw = (dt, now) => {
            const scroll = window.scrollY;
            const ds = scroll - lastScroll;
            lastScroll = scroll;
            ctx.clearRect(0, 0, W, H);

            for (const s of snow) {
                s.y -= s.v * dt + ds * s.par;
                s.x += Math.sin(now / 1000 * s.f + s.p) * 0.12;
                if (s.y < -4) s.y = H + 4; else if (s.y > H + 4) s.y = -4;
                if (s.x < -4) s.x = W + 4; else if (s.x > W + 4) s.x = -4;
                ctx.globalAlpha = s.a;
                ctx.fillStyle = '#bfe9f1';
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
            }

            for (const b of bubbles) {
                b.y -= b.v * dt + ds * b.par;
                const sway = Math.sin(now / 1000 * b.freq + b.phase) * b.amp * dt;
                b.x += sway;

                // el puntero empuja las burbujas
                const dx = b.x - pointer.x, dy = b.y - pointer.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < 9600 && d2 > 1) {
                    const d = Math.sqrt(d2), push = (1 - d / 98) * 110 * dt;
                    b.x += (dx / d) * push; b.y += (dy / d) * push;
                }

                if (b.y < -b.r * 2) Object.assign(b, makeBubble(false), { x: rand(0, W) });
                else if (b.y > H + b.r * 2 + 40) { b.y = -b.r; }
                if (b.x < -20) b.x = W + 20; else if (b.x > W + 20) b.x = -20;

                ctx.globalAlpha = b.a;
                ctx.fillStyle = 'rgba(143,224,234,.07)';
                ctx.strokeStyle = 'rgba(180,238,246,.6)';
                ctx.lineWidth = b.r > 8 ? 1.4 : 1;
                ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832); ctx.fill(); ctx.stroke();
                if (b.r > 3) {   // brillo
                    ctx.fillStyle = 'rgba(255,255,255,.75)';
                    ctx.beginPath(); ctx.arc(b.x - b.r * 0.36, b.y - b.r * 0.4, b.r * 0.2, 0, 6.2832); ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
        };

        const frame = (now) => {
            if (!running) return;
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            draw(dt, now);
            requestAnimationFrame(frame);
        };

        const start = () => { if (running || reduce()) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
        const stop = () => { running = false; };

        window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
        window.addEventListener('pointerleave', () => { pointer.x = pointer.y = -999; });
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

        let resizeTimer;
        window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });

        resize();
        start();
    }

    /* ----------------------------------------------------------------------
       06b MEDIDOR DE PROFUNDIDAD + BARRA DE PROGRESO (ScrollTrigger)
       ---------------------------------------------------------------------- */
    function initDepth() {
        if (!hasGSAP) return;

        const bar = $('#progress');
        const marker = $('#gaugeMarker');
        const depth = $('#gaugeDepth');
        const label = $('#gaugeLabel');
        const rail = marker ? marker.parentElement : null;
        const MAX_DEPTH = 40;   // metros que "baja" el medidor al llegar al final (efecto visual)

        ScrollTrigger.create({
            start: 0,
            end: 'max',
            onUpdate: (self) => {
                const p = self.progress;
                if (bar) bar.style.transform = `scaleX(${p})`;
                if (marker && rail) marker.style.transform = `translateY(${p * (rail.clientHeight - 2)}px)`;
                if (depth) depth.textContent = Math.round(p * MAX_DEPTH);
            }
        });

        $$('[data-depth-label]').forEach((section) => {
            ScrollTrigger.create({
                trigger: section,
                start: 'top 55%',
                end: 'bottom 55%',
                onToggle: (self) => { if (self.isActive && label) label.textContent = section.dataset.depthLabel; }
            });
        });
    }

    /* ----------------------------------------------------------------------
       07 HERO: parallax con el puntero y salida con el scroll
       ---------------------------------------------------------------------- */
    function initHero() {
        const hero = $('.hero');
        const porthole = $('#porthole');
        if (!hero || !porthole) return;

        // Parallax por capas con el puntero (interpolado en rAF, solo variables CSS)
        if (finePointer.matches && !reduce()) {
            let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;

            const step = () => {
                cx += (tx - cx) * 0.08;
                cy += (ty - cy) * 0.08;
                porthole.style.setProperty('--px', cx.toFixed(3));
                porthole.style.setProperty('--py', cy.toFixed(3));
                raf = (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) ? requestAnimationFrame(step) : 0;
            };
            const kick = () => { if (!raf) raf = requestAnimationFrame(step); };

            hero.addEventListener('pointermove', (e) => {
                const r = hero.getBoundingClientRect();
                tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
                ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
                kick();
            });
            hero.addEventListener('pointerleave', () => { tx = ty = 0; kick(); });
        }

        // Al bajar, el hero se aleja y el texto se desvanece (jerarquía: sale lo que ya se leyó)
        if (hasGSAP && !reduce()) {
            const scrub = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
            gsap.to(porthole, { yPercent: -10, scale: 0.9, ease: 'none', scrollTrigger: scrub });
            gsap.to('.hero__copy', { yPercent: -7, opacity: 0.15, ease: 'none', scrollTrigger: { ...scrub, end: '85% top' } });
            gsap.to('.hero__rays', { opacity: 0, ease: 'none', scrollTrigger: scrub });
        }
    }

    /* ----------------------------------------------------------------------
       08 REVEALS, MANIFIESTO, CONTADORES
       ---------------------------------------------------------------------- */
    function initReveals() {
        // Grupos con escalonado: cada hijo recibe su índice
        $$('[data-stagger]').forEach((group) => {
            Array.from(group.children).forEach((child, i) => {
                child.setAttribute('data-reveal', '');
                child.style.setProperty('--i', i);
            });
        });

        const items = $$('[data-reveal]');
        if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }

        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                io.unobserve(el);
                el.classList.add('is-in');
                // Al terminar, se retira el estado de reveal para no interferir con hovers y transiciones propias
                const delay = 1500 + (parseFloat(el.style.getPropertyValue('--i')) || 0) * 90;
                window.setTimeout(() => { el.removeAttribute('data-reveal'); el.classList.remove('is-in'); }, delay);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

        items.forEach((el) => io.observe(el));
    }

    function initManifest() {
        const heading = $('[data-words]');
        if (!heading) return;

        const words = heading.textContent.trim().split(/\s+/);
        heading.textContent = '';
        words.forEach((word, i) => {
            const span = document.createElement('span');
            span.className = 'w';
            span.textContent = word;
            heading.appendChild(span);
            if (i < words.length - 1) heading.appendChild(document.createTextNode(' '));
        });

        if (!hasGSAP || reduce()) { $$('.w', heading).forEach((w) => { w.style.opacity = 1; }); return; }

        // Las palabras se iluminan a medida que bajas: el texto se lee al ritmo del scroll
        gsap.fromTo($$('.w', heading), { opacity: 0.16 }, {
            opacity: 1, ease: 'none', stagger: 0.12,
            scrollTrigger: { trigger: heading, start: 'top 82%', end: 'bottom 45%', scrub: 0.5 }
        });
    }

    function initCounters() {
        if (reduce() || !('IntersectionObserver' in window)) return;

        $$('[data-count]').forEach((el) => {
            const target = Number(el.dataset.count);
            el.textContent = '0';

            const io = new IntersectionObserver(([entry]) => {
                if (!entry.isIntersecting) return;
                io.disconnect();
                const t0 = performance.now(), duration = 1400;
                const tick = (now) => {
                    const p = clamp((now - t0) / duration, 0, 1);
                    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
                    if (p < 1) requestAnimationFrame(tick);
                };
                requestAnimationFrame(tick);
            }, { threshold: 0.6 });
            io.observe(el);
        });
    }

    function initParallax() {
        if (!hasGSAP || reduce()) return;
        $$('[data-parallax]').forEach((media) => {
            const img = $('img', media);
            if (!img) return;
            gsap.fromTo(img, { yPercent: -6 }, {
                yPercent: 6, ease: 'none',
                scrollTrigger: { trigger: media.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
            });
        });
    }

    /* ----------------------------------------------------------------------
       09 MÉTODO: en escritorio la sección se ancla y el scroll vertical mueve la pista
       ---------------------------------------------------------------------- */
    function initMethod() {
        const section = $('.method');
        const track = $('#methodTrack');
        const bar = $('#methodBar');
        if (!hasGSAP || !section || !track) return;

        gsap.matchMedia().add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
            const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

            gsap.to(track, {
                x: () => -distance(),
                ease: 'none',
                scrollTrigger: {
                    trigger: section,
                    start: 'top top',
                    end: () => `+=${distance()}`,
                    pin: true,
                    scrub: 0.8,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    onUpdate: (self) => { if (bar) bar.style.transform = `scaleX(${self.progress})`; }
                }
            });
        });
    }

    /* ----------------------------------------------------------------------
       10 INTERACCIONES
       ---------------------------------------------------------------------- */
    // Tiras "¿Desde dónde empiezas?": hover/foco en escritorio, acordeón en móvil
    function initStrips() {
        const strips = $$('.strip');
        if (!strips.length) return;

        const activate = (active) => strips.forEach((strip) => {
            const on = strip === active;
            strip.classList.toggle('is-active', on);
            $('.strip__btn', strip).setAttribute('aria-expanded', String(on));
        });

        strips.forEach((strip) => {
            const button = $('.strip__btn', strip);
            button.addEventListener('click', () => {
                if (desktopMQ.matches) activate(strip);
                else activate(strip.classList.contains('is-active') ? null : strip);
            });
            button.addEventListener('focus', () => { if (desktopMQ.matches) activate(strip); });
            strip.addEventListener('pointerenter', () => { if (desktopMQ.matches && finePointer.matches) activate(strip); });
        });
    }

    // FAQ: una respuesta abierta a la vez
    function initFaq() {
        const items = $$('.qa');
        items.forEach((item) => {
            const button = $('.qa__q', item);
            button.addEventListener('click', () => {
                const willOpen = !item.classList.contains('is-open');
                items.forEach((other) => {
                    const open = other === item && willOpen;
                    other.classList.toggle('is-open', open);
                    $('.qa__q', other).setAttribute('aria-expanded', String(open));
                });
            });
        });
    }

    // Foco de luz que sigue al cursor en las tarjetas
    function initSpotlight() {
        if (!finePointer.matches) return;
        $$('[data-spot]').forEach((card) => {
            card.addEventListener('pointermove', (e) => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - r.left}px`);
                card.style.setProperty('--my', `${e.clientY - r.top}px`);
            });
        });
    }

    // Botones magnéticos (feedback: el botón "busca" al cursor)
    function initMagnetic() {
        if (!hasGSAP || !finePointer.matches || reduce()) return;
        $$('[data-magnetic]').forEach((button) => {
            const xTo = gsap.quickTo(button, 'x', { duration: 0.5, ease: 'power3.out' });
            const yTo = gsap.quickTo(button, 'y', { duration: 0.5, ease: 'power3.out' });
            button.addEventListener('pointermove', (e) => {
                const r = button.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
                yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
            });
            button.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
    }

    // Burbuja de ayuda del botón flotante: aparece una sola vez
    function initFab() {
        const fab = $('#fab');
        if (!fab || reduce()) return;
        window.setTimeout(() => {
            fab.classList.add('show-tip');
            window.setTimeout(() => fab.classList.remove('show-tip'), 4200);
        }, 9000);
    }

    /* ----------------------------------------------------------------------
       11 FORMULARIO -> WHATSAPP
       ---------------------------------------------------------------------- */
    function initForm() {
        const form = $('#contactForm');
        if (!form) return;

        const nameInput = $('#f-name');
        const nameField = nameInput.closest('.field');
        const nameError = $('#f-name-err');
        const status = $('#formStatus');
        const label = $('#formSubmitLabel');
        const idleLabel = label.textContent;
        const idleNote = status.textContent;

        const setError = (message) => {
            nameField.classList.toggle('is-invalid', Boolean(message));
            nameInput.setAttribute('aria-invalid', String(Boolean(message)));
            nameError.textContent = message || '';
        };

        nameInput.addEventListener('input', () => { if (nameInput.value.trim().length >= 2) setError(''); });

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = nameInput.value.trim();
            if (name.length < 2) {
                setError('Escribe tu nombre para que sepamos cómo llamarte.');
                nameInput.focus();
                return;
            }
            setError('');

            if (!waReady) {
                status.textContent = 'El número de WhatsApp del negocio aún no está configurado.';
                status.className = 'form__note is-warn';
                return;
            }

            const program = $('#f-program').value;
            const experience = $('#f-exp').value;
            const message = $('#f-msg').value.trim();
            const lines = [
                `Hola, soy *${name}*.`,
                `Me interesa: *${program}*.`,
                `Mi experiencia: *${experience}*.`
            ];
            if (message) lines.push('', message);

            // Estado de envío (feedback de la acción)
            form.classList.add('is-sending');
            label.textContent = 'Abriendo WhatsApp...';

            window.setTimeout(() => {
                const url = waUrl(lines.join('\n'));
                const win = window.open(url, '_blank');
                if (win) win.opener = null;
                else window.location.href = url;

                form.classList.remove('is-sending');
                label.textContent = idleLabel;
                status.textContent = 'Listo. Se abrió WhatsApp con tu mensaje. Solo falta que lo envíes.';
                status.className = 'form__note is-ok';
                window.setTimeout(() => { status.textContent = idleNote; status.className = 'form__note'; }, 9000);
            }, 700);
        });
    }

    /* ----------------------------------------------------------------------
       12 ARRANQUE
       ---------------------------------------------------------------------- */
    function init() {
        const year = $('#year');
        if (year) year.textContent = new Date().getFullYear();

        initWhatsApp();
        initNav();
        initMenu();
        initAnchors();

        initManifest();      // antes de crear ScrollTriggers (divide el texto en palabras)
        initReveals();
        initCounters();
        initHero();
        initParallax();
        initMethod();
        initDepth();

        initStrips();
        initFaq();
        initSpotlight();
        initMagnetic();
        initFab();
        initForm();
        initOcean();

        initLoader();

        // Cuando todo cargó: precarga las imágenes diferidas (evita huecos en el scroll horizontal) y recalcula
        window.addEventListener('load', () => {
            $$('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
            if (hasGSAP) ScrollTrigger.refresh();
        });
        if (document.fonts && document.fonts.ready && hasGSAP) document.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
