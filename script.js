// ── Are.na API ──
const SLUG = 'things-on-my-desk';
const COUNT = 4;

// ── Elements ──
const tooltip = document.createElement('div');
tooltip.id = 'obj-tooltip';
document.body.appendChild(tooltip);

const hero        = document.getElementById('hero');
const objectsEl   = document.getElementById('objects');
const navWrap     = document.getElementById('nav-wrap');
const contentSec  = document.getElementById('content-section');
const titleEl = document.getElementById('title');
const bioEl       = document.getElementById('bio');

let cachedVh     = window.innerHeight;
let cachedDtH    = 0;
let cachedNavH   = 0;
let titleStartY  = 0;
let navStickyTop = 0;
let rafPending   = false;
let lastScrollY  = 0;
const TITLE_STICKY = 40;

// ── Hero layout ──

  // Measures actual viewport height
function getSvh() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;height:100svh;top:0;left:0;pointer-events:none;visibility:hidden';
  document.documentElement.appendChild(probe);
  const h = probe.offsetHeight || window.innerHeight;
  document.documentElement.removeChild(probe);
  return h;
}

  // Positions title, nav and objects
function initHeroLayout() {
  cachedVh  = getSvh();
  cachedDtH = titleEl.offsetHeight;
  cachedNavH = navWrap.offsetHeight;
  const vh  = cachedVh;
  const dtH = cachedDtH;
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const isMobile  = window.innerWidth <= 640;
  const navOffset = isMobile ? 18 : 30;

  titleStartY  = vh * 0.1 - TITLE_STICKY;
  navStickyTop = TITLE_STICKY + dtH + 10;

  titleEl.style.top       = TITLE_STICKY + 'px';
  titleEl.style.transform = `translateY(${titleStartY}px)`;

  navWrap.style.top       = navStickyTop + 'px';
  navWrap.style.marginTop = `${-(cachedNavH + navOffset)}px`;

  // Positions as grid vertically centred between title and bio if mobile
  if (isMobile) {
    const titleBottom   = vh * 0.1 + dtH;
    const bioBottomFrac = window.innerWidth <= 520 ? 0.21 : 0.18;
    const bioScrollEl   = document.getElementById('bio-scroll');
    const bioH          = bioScrollEl ? bioScrollEl.offsetHeight : 0;
    const availableBottom = bioBottomFrac * vh + bioH;
    const objectsH      = objectsEl.offsetHeight;
    const availableH    = vh - titleBottom - availableBottom;
    const objectsPadTop = titleBottom + Math.max(0, (availableH - objectsH) / 2);
    hero.style.paddingTop     = objectsPadTop + 'px';
    hero.style.paddingBottom  = '';
    hero.style.justifyContent = 'flex-start';
  } else {
    const gap = Math.min(8.5 * rem, vh * 0.2);
    hero.style.paddingTop     = (vh * 0.1 + dtH + gap) + 'px';
    hero.style.paddingBottom  = '';
    hero.style.justifyContent = '';
  }
}

// ── Are.na image loading ──
async function loadObjects() {
  try {
    const res  = await fetch(`https://api.are.na/v2/channels/${SLUG}/contents?per=50`);
    const data = await res.json();
    const images = (data.contents || [])
      .filter(b => b.class === 'Image' && b.image)
      .sort(() => Math.random() - 0.5)
      .slice(0, COUNT);

    const objectsEl = document.getElementById('objects');
    objectsEl.innerHTML = '';

    images.forEach((block, i) => {
      const url = block.image.large?.url || block.image.original?.url;
      if (!url) return;

      const wrap = document.createElement('div');
      wrap.className = 'obj-wrap';

      const img = document.createElement('img');
      img.className = 'obj';
      img.src = url;
      img.style.transitionDelay = `${i * 0.12}s`;
      img.onload = () => img.classList.add('visible');
      wrap.appendChild(img);

      if (block.description) {
        wrap.addEventListener('mousemove', e => {
          tooltip.textContent = block.description;
          tooltip.style.display = 'block';
          tooltip.style.left = (e.clientX + 14) + 'px';
          tooltip.style.top  = (e.clientY + 14) + 'px';
        });
        wrap.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      }

      objectsEl.appendChild(wrap);
    });
  } catch (e) { /* silently fail */ }

}

