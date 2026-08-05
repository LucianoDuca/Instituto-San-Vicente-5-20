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

const createAnnouncementForm = document.getElementById("createAnnouncementForm");
const announcementStatus = document.getElementById("announcementStatus");
const createAnnouncementBtn = document.getElementById("createAnnouncementBtn");

const toggleCreateDocumentBtn = document.getElementById("toggleCreateDocumentBtn");
const closeDocumentModalBtn = document.getElementById("closeDocumentModalBtn");
const documentModal = document.getElementById("documentModal");
const documentFormTitle = document.getElementById("documentFormTitle");
const documentId = document.getElementById("documentId");
const documentStatus = document.getElementById("documentStatus");
const documentFileInput = document.getElementById("documentFileInput");
const documentUploadText = document.getElementById("documentUploadText");
const createDocumentForm = document.getElementById("createDocumentForm");
const createDocumentBtn = document.getElementById("createDocumentBtn");
const cancelEditDocumentBtn = document.getElementById("cancelEditDocumentBtn");

let documentos = [];
let miPerfil = null;

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

function infoAutoria(item) {
  const partes = [];
  if (item.created_by_name) {
    partes.push(`Cargado por ${escaparHTML(item.created_by_name)} · ${formatFecha(item.created_at)}`);
  } else {
    partes.push(`Cargado: ${formatFecha(item.created_at)}`);
  }
  if (item.updated_by_name) {
    partes.push(`Editado por ${escaparHTML(item.updated_by_name)} · ${formatFecha(item.updated_at)}`);
  }
  return partes.join("<br>");
}

function skeletonCards(n, cls = "skeleton-card") {
  return Array(n).fill(`<div class="skeleton ${cls}"></div>`).join("");
}

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.className = `status ${type}`;
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

