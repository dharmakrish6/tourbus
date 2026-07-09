// Lightweight scroll-reveal + animated counters + sticky-nav shrink, shared across pages.
(function () {
  function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal, .reveal-stagger');
    if (revealEls.length && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(el => observer.observe(el));
    } else {
      revealEls.forEach(el => el.classList.add('in-view'));
    }
  }

  function animateCount(el) {
    const target = parseInt(el.getAttribute('data-count-to') || el.textContent, 10);
    if (!target || isNaN(target)) return;
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-IN');
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCounters() {
    const counters = document.querySelectorAll('[data-count-to]');
    if (!counters.length) return;
    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCount);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(el => observer.observe(el));
  }

  function initNavShrink() {
    const nav = document.querySelector('.site-nav');
    if (!nav) return;
    const onScroll = () => {
      nav.classList.toggle('solid', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function initNavToggle() {
    const nav = document.querySelector('.site-nav');
    const toggle = document.querySelector('.nav-toggle');
    if (!nav || !toggle) return;
    toggle.addEventListener('click', () => {
      nav.classList.toggle('menu-open');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initCounters();
    initNavShrink();
    initNavToggle();
  });
})();
