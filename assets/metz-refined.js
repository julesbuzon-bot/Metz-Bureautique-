/** Metz Bureautique — interactions progressives, sans bibliothèque.
 * Aucun contenu éditorial ni href n'est réécrit. Les anciens scripts du thème
 * doivent être retirés à l'intégration (voir wordpress/enqueue.php).
 */
(() => {
  'use strict';
  if (window.metzRefinedInitialized) return;
  window.metzRefinedInitialized = true;
  const body = document.body;
  body.classList.add('mb-refined');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const onMotionChange = callback => reduced.addEventListener('change', callback);
  const animate = (element, frames, duration = 260) => {
    if (!reduced.matches && element.animate) element.animate(frames, { duration, easing: 'ease-out' });
  };
  // Liens historiques utilisés comme commandes : garder href + nom accessible.
  const buttonLink = (link, callback) => {
    if (!link) return;
    link.setAttribute('role', 'button');
    link.addEventListener('click', event => { event.preventDefault(); callback(event); });
    link.addEventListener('keydown', event => {
      if (event.key === ' ') { event.preventDefault(); link.click(); }
    });
  };

  function initHero() {
    const hero = $('.mb-hero');
    if (!hero) return;
    const slides = $$('.mb-hero__slide', hero);
    const dots = $$('.mb-hero__dot', hero);
    if (slides.length < 2) return;
    let index = 0;
    let timer;
    let userPaused = reduced.matches;
    let hovered = false;
    let focused = false;
    hero.classList.add('mb-slider-ready');
    hero.setAttribute('role', 'region');
    hero.setAttribute('aria-roledescription', 'carrousel');
    hero.setAttribute('aria-label', 'Metz Bureautique');
    const pause = document.createElement('button');
    pause.type = 'button';
    pause.className = 'mb-slider-pause';
    const arrows = $('.mb-hero__arrows', hero);
    arrows?.append(pause);
    const updatePause = () => {
      pause.setAttribute('aria-label', userPaused ? 'Reprendre le défilement' : 'Mettre le défilement en pause');
      pause.setAttribute('aria-pressed', String(userPaused));
      pause.innerHTML = userPaused
        ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2l9 6-9 6z"/></svg>'
        : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h3v12H4zm5 0h3v12H9z"/></svg>';
    };
    const schedule = () => {
      clearTimeout(timer);
      if (userPaused || hovered || focused || document.hidden || reduced.matches) return;
      timer = setTimeout(() => { show(index + 1); schedule(); }, 7000);
    };
    const show = next => {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, n) => {
        const active = n === index;
        slide.id ||= ['notre-agence', 'gamme-ricoh', 'gamme-kyocera', 'empreinte-carbone'][n] || `mb-slide-${n}`;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-roledescription', 'diapositive');
        slide.setAttribute('aria-label', `${n + 1} sur ${slides.length}`);
        slide.setAttribute('aria-hidden', String(!active));
        // Les liens invisibles sortent aussi de l'ordre de tabulation.
        slide.inert = !active;
      });
      dots.forEach((dot, n) => {
        const active = n === index;
        dot.classList.toggle('is-current', active);
        const link = $('a', dot);
        link?.setAttribute('aria-current', String(active));
        link?.setAttribute('aria-controls', slides[n].id);
      });
    };
    const manual = next => {
      userPaused = true;
      show(next);
      updatePause();
      schedule();
    };
    dots.forEach((dot, n) => buttonLink($('a', dot), () => manual(n)));
    buttonLink($('.mb-hero__arrow--prev a', hero), () => manual(index - 1));
    buttonLink($('.mb-hero__arrow--next a', hero), () => manual(index + 1));
    pause.addEventListener('click', () => { userPaused = !userPaused; updatePause(); schedule(); });
    hero.addEventListener('mouseenter', () => { hovered = true; schedule(); });
    hero.addEventListener('mouseleave', () => { hovered = false; schedule(); });
    hero.addEventListener('focusin', () => { focused = true; schedule(); });
    hero.addEventListener('focusout', () => {
      requestAnimationFrame(() => { focused = hero.contains(document.activeElement); schedule(); });
    });
    hero.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); manual(index + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); manual(index - 1); }
    });
    // Balayage tactile horizontal seulement ; le défilement vertical reste natif.
    let pointer = null;
    hero.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') pointer = {x: event.clientX, y: event.clientY};
    }, {passive: true});
    hero.addEventListener('pointerup', event => {
      if (!pointer) return;
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      pointer = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) manual(index + (dx < 0 ? 1 : -1));
    }, {passive: true});
    hero.addEventListener('pointercancel', () => { pointer = null; });
    document.addEventListener('visibilitychange', schedule);
    onMotionChange(() => { if (reduced.matches) userPaused = true; updatePause(); schedule(); });
    show(0);
    updatePause();
    schedule();
  }

  function initReveal() {
    const targets = $$('.reveal-on-scroll, .stagger-children > *');
    if (!('IntersectionObserver' in window) || reduced.matches) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.dataset.mbReveal = 'visible';
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: 0, rootMargin: '0px 0px -20px 0px'});
    targets.forEach(element => {
      // Ne pas masquer le LCP ni un contenu déjà consultable au chargement.
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      element.dataset.mbReveal = 'pending';
      observer.observe(element);
    });
    onMotionChange(() => {
      if (reduced.matches) {
        observer.disconnect();
        targets.forEach(element => { element.dataset.mbReveal = 'visible'; });
      }
    });
    // Recherche native, lien profond et focus doivent toujours montrer la cible.
    document.addEventListener('focusin', event => {
      event.target.closest('[data-mb-reveal]')?.setAttribute('data-mb-reveal', 'visible');
    });
    window.addEventListener('beforeprint', () => targets.forEach(element => { element.dataset.mbReveal = 'visible'; }));
  }

  function initCounters() {
    const counters = $$('.mb-count[data-target]');
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    const running = new Set();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const element = entry.target;
        observer.unobserve(element);
        const target = Number(element.dataset.target);
        if (!Number.isFinite(target) || target <= 0) return;
        const original = element.textContent;
        // Le nom accessible reste le nombre final, sans annonce à chaque frame.
        element.setAttribute('role', 'img');
        element.setAttribute('aria-label', original);
        element.style.display = 'inline-block';
        element.style.minWidth = `${element.getBoundingClientRect().width}px`;
        const start = performance.now();
        const finish = () => { element.textContent = original; running.delete(finish); };
        running.add(finish);
        const frame = now => {
          if (!running.has(finish)) return;
          if (reduced.matches) { finish(); return; }
          const progress = Math.min((now - start) / 1000, 1);
          element.textContent = Math.round(target * (1 - (1 - progress) ** 3)).toLocaleString('fr-FR');
          if (progress < 1) requestAnimationFrame(frame); else finish();
        };
        requestAnimationFrame(frame);
      });
    }, {threshold: .4});
    counters.forEach(element => observer.observe(element));
    onMotionChange(() => { if (reduced.matches) { observer.disconnect(); running.forEach(finish => finish()); } });
  }

  // Les galeries Ricoh conservent chaque image et son alt ; défilement manuel.
  function initProductGalleries() {
    $$('.model-card__slider').forEach(gallery => {
      const slides = $$('.model-card__slide', gallery);
      if (slides.length < 2) return;
      gallery.classList.add('mb-gallery-ready');
      gallery.setAttribute('role', 'group');
      gallery.setAttribute('aria-label', 'Visuels produit');
      const dots = document.createElement('div');
      dots.className = 'model-card__dots';
      const buttons = slides.map((slide, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', $('img', slide)?.alt || `Visuel ${index + 1}`);
        button.addEventListener('click', () => show(index));
        dots.append(button);
        return button;
      });
      const show = index => {
        slides.forEach((slide, n) => {
          slide.classList.toggle('is-active', n === index);
          slide.setAttribute('aria-hidden', String(n !== index));
          slide.inert = n !== index;
          buttons[n].classList.toggle('is-current', n === index);
          buttons[n].setAttribute('aria-pressed', String(n === index));
        });
      };
      gallery.append(dots);
      show(0);
    });
  }

  function initFaq() {
    $$('.faq__item').forEach(details => {
      details.addEventListener('toggle', () => {
        if (details.open) $$(':scope > :not(summary)', details).forEach(element => {
          animate(element, [{opacity: 0, transform: 'translateY(-4px)'}, {opacity: 1, transform: 'translateY(0)'}], 220);
        });
      });
    });
  }

  function initStandaloneNavigation() {
    if (!body.hasAttribute('data-mb-standalone')) return;
    const nav = $('nav.wp-block-navigation');
    if (!nav) return;
    const panel = $('.wp-block-navigation__responsive-container', nav);
    const opener = $('.wp-block-navigation__responsive-container-open', nav);
    const closer = $('.wp-block-navigation__responsive-container-close', nav);
    const dialog = $('.wp-block-navigation__responsive-dialog', panel);
    const mobile = matchMedia('(max-width: 781px)');
    if (!panel || !opener || !closer) return;
    let menuOpen = false;
    const otherRegions = $$('.wp-site-blocks > main, .wp-site-blocks > footer');
    const previousInert = new Map();
    opener.setAttribute('aria-controls', panel.id);
    opener.setAttribute('aria-expanded', 'false');
    const close = (restore = true) => {
      menuOpen = false;
      panel.classList.remove('is-menu-open', 'has-modal-open');
      panel.removeAttribute('role'); panel.removeAttribute('aria-modal');
      dialog?.removeAttribute('aria-modal'); dialog?.removeAttribute('role');
      opener.setAttribute('aria-expanded', 'false');
      body.style.overflow = '';
      otherRegions.forEach(element => { element.inert = previousInert.get(element) || false; });
      if (restore) opener.focus();
    };
    opener.addEventListener('click', () => {
      menuOpen = true;
      panel.classList.add('is-menu-open', 'has-modal-open');
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', 'Menu');
      opener.setAttribute('aria-expanded', 'true');
      body.style.overflow = 'hidden';
      otherRegions.forEach(element => { previousInert.set(element, element.inert); element.inert = true; });
      closer.focus();
    });
    closer.addEventListener('click', () => close());
    panel.addEventListener('keydown', event => {
      if (!menuOpen) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const items = $$('a[href],button:not([disabled]),[tabindex="0"]', panel).filter(element => element.getClientRects().length);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    mobile.addEventListener('change', () => { if (menuOpen) close(false); });
    $$('.has-child', nav).forEach(item => {
      const toggle = $(':scope > button', item);
      if (!toggle) return;
      toggle.setAttribute('aria-expanded', 'false');
      const setOpen = open => {
        item.classList.toggle('mb-submenu-open', open);
        item.classList.toggle('mb-submenu-closed', !open);
        toggle.setAttribute('aria-expanded', String(open));
      };
      toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
      item.addEventListener('mouseenter', () => { if (!mobile.matches) setOpen(true); });
      item.addEventListener('mouseleave', () => { if (!item.contains(document.activeElement)) setOpen(false); });
      item.addEventListener('focusin', event => { if (event.target !== toggle) setOpen(true); });
      item.addEventListener('focusout', () => requestAnimationFrame(() => { if (!item.contains(document.activeElement)) setOpen(false); }));
      item.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !menuOpen) { event.preventDefault(); setOpen(false); toggle.focus(); }
      });
    });
    document.addEventListener('pointerdown', event => {
      if (!nav.contains(event.target)) $$('.has-child', nav).forEach(item => {
        item.classList.remove('mb-submenu-open'); item.classList.add('mb-submenu-closed');
        $(':scope > button', item)?.setAttribute('aria-expanded', 'false');
      });
    });
    // Le lien courant est signalé visuellement et aux lecteurs d'écran.
    $$('a[href]', nav).forEach(link => {
      if (link.pathname === location.pathname && link.origin === location.origin) link.setAttribute('aria-current', 'page');
    });
  }

  function protectStandaloneForms() {
    if (!body.hasAttribute('data-mb-standalone')) return;
    $$('form').forEach(form => {
      // Capture avant tout code d'un plugin : aucun POST vers le site public.
      form.addEventListener('submit', event => {
        event.preventDefault(); event.stopImmediatePropagation();
        const notice = $('.mb-demo-form-notice, .mb-demo-notice');
        if (notice) {
          notice.setAttribute('tabindex', '-1'); notice.focus();
          animate(notice, [{opacity: .5}, {opacity: 1}]);
        }
      }, true);
    });
  }

  initHero();
  initReveal();
  initCounters();
  initFaq();
  initProductGalleries();
  initStandaloneNavigation();
  protectStandaloneForms();
})();
