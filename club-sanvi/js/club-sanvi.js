/* =============================================
   CLUB SANVI — JS
============================================= */

/* Reveal on scroll */
var revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

requestAnimationFrame(function () {
  requestAnimationFrame(function () {
    document.querySelectorAll('.club-reveal').forEach(function (el) {
      revealObserver.observe(el);
    });
  });
});

/* =============================================
   LIGHTBOX con navegación entre imágenes
============================================= */
var openLightbox = null;

(function () {
  var lightbox      = document.getElementById('lightbox');
  var lightboxImg   = document.getElementById('lightboxImg');
  var lightboxClose = document.getElementById('lightboxClose');

  if (!lightbox) return;

  var currentImages = [];
  var currentIndex  = 0;

  var lbPrev = document.createElement('button');
  lbPrev.className = 'lightbox-arr lightbox-prev';
  lbPrev.setAttribute('aria-label', 'Anterior');
  lbPrev.innerHTML = '&#8249;';
  lightbox.appendChild(lbPrev);

  var lbNext = document.createElement('button');
  lbNext.className = 'lightbox-arr lightbox-next';
  lbNext.setAttribute('aria-label', 'Siguiente');
  lbNext.innerHTML = '&#8250;';
  lightbox.appendChild(lbNext);

  function show(idx) {
    currentIndex = (idx + currentImages.length) % currentImages.length;
    lightboxImg.src = currentImages[currentIndex];
    var multi = currentImages.length > 1;
    lbPrev.style.display = multi ? '' : 'none';
    lbNext.style.display = multi ? '' : 'none';
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lightboxImg.src = '';
    currentImages = [];
  }

  openLightbox = function (images, startIdx) {
    currentImages = images.slice();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    show(startIdx || 0);
  };

  lbPrev.addEventListener('click', function (e) { e.stopPropagation(); show(currentIndex - 1); });
  lbNext.addEventListener('click', function (e) { e.stopPropagation(); show(currentIndex + 1); });
  lightboxClose.addEventListener('click', close);
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) close(); });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  show(currentIndex - 1);
    if (e.key === 'ArrowRight') show(currentIndex + 1);
  });
})();

/* =============================================
   SUB-NAVBAR — scroll spy + smooth scroll
============================================= */
(function () {
  var links    = document.querySelectorAll('.club-subnav-link');
  var sections = [];

  links.forEach(function (link) {
    var id = link.getAttribute('data-section');
    var el = document.getElementById(id);
    if (el) sections.push({ el: el, link: link });

    link.addEventListener('click', function (e) {
      e.preventDefault();
      var target = document.getElementById(id);
      if (!target) return;
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.pageYOffset - 178,
        behavior: 'smooth'
      });
    });
  });

  function updateActive() {
    var scrollY = window.pageYOffset;
    var active  = null;
    sections.forEach(function (s) {
      if (scrollY >= s.el.offsetTop - 200) active = s;
    });
    links.forEach(function (l) { l.classList.remove('active'); });
    if (active) active.link.classList.add('active');
  }

  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
})();

/* =============================================
   GALERÍA MASONRY — filtros + lightbox
============================================= */
(function () {
  var filters  = document.querySelectorAll('.cg-filter');
  var masonry  = document.getElementById('cgMasonry');
  if (!masonry) return;

  var items    = masonry.querySelectorAll('.cg-item');
  var currentFilter = 'all';

  /* Filtro por disciplina */
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentFilter = this.getAttribute('data-filter');

      filters.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');

      /* Fade out → reordenar → fade in */
      masonry.classList.add('cg-fading');
      setTimeout(function () {
        items.forEach(function (item) {
          var disc = item.getAttribute('data-disc');
          var show = currentFilter === 'all' || disc === currentFilter;
          item.style.display = show ? '' : 'none';
        });
        masonry.classList.remove('cg-fading');
      }, 260);
    });
  });

  /* Lightbox — abre con todas las fotos visibles y navega entre ellas */
  items.forEach(function (item) {
    item.addEventListener('click', function () {
      var visible = Array.from(items).filter(function (i) {
        return i.style.display !== 'none';
      });
      var images = visible.map(function (i) {
        return i.querySelector('img').src;
      });
      var idx = visible.indexOf(this);
      if (openLightbox) openLightbox(images, idx);
    });
  });
})();