// ── Scroll ──
  // Fades out the objects and bio as you scroll down, omg this was annoying
function applyScroll(scrollY) {
  const vh = cachedVh;
  const t  = Math.min(1, Math.max(0, (scrollY - vh * 0.05) / (vh * 0.4)));

  objectsEl.style.opacity = 1 - t;

  const bioT = Math.min(1, Math.max(0, scrollY / (vh * 0.35)));
  bioEl.style.opacity = 1 - bioT;

  titleEl.style.transform = `translateY(${titleStartY * (1 - t)}px)`;
}

  // Debounce scroll event
function onScroll() {
  lastScrollY = window.scrollY;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      applyScroll(lastScrollY);
      rafPending = false;
    });
  }
}

  // Snap back to full opacity when closing a tab
function resetHero() {
  objectsEl.style.opacity     = '1';
  bioEl.style.opacity         = '1';
  titleEl.style.transform = `translateY(${titleStartY}px)`;
}

  // Resize only triggers when width changes, to deal with the changing vertical height on iOS Safari
window.addEventListener('scroll', onScroll, { passive: true });
let lastResizeW = window.innerWidth;
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  if (w !== lastResizeW) { lastResizeW = w; initHeroLayout(); }
  onScroll();
});

// ── Tabs ──
const tabs   = document.querySelectorAll('.tab-link');
const panels = document.querySelectorAll('.panel');

function showTab(hash) {
  const id = (hash || '').replace('#', '');

  tabs.forEach(t => t.classList.toggle('active', !!id && t.getAttribute('href') === `#${id}`));
  panels.forEach(p => {
    const match = !!id && p.id === `panel-${id}`;
    p.classList.remove('active', 'visible');
    if (match) {
      p.classList.add('active');
      requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('visible')));
    }
  });

  if (id) {
    contentSec.style.display = '';
  } else {
    contentSec.style.display = 'none';
    resetHero();
  }
}

function smoothScroll(target, duration = 750) {
  const start     = window.scrollY;
  const delta     = target - start;
  const startTime = performance.now();
  // Cubic ease-in-out curve
  const ease      = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  function step(now) {
    const p = Math.min((now - startTime) / duration, 1);
    window.scrollTo(0, start + delta * ease(p));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

tabs.forEach(tab => {
  tab.addEventListener('click', e => {
    e.preventDefault();
    const hash = tab.getAttribute('href');
    history.pushState(null, '', hash);
    showTab(hash);
    const headerH = titleEl.offsetHeight + 20 + navWrap.offsetHeight;
    const top = contentSec.getBoundingClientRect().top + window.scrollY - headerH;
    smoothScroll(top);
  });
});

titleEl.addEventListener('click', () => {
  history.pushState(null, '', window.location.pathname);
  smoothScroll(0);
  setTimeout(() => showTab(''), 750);
});

  // For back and forth animation
window.addEventListener('popstate', () => showTab(window.location.hash));

// ── Magnetic repel ──
  // Splits each character into individual <span> elements
function wrapChars(el) {
  const nodes = [...el.childNodes];
  el.innerHTML = '';
  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          el.appendChild(document.createTextNode(part));
        } else {
          // Preserves word groupings (so they don't split on different lines)
          const word = document.createElement('span');
          word.className = 'char-word';
          word.style.cssText = 'display:inline-block;white-space:nowrap;';
          [...part].forEach(char => {
            const s = document.createElement('span');
            s.textContent = char;
            s.style.cssText = 'display:inline-block;white-space:pre;transition:transform 0.6s ease-out;';
            word.appendChild(s);
          });
          el.appendChild(word);
        }
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const wrapper = node.cloneNode(false);
      [...node.childNodes].forEach(child => wrapper.appendChild(child.cloneNode(true)));
      wrapChars(wrapper);
      el.appendChild(wrapper);
    } else {
      el.appendChild(node.cloneNode(true));
    }
  });
}

  // Calculates distance from cursor to each character's centre -- i.e., characters within 60px get pushed away with a force relative to the distance (up to 8px)
