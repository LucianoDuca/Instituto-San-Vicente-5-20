const heroVideo = document.querySelector(".hero-video");

if (heroVideo) {
  heroVideo.addEventListener("click", () => {
    heroVideo.currentTime = 0;
    heroVideo.play();
  });

  heroVideo.addEventListener("loadeddata", () => {
    heroVideo.play().catch(() => {
      console.log("El navegador bloqueó la reproducción automática.");
    });
  });
}

const edificiosSlides = document.getElementById("edificiosSlides");
const edificiosSlideItems = document.querySelectorAll(".edificios-slide");
let edificiosIndex = 0;

if (edificiosSlides && edificiosSlideItems.length > 0) {
  function nextEdificioSlide() {
    edificiosIndex++;

    if (edificiosIndex >= edificiosSlideItems.length) {
      edificiosIndex = 0;
    }

    edificiosSlides.style.transform = `translateX(-${edificiosIndex * 100}%)`;
  }

  setInterval(nextEdificioSlide, 4000);
}