const LOADER_DURATION = 3000;

const _loaderBase = document.currentScript
  ? document.currentScript.src.replace(/js\/loader\.js[^/]*$/, '')
  : '';

const loaderMarkup = `
  <div class="route-loader" id="routeLoader" aria-hidden="true" style="--loader-duration: ${LOADER_DURATION}ms;">
    <div class="route-loader__content">
      <div class="route-loader__logo-wrap">
        <div class="route-loader__glow"></div>
        <img
          src="${_loaderBase}assets/img/Sanvi Logos/logo.webp"
          alt="Instituto San Vicente"
          class="route-loader__logo"
        >
      </div>

      <p class="route-loader__title">Loading</p>

      <div class="route-loader__bar" aria-hidden="true">
        <div class="route-loader__progress"></div>
      </div>

      <p class="route-loader__subtitle">Cargando la siguiente sección...</p>
    </div>
  </div>
`;

document.addEventListener("DOMContentLoaded", () => {
  document.body.insertAdjacentHTML("beforeend", loaderMarkup);

  const routeLoader = document.getElementById("routeLoader");
  const links = document.querySelectorAll("a[href]");

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");

      const isInternalRoute =
        href &&
        !href.startsWith("#") &&
        !href.startsWith("http") &&
        !href.startsWith("mailto:") &&
        !href.startsWith("tel:") &&
        !link.hasAttribute("target") &&
        !link.hasAttribute("download");

      if (!isInternalRoute) return;

      e.preventDefault();

      routeLoader.classList.add("active");

      setTimeout(() => {
        window.location.href = href;
      }, LOADER_DURATION);
    });
  });
});