function applyRepel(container, spans) {
  const maxDist = 60;
  const maxMove = 8;
  let rects = [];

  // Gets centre point of each character span
  container.addEventListener('mouseenter', () => {
    rects = spans.map(s => {
      const r = s.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    });
  });

  container.addEventListener('mousemove', e => {
    spans.forEach((span, i) => {
      const { cx, cy } = rects[i]; // centre coordinates
      const dx = e.clientX - cx; // x vector from character centre to cursor
      const dy = e.clientY - cy; // y vector from character centre to cursor
      const dist = Math.hypot(dx, dy);
      if (dist < maxDist && dist > 0) {
        const force = (1 - dist / maxDist) * maxMove; // magnitude
        span.style.transform = `translate(${-(dx / dist) * force}px, ${-(dy / dist) * force}px)`; // direction
      } else {
        span.style.transform = 'translate(0,0)'; // characters outside radius snap back
      }
    });
  });

  // Clears cache and sets back to 0,0
  container.addEventListener('mouseleave', () => {
    rects = [];
    spans.forEach(s => s.style.transform = 'translate(0,0)');
  });
}

function initMagneticRepel() {
  wrapChars(titleEl); // apply to title
  applyRepel(titleEl, [...titleEl.querySelectorAll('span:not(.char-word)')]);

  const navEl = document.querySelector('nav'); // apply to nav tabs
  tabs.forEach(tab => wrapChars(tab));
  applyRepel(navEl, [...navEl.querySelectorAll('span:not(.char-word)')]);

  document.querySelectorAll('.content-inner a').forEach(link => { // apply to every hyperlink
    wrapChars(link);
    applyRepel(link, [...link.querySelectorAll('span:not(.char-word)')]);
  });
}

// ── Lightbox ──
const lightbox = document.createElement('div');
lightbox.id = 'lightbox';
const lightboxImg = document.createElement('img');
lightbox.appendChild(lightboxImg);

const lightboxPrev = document.createElement('button');
lightboxPrev.className = 'lightbox-nav lightbox-prev';
lightboxPrev.setAttribute('aria-label', 'Previous');
lightboxPrev.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7,1 3,5 7,9"/></svg>';
lightbox.appendChild(lightboxPrev);

const lightboxNext = document.createElement('button');
lightboxNext.className = 'lightbox-nav lightbox-next';
lightboxNext.setAttribute('aria-label', 'Next');
lightboxNext.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,1 7,5 3,9"/></svg>';
lightbox.appendChild(lightboxNext);

document.body.appendChild(lightbox);

let lightboxSource = null;

  // Expanding from thumbnail animation
function srcTransform(srcEl) {
  const s = srcEl.getBoundingClientRect();
  const d = lightboxImg.getBoundingClientRect();
  const scale = s.width / d.width;
  const tx = s.left + s.width / 2 - (d.left + d.width / 2);
  const ty = s.top  + s.height / 2 - (d.top  + d.height / 2);
  return `translate(${tx}px, ${ty}px) scale(${scale})`;
}

  // Array for carousel and for grids
function lightboxGoCarousel(delta) {
  if (!lightboxSource) return;
  const c = lightboxSource.closest('.carousel');
  if (c && c._go) { c._go(c._index + delta); return; }
  const g = lightboxSource.closest('.image-grid');
  if (g) {
    const imgs = Array.from(g.querySelectorAll('img'));
    const next = imgs[(imgs.indexOf(lightboxSource) + delta + imgs.length) % imgs.length];
    lightboxSource = next;
    lightboxImg.src = next.src;
    lightboxImg.alt = next.alt;
  }
}

