document.addEventListener("DOMContentLoaded", () => {
  const nivelSlides = document.querySelectorAll(".nivel-slide");
  const nivelPrevBtn = document.getElementById("prevBtn");
  const nivelNextBtn = document.getElementById("nextBtn");
  const nivelDots = document.querySelectorAll(".dot");

  if (nivelSlides.length && nivelPrevBtn && nivelNextBtn && nivelDots.length) {
    let nivelCurrentIndex = 0;

    function showNivelSlide(index) {
      nivelSlides.forEach((slide) => slide.classList.remove("active"));
      nivelDots.forEach((dot) => dot.classList.remove("active"));

      nivelSlides[index].classList.add("active");
      nivelDots[index].classList.add("active");
    }

    nivelNextBtn.addEventListener("click", () => {
      nivelCurrentIndex = (nivelCurrentIndex + 1) % nivelSlides.length;
      showNivelSlide(nivelCurrentIndex);
    });

    nivelPrevBtn.addEventListener("click", () => {
      nivelCurrentIndex =
        (nivelCurrentIndex - 1 + nivelSlides.length) % nivelSlides.length;
      showNivelSlide(nivelCurrentIndex);
    });

    nivelDots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        nivelCurrentIndex = index;
        showNivelSlide(nivelCurrentIndex);
      });
    });

    showNivelSlide(nivelCurrentIndex);
  }
});