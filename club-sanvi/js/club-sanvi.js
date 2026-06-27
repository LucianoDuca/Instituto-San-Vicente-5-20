/* =============================================
   CLUB SANVI — JS
============================================= */

/* Reveal on scroll */
var revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      var delay = entry.target.getAttribute('data-delay');
      if (delay) entry.target.style.transitionDelay = delay + 'ms';
      entry.target.classList.add('active');
      revealObserver.unobserve(entry.target);
      entry.target.addEventListener('transitionend', function () {
        entry.target.style.willChange = 'auto';
      }, { once: true });
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
   Tops cacheados para evitar forced reflow en scroll.
   rAF throttle: updateActive corre max 1x por frame.
============================================= */
(function () {
  var links    = document.querySelectorAll('.club-subnav-link');
  var sections = [];
  var tops     = [];
  var rafPending = false;

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

  function cacheTops() {
    tops = sections.map(function (s) {
      return s.el.getBoundingClientRect().top + window.pageYOffset;
    });
  }

  function updateActive() {
    var scrollY = window.pageYOffset;
    var active  = null;
    for (var i = 0; i < sections.length; i++) {
      if (scrollY >= tops[i] - 200) active = sections[i];
    }
    for (var j = 0; j < links.length; j++) {
      links[j].classList.toggle('active', sections[j] === active);
    }
  }

  cacheTops();
  window.addEventListener('resize', cacheTops, { passive: true });

  window.addEventListener('scroll', function () {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(function () {
        updateActive();
        rafPending = false;
      });
    }
  }, { passive: true });

  updateActive();
})();

/* =============================================
   GALERÍA MASONRY — filtros + lightbox
   La galería se carga desde Supabase (club_galeria).
   Si la API devuelve items, reemplaza el HTML estático.
   Si falla o devuelve vacío, usa los items estáticos como fallback.
============================================= */
(function () {
  var filters  = document.querySelectorAll('.cg-filter');
  var masonry  = document.getElementById('cgMasonry');
  if (!masonry) return;

  var currentFilter = 'all';

  function getItems() {
    return masonry.querySelectorAll('.cg-item');
  }

  function aplicarFiltro() {
    masonry.classList.add('cg-fading');
    setTimeout(function () {
      getItems().forEach(function (item) {
        var disc = item.getAttribute('data-disc');
        item.style.display = (currentFilter === 'all' || disc === currentFilter) ? '' : 'none';
      });
      masonry.classList.remove('cg-fading');
    }, 260);
  }

  function bindLightbox(items) {
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var visible = Array.from(getItems()).filter(function (i) {
          return i.style.display !== 'none';
        });
        var images = visible.map(function (i) { return i.querySelector('img').src; });
        var idx    = visible.indexOf(this);
        if (openLightbox) openLightbox(images, idx);
      });
    });
  }

  /* Filtro */
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentFilter = this.getAttribute('data-filter');
      filters.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      aplicarFiltro();
    });
  });

  /* Cargar galería desde Supabase */
  if (window.supabaseClient) {
    window.supabaseClient
      .from('club_galeria')
      .select('*')
      .order('created_at', { ascending: false })
      .then(function (result) {
        var data = result.data;
        if (result.error || !Array.isArray(data) || !data.length) { bindLightbox(getItems()); return; }
        masonry.innerHTML = data.map(function (item) {
          var badge = item.disciplina.charAt(0).toUpperCase() + item.disciplina.slice(1);
          return '<div class="cg-item" data-disc="' + item.disciplina + '">' +
            '<img src="' + item.url + '" alt="' + (item.alt || 'Club Sanvi') + '" loading="lazy" decoding="async">' +
            '<div class="cg-overlay"><span class="cg-badge">' + badge + '</span></div>' +
            '</div>';
        }).join('');
        bindLightbox(getItems());
      })
      .catch(function () { bindLightbox(getItems()); });
  } else {
    bindLightbox(getItems());
  }
})();

/* =============================================
   DISCIPLINAS — actualizar foto y texto desde API
   Usa los estáticos como fallback si la API no responde.
============================================= */
(function () {
  if (window.supabaseClient) {
    window.supabaseClient
      .from('club_disciplinas')
      .select('*')
      .then(function (result) {
        if (result.error || !Array.isArray(result.data)) return;
        result.data.forEach(function (disc) {
          var row = document.querySelector('[data-disciplina="' + disc.slug + '"]');
          if (!row) return;
          if (disc.foto_url) {
            var img = row.querySelector('.ca-photo img');
            if (img) img.src = disc.foto_url;
          }
          if (disc.nombre) {
            var h3 = row.querySelector('.ca-content h3');
            if (h3 && !h3.hasAttribute('data-i18n')) h3.textContent = disc.nombre;
          }
          if (disc.descripcion) {
            var p = row.querySelector('.ca-feature p');
            if (p && !p.hasAttribute('data-i18n')) p.textContent = disc.descripcion;
          }
        });
      })
      .catch(function () {});
  }
})();
