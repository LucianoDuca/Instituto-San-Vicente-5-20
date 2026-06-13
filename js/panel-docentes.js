const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");
const documentsContainer = document.getElementById("documentsContainer");
const announcementsContainer = document.getElementById("announcementsContainer");
const nivelFilter = document.getElementById("nivelFilter");
const areaFilter = document.getElementById("areaFilter");
const categoriaFilter = document.getElementById("categoriaFilter");
const documentSearch = document.getElementById("documentSearch");
const docCount = document.getElementById("docCount");
const commsBadge = document.getElementById("commsBadge");
const docsBadge = document.getElementById("docsBadge");

let documentos = [];

function escaparHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatFecha(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}

function skeletonCards(n, cls = "skeleton-card") {
  return Array(n).fill(`<div class="skeleton ${cls}"></div>`).join("");
}

/* Tabs */

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

/* Auth */

async function obtenerToken() {
  const { data, error } = await window.supabaseClient.auth.getSession();
  if (error || !data.session) {
    window.location.href = "login.html";
    return null;
  }
  return data.session.access_token;
}

async function fetchConAuth(url) {
  const token = await obtenerToken();
  if (!token) return null;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}

/* Perfil */

async function cargarPerfil() {
  const response = await fetchConAuth("/api/me");
  if (!response) return;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo cargar el perfil");
  if (result.profile.rol !== "docente") {
    window.location.href = "login.html";
    return;
  }
  userInfo.textContent = `${result.profile.nombre || "Docente"} ${result.profile.apellido || ""} · ${result.profile.area || "Área no definida"}`;
}

/* Comunicados */

async function cargarComunicados() {
  announcementsContainer.innerHTML = skeletonCards(2);

  const response = await fetchConAuth("/api/announcements");
  if (!response) return;
  const result = await response.json();

  if (!response.ok) throw new Error(result.error || "Error al cargar comunicados");

  if (!Array.isArray(result) || result.length === 0) {
    commsBadge.textContent = "0";
    announcementsContainer.innerHTML = `<p class="empty-text">No hay comunicados disponibles.</p>`;
    return;
  }

  commsBadge.textContent = result.length;
  announcementsContainer.innerHTML = "";

  result.forEach((item) => {
    const card = document.createElement("article");
    card.className = "announcement-card";
    card.innerHTML = `
      <span>${item.rol_visible === "todos" ? "General" : escaparHTML(item.rol_visible)}</span>
      <h3>${escaparHTML(item.titulo)}</h3>
      <p>${escaparHTML(item.contenido)}</p>
      <p class="ann-date">${formatFecha(item.created_at)}</p>
    `;
    announcementsContainer.appendChild(card);
  });
}

/* Documentos */

function pintarDocumentos(lista) {
  if (docsBadge) docsBadge.textContent = documentos.length;

  if (docCount) {
    docCount.textContent = lista.length === documentos.length
      ? `${documentos.length} documentos`
      : `${lista.length} de ${documentos.length} documentos`;
  }

  if (!lista.length) {
    documentsContainer.innerHTML = `<p class="empty-text">No hay documentos que coincidan.</p>`;
    return;
  }

  documentsContainer.innerHTML = "";

  lista.forEach((doc) => {
    const card = document.createElement("article");
    card.className = "document-card";
    card.innerHTML = `
      <div>
        <span class="doc-category">${escaparHTML(doc.categoria)}</span>
        <h3>${escaparHTML(doc.titulo)}</h3>
        <p>${escaparHTML(doc.descripcion) || "Sin descripción."}</p>
        <div class="doc-meta">
          <span>${escaparHTML(doc.nivel)}</span>
          <span>${escaparHTML(doc.area)}</span>
        </div>
        <p class="doc-date">${formatFecha(doc.created_at)}</p>
      </div>
      <a href="${escaparHTML(doc.drive_url)}" target="_blank" rel="noopener noreferrer">
        Abrir documento
      </a>
    `;
    documentsContainer.appendChild(card);
  });
}

function aplicarFiltros() {
  const nivel = nivelFilter.value;
  const area = areaFilter.value;
  const categoria = categoriaFilter.value;
  const query = documentSearch.value.toLowerCase().trim();

  const filtrados = documentos.filter((doc) => {
    const coincideFiltro =
      (!nivel || doc.nivel === nivel) &&
      (!area || doc.area === area) &&
      (!categoria || doc.categoria === categoria);

    const coincideBusqueda =
      !query ||
      `${doc.titulo} ${doc.descripcion} ${doc.categoria} ${doc.nivel} ${doc.area}`
        .toLowerCase()
        .includes(query);

    return coincideFiltro && coincideBusqueda;
  });

  pintarDocumentos(filtrados);
}

async function cargarDocumentos() {
  documentsContainer.innerHTML = skeletonCards(3, "skeleton-doc");

  const response = await fetchConAuth("/api/library");
  if (!response) return;
  const result = await response.json();

  if (!response.ok) throw new Error(result.error || "No se pudo cargar la biblioteca");

  documentos = Array.isArray(result) ? result : [];
  aplicarFiltros();
}

/* Inicio */

async function iniciarPanel() {
  try {
    await cargarPerfil();
    await Promise.all([cargarComunicados(), cargarDocumentos()]);
  } catch (error) {
    documentsContainer.innerHTML = `<p class="empty-text">Error: ${escaparHTML(error.message)}</p>`;
  }
}

logoutBtn.addEventListener("click", async () => {
  await window.supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

[nivelFilter, areaFilter, categoriaFilter].forEach((filter) => {
  filter.addEventListener("change", aplicarFiltros);
});

documentSearch.addEventListener("input", aplicarFiltros);

iniciarPanel();
