// ==========================
// MENÚ HAMBURGUESA
// ==========================
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("nav-menu");

if (hamburger && navMenu) {
  hamburger.addEventListener("click", () => {
    navMenu.classList.toggle("active");
  });

  document.querySelectorAll("#nav-menu a").forEach(link => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
    });
  });

  document.addEventListener("click", (e) => {
    const clickedInsideMenu = navMenu.contains(e.target);
    const clickedHamburger = hamburger.contains(e.target);

    if (!clickedInsideMenu && !clickedHamburger) {
      navMenu.classList.remove("active");
    }
  });
}

// ==========================
// SLIDER AUTOMÁTICO
// ==========================
const slides = document.getElementById("slides");
const slideItems = document.querySelectorAll(".slide");
let currentIndex = 0;

if (slides && slideItems.length > 0) {
  function nextSlide() {
    currentIndex++;

    if (currentIndex >= slideItems.length) {
      currentIndex = 0;
    }

    slides.style.transform = `translateX(-${currentIndex * 100}%)`;
  }

  setInterval(nextSlide, 4000);
}