async function fetchAuth(url, options = {}) {
  const token = await obtenerToken();
  if (!token) return null;
  const esFormData = options.body instanceof FormData;
  return fetch(url, {
    ...options,
    headers: {
      ...(esFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
}

/* Perfil */

async function cargarPerfil() {
  const response = await fetchAuth("/api/me");
  if (!response) return;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo cargar el perfil");
  if (result.profile.rol !== "directivo") {
    window.location.href = "login.html";
    return;
  }
  miPerfil = result.profile;
  userInfo.textContent = `${result.profile.nombre || "Directivo"} ${result.profile.apellido || ""} · ${result.profile.cargo || "Equipo directivo"}`;
}

/* Comunicados */

async function cargarComunicados() {
  announcementsContainer.innerHTML = skeletonCards(2);

  const response = await fetchAuth("/api/announcements");
  if (!response) return;
  const result = await response.json();

  if (!response.ok) throw new Error(result.error || "Error al cargar comunicados");

  if (!Array.isArray(result) || result.length === 0) {
    if (commsBadge) commsBadge.textContent = "0";
    announcementsContainer.innerHTML = `<p class="empty-text">No hay comunicados disponibles.</p>`;
    return;
  }

  if (commsBadge) commsBadge.textContent = result.length;
  announcementsContainer.innerHTML = "";

  result.forEach((item) => {
    const esPropio = miPerfil && item.created_by === miPerfil.id;

    const card = document.createElement("article");
    card.className = "announcement-card";
    card.innerHTML = `
      <span>${item.rol_visible === "todos" ? "General" : escaparHTML(item.rol_visible)}</span>
      <h3>${escaparHTML(item.titulo)}</h3>
      <p>${escaparHTML(item.contenido)}</p>
      <p class="ann-date">${infoAutoria(item)}</p>
      ${esPropio ? `<button type="button" class="delete-btn ann-delete-btn" data-id="${escaparHTML(item.id)}">Borrar</button>` : ""}
    `;
    announcementsContainer.appendChild(card);
  });

  announcementsContainer.querySelectorAll(".ann-delete-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await borrarComunicado(button.dataset.id);
    });
  });
}

async function borrarComunicado(id) {
  if (!confirm("¿Seguro que querés borrar este comunicado?")) return;
  try {
    const response = await fetchAuth(`/api/admin/announcements/${id}`, { method: "DELETE" });
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo borrar");
    await cargarComunicados();
  } catch (error) {
    alert(error.message);
  }
}

createAnnouncementForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const datos = Object.fromEntries(new FormData(createAnnouncementForm).entries());
  try {
    createAnnouncementBtn.disabled = true;
    createAnnouncementBtn.textContent = "Publicando...";
    setStatus(announcementStatus, "");
    const response = await fetchAuth("/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify(datos)
    });
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo publicar");
    setStatus(announcementStatus, "Comunicado publicado correctamente.", "success");
    createAnnouncementForm.reset();
    await cargarComunicados();
  } catch (error) {
    setStatus(announcementStatus, error.message, "error");
  } finally {
    createAnnouncementBtn.disabled = false;
    createAnnouncementBtn.textContent = "Publicar comunicado";
  }
});

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
    const esPropio = miPerfil && doc.created_by === miPerfil.id;

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
        <p class="doc-date">${infoAutoria(doc)}</p>
      </div>
      <a href="${escaparHTML(doc.drive_url)}" target="_blank" rel="noopener noreferrer">
        Abrir documento
      </a>
      ${esPropio ? `
        <div class="doc-owner-actions">
          <button type="button" class="edit-btn doc-edit-btn" data-id="${escaparHTML(doc.id)}">Editar</button>
          <button type="button" class="delete-btn doc-delete-btn" data-id="${escaparHTML(doc.id)}">Borrar</button>
        </div>
      ` : ""}
    `;
    documentsContainer.appendChild(card);
  });

  documentsContainer.querySelectorAll(".doc-edit-btn").forEach((button) => {
    button.addEventListener("click", () => editarDocumento(button.dataset.id));
  });

  documentsContainer.querySelectorAll(".doc-delete-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await borrarDocumento(button.dataset.id);
    });
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

  const response = await fetchAuth("/api/library");
  if (!response) return;
  const result = await response.json();

  if (!response.ok) throw new Error(result.error || "No se pudo cargar la biblioteca");

  documentos = Array.isArray(result) ? result : [];
  aplicarFiltros();
}

function resetFormularioDocumento() {
  documentFormTitle.textContent = "Cargar documento";
  documentId.value = "";
  createDocumentForm.reset();
  documentUploadText.textContent = "📎 Elegir archivo (imagen, PDF, Word, Excel...)";
  cancelEditDocumentBtn.classList.add("hidden");
  setStatus(documentStatus, "");
}

function abrirModalDocumento() {
  documentModal.classList.add("open");
}

function cerrarModalDocumento() {
  documentModal.classList.remove("open");
  resetFormularioDocumento();
}

function editarDocumento(id) {
  const doc = documentos.find((item) => item.id === id);
  if (!doc) return;
  abrirModalDocumento();
  documentFormTitle.textContent = "Editar documento";
  documentId.value = doc.id;
  createDocumentForm.titulo.value = doc.titulo || "";
  createDocumentForm.descripcion.value = doc.descripcion || "";
  createDocumentForm.categoria.value = doc.categoria || "Documento institucional";
  createDocumentForm.nivel.value = doc.nivel || "General";
  createDocumentForm.area.value = doc.area || "Institucional";
  createDocumentForm.rol_visible.value = doc.rol_visible || "todos";
  createDocumentForm.drive_url.value = doc.drive_url || "";
  cancelEditDocumentBtn.classList.remove("hidden");
  setStatus(documentStatus, "Editando documento seleccionado.", "success");
}

async function borrarDocumento(id) {
  if (!confirm("¿Seguro que querés borrar este documento?")) return;
  try {
    const response = await fetchAuth(`/api/admin/library/${id}`, { method: "DELETE" });
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo borrar");
    await cargarDocumentos();
  } catch (error) {
    alert(error.message);
  }
}

async function subirDocumentoStorage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetchAuth("/api/admin/library/upload", {
    method: "POST",
    body: formData
  });
  if (!response) throw new Error("No se pudo subir el archivo");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo subir el archivo");
  return result.url;
}

documentFileInput.addEventListener("change", () => {
  documentUploadText.textContent = documentFileInput.files[0]?.name || "📎 Elegir archivo (imagen, PDF, Word, Excel...)";
});

createDocumentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const datos = Object.fromEntries(new FormData(createDocumentForm).entries());
  const editando = Boolean(datos.id);
  const archivo = documentFileInput.files[0];

  try {
    createDocumentBtn.disabled = true;
    setStatus(documentStatus, "");

    if (archivo) {
      createDocumentBtn.textContent = "Subiendo archivo...";
      datos.drive_url = await subirDocumentoStorage(archivo);
    }

    if (!datos.drive_url) {
      throw new Error("Subí un archivo o pegá un enlace.");
    }

    createDocumentBtn.textContent = editando ? "Guardando..." : "Cargando...";
    const response = await fetchAuth(
      editando ? `/api/admin/library/${datos.id}` : "/api/admin/library",
      { method: editando ? "PATCH" : "POST", body: JSON.stringify(datos) }
    );
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo guardar el documento");

    await cargarDocumentos();
    cerrarModalDocumento();
    setStatus(documentStatus, editando ? "Documento editado correctamente." : "Documento cargado correctamente.", "success");
  } catch (error) {
    setStatus(documentStatus, error.message, "error");
  } finally {
    createDocumentBtn.disabled = false;
    createDocumentBtn.textContent = "Guardar documento";
  }
});

toggleCreateDocumentBtn.addEventListener("click", () => {
  resetFormularioDocumento();
  abrirModalDocumento();
});

closeDocumentModalBtn.addEventListener("click", cerrarModalDocumento);
cancelEditDocumentBtn.addEventListener("click", cerrarModalDocumento);

documentModal.addEventListener("click", (event) => {
  if (event.target === documentModal) cerrarModalDocumento();
});

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