lightboxPrev.addEventListener('click', e => { e.stopPropagation(); lightboxGoCarousel(-1); });
lightboxNext.addEventListener('click', e => { e.stopPropagation(); lightboxGoCarousel(1); });

function openLightbox(img) {
  lightboxSource = img;
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightbox.classList.toggle('has-carousel', !!(img.closest('.carousel') || img.closest('.image-grid')));
  lightbox.classList.add('active');
  requestAnimationFrame(() => { // image starts as thumbnail
    lightboxImg.style.transition = 'none';
    lightboxImg.style.transform = srcTransform(img);
    requestAnimationFrame(() => { // animates to centre
      lightboxImg.style.transition = '';
      lightboxImg.style.transform = '';
    });
  });
}

  // Reverses animation on close
function closeLightbox() {
  if (!lightboxSource) return;
  lightboxImg.style.transform = srcTransform(lightboxSource);
  lightbox.classList.remove('active');
  lightbox.addEventListener('transitionend', e => {
    if (e.propertyName !== 'opacity') return;
    lightboxImg.style.transition = 'none';
    lightboxImg.style.transform = '';
    lightbox.classList.remove('has-carousel');
    lightboxSource = null;
    requestAnimationFrame(() => { lightboxImg.style.transition = ''; });
  }, { once: true });
}

// ── Carousels ──
document.querySelectorAll('.carousel').forEach(carousel => {
  const images  = JSON.parse(carousel.dataset.images);
  const img     = carousel.querySelector('.carousel-img');
  const counter = carousel.querySelector('.carousel-counter');
  carousel._index  = 0;
  carousel._images = images;
  counter.textContent = `1 / ${images.length}`;

  function go(n) {
    carousel._index = (n + images.length) % images.length;
    img.src = images[carousel._index];
    counter.textContent = `${carousel._index + 1} / ${images.length}`;
    if (lightboxSource === img) lightboxImg.src = images[carousel._index];
  }
  carousel._go = go;

  carousel.querySelector('.carousel-prev').addEventListener('click', () => go(carousel._index - 1));
  carousel.querySelector('.carousel-next').addEventListener('click', () => go(carousel._index + 1));

  let swipeStartX = 0;
  carousel.addEventListener('touchstart', e => { swipeStartX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - swipeStartX;
    if (Math.abs(dx) > 40) dx < 0 ? go(carousel._index + 1) : go(carousel._index - 1);
  });
});

document.querySelectorAll('img.entry-img').forEach(img => {
  img.addEventListener('click', () => openLightbox(img));
});

lightbox.addEventListener('click', e => {
  if (e.target !== lightboxImg) closeLightbox();
});

let lbTouchStartX = 0;
let lbTouchStartY = 0;
lightbox.addEventListener('touchstart', e => {
  lbTouchStartX = e.touches[0].clientX;
  lbTouchStartY = e.touches[0].clientY;
}, { passive: true });
lightbox.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - lbTouchStartX;
  const dy = e.changedTouches[0].clientY - lbTouchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
    dx < 0 ? lightboxGoCarousel(1) : lightboxGoCarousel(-1);
  } else if (dy > 80 && Math.abs(dx) < 40) {
    closeLightbox();
  }
});

document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowLeft')   lightboxGoCarousel(-1);
  if (e.key === 'ArrowRight')  lightboxGoCarousel(1);
});

// ── External links ──
document.querySelectorAll('a[href^="https://"]').forEach(a => {
  a.target = '_blank';
  a.rel = 'noopener';
});

// ── Init ──
initHeroLayout();
initMagneticRepel();
document.fonts.ready.then(() => requestAnimationFrame(initHeroLayout)); // re-measure after web fonts settle
showTab(window.location.hash || '#info');
loadObjects();
onScroll();
