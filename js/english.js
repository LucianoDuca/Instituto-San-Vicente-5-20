(function () {

  /* ── Slider helper ─────────────────────────────────────────
     Maneja cualquier slider con el patrón:
       .nivel-slider  >  .nivel-slide(.active)
     y un contenedor de .dot con data-index
  ─────────────────────────────────────────────────────────── */
  function initSlider(sliderId, dotsContainerId, prevId, nextId, interval) {
    var sliderWrap = document.getElementById(sliderId);
    if (!sliderWrap) return;
    var slides   = sliderWrap.querySelectorAll('.nivel-slide');
    var dotsWrap = dotsContainerId ? document.getElementById(dotsContainerId) : null;
    if (!slides.length) return;

    var current = 0;
    var timer;

    /* sincroniza dots externos (HTML estático) */
    function syncDots(idx) {
      if (!dotsWrap) return;
      var dots = dotsWrap.querySelectorAll('.dot');
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    }

    function goTo(idx) {
      slides[current].classList.remove('active');
      current = (idx + slides.length) % slides.length;
      slides[current].classList.add('active');
      syncDots(current);
    }

    function resetTimer() {
      clearInterval(timer);
      timer = setInterval(function () { goTo(current + 1); }, interval || 3500);
    }

    /* dots externos: click */
    if (dotsWrap) {
      dotsWrap.querySelectorAll('.dot').forEach(function (dot) {
        dot.addEventListener('click', function () {
          var idx = parseInt(this.dataset.index, 10);
          goTo(idx);
          resetTimer();
        });
      });
    }

    /* pausa al hacer hover sobre el contenedor del slider */
    var parent = sliderWrap.parentElement;
    parent.addEventListener('mouseenter', function () { clearInterval(timer); });
    parent.addEventListener('mouseleave', resetTimer);

    /* botones prev/next (opcionales) */
    if (prevId) {
      var prevBtn = document.getElementById(prevId);
      if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); resetTimer(); });
    }
    if (nextId) {
      var nextBtn = document.getElementById(nextId);
      if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); resetTimer(); });
    }

    syncDots(0);
    resetTimer();
  }

  /* Hero slider (con botones prev/next) */
  initSlider('enSlider', 'enSliderDots', 'enPrevBtn', 'enNextBtn', 3500);


})();
