/* Reveal on scroll */

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".club-reveal").forEach((el) => revealObserver.observe(el));

/* Lightbox */

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

document.querySelectorAll(".club-gallery img").forEach((img) => {
  img.addEventListener("click", () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  });
});

function cerrarLightbox() {
  lightbox.classList.remove("open");
  document.body.style.overflow = "";
}

lightboxClose.addEventListener("click", cerrarLightbox);

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) cerrarLightbox();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrarLightbox();
});
