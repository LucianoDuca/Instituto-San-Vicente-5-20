const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");
const documentsContainer = document.getElementById("documentsContainer");
const announcementsContainer = document.getElementById("announcementsContainer");

const nivelFilter = document.getElementById("nivelFilter");
const areaFilter = document.getElementById("areaFilter");
const categoriaFilter = document.getElementById("categoriaFilter");

let documentos = [];

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

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

function pintarDocumentos(lista) {
  if (!lista.length) {
    documentsContainer.innerHTML = `<p class="empty-text">No hay documentos disponibles.</p>`;
    return;
  }

  documentsContainer.innerHTML = "";

  lista.forEach((doc) => {
    const card = document.createElement("article");
    card.className = "document-card";

    card.innerHTML = `
      <div>
        <span class="doc-category">${doc.categoria}</span>
        <h3>${doc.titulo}</h3>
        <p>${doc.descripcion || "Sin descripción."}</p>

        <div class="doc-meta">
          <span>${doc.nivel}</span>
          <span>${doc.area}</span>
        </div>
      </div>

      <a href="${doc.drive_url}" target="_blank" rel="noopener noreferrer">
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

  const filtrados = documentos.filter((doc) => {
    return (
      (!nivel || doc.nivel === nivel) &&
      (!area || doc.area === area) &&
      (!categoria || doc.categoria === categoria)
    );
  });

  pintarDocumentos(filtrados);
}

async function cargarPerfil() {
  const response = await fetchConAuth("/api/me");
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudo cargar el perfil");
  }

  if (result.profile.rol !== "docente") {
    window.location.href = "login.html";
    return;
  }

  userInfo.textContent = `Sesión iniciada como ${result.profile.nombre || "Docente"} ${result.profile.apellido || ""} · ${result.profile.area || "Área no definida"}`;
}

async function cargarComunicados() {
  const response = await fetchConAuth("/api/announcements");
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudieron cargar los comunicados");
  }

  if (!Array.isArray(result) || result.length === 0) {
    announcementsContainer.innerHTML = `<p class="empty-text">No hay comunicados disponibles.</p>`;
    return;
  }

  announcementsContainer.innerHTML = "";

  result.forEach((item) => {
    const card = document.createElement("article");
    card.className = "announcement-card";

    card.innerHTML = `
      <span>${item.rol_visible === "todos" ? "General" : item.rol_visible}</span>
      <h3>${item.titulo}</h3>
      <p>${item.contenido}</p>
    `;

    announcementsContainer.appendChild(card);
  });
}

async function cargarDocumentos() {
  documentsContainer.innerHTML = "<p>Cargando documentos...</p>";

  const response = await fetchConAuth("/api/library");
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudo cargar la biblioteca");
  }

  documentos = Array.isArray(result) ? result : [];
  pintarDocumentos(documentos);
}

async function iniciarPanel() {
  try {
    await cargarPerfil();
    await cargarComunicados();
    await cargarDocumentos();
  } catch (error) {
    documentsContainer.innerHTML = `<p class="empty-text">Error: ${error.message}</p>`;
  }
}

logoutBtn.addEventListener("click", async () => {
  await window.supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

[nivelFilter, areaFilter, categoriaFilter].forEach((filter) => {
  filter.addEventListener("change", aplicarFiltros);
});

iniciarPanel();