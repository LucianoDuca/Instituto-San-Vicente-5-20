/* =============================================
   SAN VICENTE — imágenes dinámicas
   Reemplaza src de imágenes etiquetadas con
   data-sv-seccion y data-sv-slot desde la API.
   Fallback: src estático del HTML.
============================================= */
(function () {
  var imgs = document.querySelectorAll('[data-sv-seccion]');
  if (!imgs.length) return;

  var sections = {};
  imgs.forEach(function (img) {
    var sec = img.dataset.svSeccion;
    var slot = parseInt(img.dataset.svSlot);
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push({ img: img, slot: slot });
  });

  Object.keys(sections).forEach(function (sec) {
    fetch('/api/sv/imagenes/' + sec)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) return;
        data.forEach(function (item) {
          var entry = sections[sec].find(function (e) { return e.slot === item.slot; });
          if (entry && item.url) {
            if (entry.img.tagName === 'IMG') {
              entry.img.src = item.url;
              if (item.alt) entry.img.alt = item.alt;
            } else {
              entry.img.style.backgroundImage = 'url(' + item.url + ')';
              entry.img.style.backgroundSize = 'cover';
              entry.img.style.backgroundPosition = 'center';
            }
          }
        });
      })
      .catch(function () {});
  });
})();
