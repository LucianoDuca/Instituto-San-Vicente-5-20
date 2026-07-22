/* =============================================
   SAN VICENTE — imágenes dinámicas
   - Secciones tipo "nivel" (slider .nivel-slide + .dot): construye la
     cantidad de slides/puntitos según la base (variable) e inicializa
     la navegación.
   - Resto de secciones: reemplaza el src de los nodos existentes (clásico).
   Fallback: si la API falla, usa los nodos estáticos del HTML.
============================================= */
(function () {
  // Tipo de cada sección con cantidad de imágenes variable
  var TIPO = {
    kinder: 'nivel', primario: 'nivel', secundario: 'nivel', ingles: 'nivel',
    hero: 'carousel',
    instalaciones: 'grid'
  };

  var tagged = document.querySelectorAll('[data-sv-seccion]');
  if (!tagged.length) return;

  var secciones = {};
  tagged.forEach(function (el) {
    var sec = el.dataset.svSeccion;
    (secciones[sec] = secciones[sec] || []).push(el);
  });

  Object.keys(secciones).forEach(function (sec) {
    fetch('/api/sv/imagenes/' + sec)
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (data) {
        if (!Array.isArray(data)) data = [];
        var tipo = TIPO[sec];
        if (tipo === 'nivel') construirNivel(sec, data);
        else if (tipo === 'carousel') construirCarousel(sec, data);
        else if (tipo === 'grid') construirGrid(sec, data);
        else reemplazarSrc(secciones[sec], data);
      })
      .catch(function () {
        // Sin API: inicializar sobre los nodos estáticos
        var tipo = TIPO[sec];
        if (tipo === 'nivel') { var sw = sliderDeSeccion(sec); if (sw) initNivelSlider(sw); }
        else if (tipo === 'carousel') { var t = trackDeSeccion(sec); if (t) initCarousel(t); }
      });
  });

  function seteaImg(img, row) {
    if (!img) return;
    if (row.url) img.src = row.url;
    if (row.alt) img.setAttribute('alt', row.alt);
    img.setAttribute('data-sv-slot', row.slot);
    img.removeAttribute('data-i18n-alt');
  }

  function trackDeSeccion(sec) {
    var img = document.querySelector('[data-sv-seccion="' + sec + '"]');
    var slide = img ? img.closest('.slide, .edificios-slide') : null;
    return slide ? slide.parentElement : null;
  }

  /* Carrusel translateX (hero / edificios): reconstruye slides y (re)inicia autoplay */
  function construirCarousel(sec, data) {
    var rows = data.slice().sort(function (a, b) { return a.slot - b.slot; });
    var img = document.querySelector('[data-sv-seccion="' + sec + '"]');
    var slideTpl = img ? img.closest('.slide, .edificios-slide') : null;
    if (!slideTpl) return;
    var track = slideTpl.parentElement;

    if (rows.length) {
      var base = slideTpl.cloneNode(true);
      track.innerHTML = '';
      rows.forEach(function (row) {
        var s = base.cloneNode(true);
        seteaImg(s.querySelector('img'), row);
        track.appendChild(s);
      });
    }
    initCarousel(track);
  }

  function initCarousel(track) {
    if (!track || !track.children.length) return;
    var i = 0;
    setInterval(function () {
      i = (i + 1) % track.children.length;
      track.style.transform = 'translateX(-' + (i * 100) + '%)';
    }, 4000);
  }

  /* Grilla (instalaciones): reconstruye las celdas según la DB (la 1ª conserva sus clases) */
  function construirGrid(sec, data) {
    var rows = data.slice().sort(function (a, b) { return a.slot - b.slot; });
    if (!rows.length) return;
    var imgs = document.querySelectorAll('[data-sv-seccion="' + sec + '"]');
    if (!imgs.length) return;
    var firstUnit = imgs[0].parentElement;
    var container = firstUnit.parentElement;
    var firstTpl = firstUnit.cloneNode(true);
    var plainTpl = (imgs[1] && imgs[1].parentElement ? imgs[1].parentElement : firstUnit).cloneNode(true);

    container.innerHTML = '';
    rows.forEach(function (row, i) {
      var u = (i === 0 ? firstTpl : plainTpl).cloneNode(true);
      seteaImg(u.querySelector('img'), row);
      container.appendChild(u);
    });
  }

  function sliderDeSeccion(sec) {
    var img = document.querySelector('[data-sv-seccion="' + sec + '"]');
    return img ? img.closest('.nivel-slider') : null;
  }

  function dotsDeSlider(slider) {
    var card = slider.parentElement;
    return card ? card.querySelector('.slider-dots') : null;
  }

  /* Clásico: cambia el src (o background) por slot */
  function reemplazarSrc(nodos, data) {
    var bySlot = {};
    data.forEach(function (it) { bySlot[it.slot] = it; });
    nodos.forEach(function (el) {
      var it = bySlot[parseInt(el.dataset.svSlot)];
      if (!it || !it.url) return;
      if (el.tagName === 'IMG') {
        el.src = it.url;
        if (it.alt) el.alt = it.alt;
      } else {
        el.style.backgroundImage = 'url(' + it.url + ')';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
      }
    });
  }

  /* Slider de niveles: reconstruye slides + dots según la DB y (re)inicializa */
  function construirNivel(sec, data) {
    var slider = sliderDeSeccion(sec);
    if (!slider) return;

    var rows = data.slice().sort(function (a, b) { return a.slot - b.slot; });
    var slideTpl = slider.querySelector('.nivel-slide');

    if (rows.length && slideTpl) {
      var baseSlide = slideTpl.cloneNode(true);
      slider.innerHTML = '';
      rows.forEach(function (row, i) {
        var s = baseSlide.cloneNode(true);
        s.classList.toggle('active', i === 0);
        var img = s.querySelector('img');
        if (img) {
          if (row.url) img.src = row.url;
          if (row.alt) img.setAttribute('alt', row.alt);
          img.setAttribute('data-sv-slot', row.slot);
          img.removeAttribute('data-i18n-alt');
        }
        slider.appendChild(s);
      });

      var dotsWrap = dotsDeSlider(slider);
      if (dotsWrap) {
        var dotTpl = dotsWrap.querySelector('.dot');
        dotsWrap.innerHTML = '';
        rows.forEach(function (row, i) {
          var d = dotTpl ? dotTpl.cloneNode(true) : document.createElement('button');
          d.className = 'dot' + (i === 0 ? ' active' : '');
          d.setAttribute('data-index', i);
          dotsWrap.appendChild(d);
        });
      }
    }

    initNivelSlider(slider);
  }

  /* Navegación del slider .nivel-slide: .active + dots + prev/next + autoplay + pausa hover */
  function initNivelSlider(slider) {
    var slides = slider.querySelectorAll('.nivel-slide');
    if (!slides.length) return;

    var card = slider.parentElement;
    var dotsWrap = card ? card.querySelector('.slider-dots') : null;
    var prevBtn = card ? card.querySelector('.slider-btn.prev') : null;
    var nextBtn = card ? card.querySelector('.slider-btn.next') : null;
    var current = 0, timer;

    function dots() { return dotsWrap ? dotsWrap.querySelectorAll('.dot') : []; }
    function sync(i) { dots().forEach(function (d, k) { d.classList.toggle('active', k === i); }); }
    function goTo(i) {
      slides[current].classList.remove('active');
      current = (i + slides.length) % slides.length;
      slides[current].classList.add('active');
      sync(current);
    }
    function reset() { clearInterval(timer); timer = setInterval(function () { goTo(current + 1); }, 3500); }

    dots().forEach(function (d) {
      d.addEventListener('click', function () { goTo(parseInt(this.dataset.index, 10)); reset(); });
    });
    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); reset(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); reset(); });
    if (card) {
      card.addEventListener('mouseenter', function () { clearInterval(timer); });
      card.addEventListener('mouseleave', reset);
    }

    slides.forEach(function (s, i) { s.classList.toggle('active', i === 0); });
    sync(0);
    reset();
  }
})();
