const sectionTitle = document.getElementById("sectionTitle");
const navButtons = document.querySelectorAll(".nav-btn");
const sections = document.querySelectorAll(".admin-section");
const logoutBtn = document.getElementById("logoutBtn");

const statUsuarios = document.getElementById("statUsuarios");
const statDocentes = document.getElementById("statDocentes");
const statDirectivos = document.getElementById("statDirectivos");
const statDocumentos = document.getElementById("statDocumentos");
const statComunicados = document.getElementById("statComunicados");

const createUserForm = document.getElementById("createUserForm");
const createUserCard = document.getElementById("createUserCard");
const userFormTitle = document.getElementById("userFormTitle");
const userId = document.getElementById("userId");
const userPasswordInput = document.getElementById("userPasswordInput");
const userNivelSelect = document.getElementById("userNivelSelect");
const usersContainer = document.getElementById("usersContainer");
const usersCount = document.getElementById("usersCount");
const adminStatus = document.getElementById("adminStatus");
const createUserBtn = document.getElementById("createUserBtn");
const cancelEditUserBtn = document.getElementById("cancelEditUserBtn");
const toggleCreateUserBtn = document.getElementById("toggleCreateUserBtn");
const closeCreateUserBtn = document.getElementById("closeCreateUserBtn");
const reloadUsersBtn = document.getElementById("reloadUsersBtn");

const createDocumentForm = document.getElementById("createDocumentForm");
const documentModal = document.getElementById("documentModal");
const documentFormTitle = document.getElementById("documentFormTitle");
const documentId = document.getElementById("documentId");
const documentStatus = document.getElementById("documentStatus");
const documentFileInput = document.getElementById("documentFileInput");
const documentUploadText = document.getElementById("documentUploadText");
const createDocumentBtn = document.getElementById("createDocumentBtn");
const cancelEditDocumentBtn = document.getElementById("cancelEditDocumentBtn");
const toggleCreateDocumentBtn = document.getElementById("toggleCreateDocumentBtn");
const closeDocumentModalBtn = document.getElementById("closeDocumentModalBtn");
const reloadDocumentsBtn = document.getElementById("reloadDocumentsBtn");
const adminDocumentsContainer = document.getElementById("adminDocumentsContainer");
const documentSearch = document.getElementById("documentSearch");
const docsCount = document.getElementById("docsCount");
const storageMeterFill = document.getElementById("storageMeterFill");
const storageMeterLabel = document.getElementById("storageMeterLabel");

const createAnnouncementForm = document.getElementById("createAnnouncementForm");
const announcementStatus = document.getElementById("announcementStatus");
const createAnnouncementBtn = document.getElementById("createAnnouncementBtn");
const reloadAnnouncementsBtn = document.getElementById("reloadAnnouncementsBtn");
const announcementsContainer = document.getElementById("announcementsContainer");
const commsCount = document.getElementById("commsCount");

const hamburgerToggle = document.getElementById("hamburgerToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const adminShell = document.querySelector(".admin-shell");

let documentosAdmin = [];
let usuariosAdmin = [];

const DOMINIO_INTERNO = "sanvicente.interno";

const ROL_ETIQUETAS = {
  admin: "Administrador",
  directivo: "Directivo",
  docente: "Docente"
};

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

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.className = `status ${type}`;
}

function skeletonCards(n) {
  return Array(n).fill(`<div class="skeleton skeleton-card"></div>`).join("");
}

/* Hamburger / Drawer */

hamburgerToggle.addEventListener("click", () => {
  adminShell.classList.toggle("sidebar-open");
});

sidebarOverlay.addEventListener("click", () => {
  adminShell.classList.remove("sidebar-open");
});

/* Navegación */

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const sectionName = button.dataset.section;

    navButtons.forEach((btn) => btn.classList.remove("active"));
    sections.forEach((section) => section.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(sectionName).classList.add("active");
    sectionTitle.textContent = button.textContent;

    adminShell.classList.remove("sidebar-open");
  });
});

/* Logout */

logoutBtn.addEventListener("click", async () => {
  await window.supabaseClient.auth.signOut();
  window.location.href = "login.html";
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

/* Stats */

async function cargarStats() {
  try {
    const response = await fetchAuth("/api/admin/stats");
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Error al cargar estadísticas");
    statUsuarios.textContent = result.usuarios;
    statDocentes.textContent = result.docentes;
    statDirectivos.textContent = result.directivos;
    statDocumentos.textContent = result.documentos;
    statComunicados.textContent = result.comunicados;
  } catch (error) {
    console.error(error);
  }
}

/* Usuarios */

function generarUsuarioDesdeNombre(nombre, apellido) {
  const normalizar = (texto) => String(texto || "")
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return [normalizar(nombre), normalizar(apellido)].filter(Boolean).join(".");
}

async function cargarUsuarios() {
  try {
    usersContainer.innerHTML = skeletonCards(3);
    usersCount.textContent = "";

    const response = await fetchAuth("/api/admin/users");
    if (!response) return;
    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Error al cargar usuarios");

    usuariosAdmin = Array.isArray(result) ? result : [];

    if (!usuariosAdmin.length) {
      usersContainer.innerHTML = "<p class='muted'>No hay usuarios creados todavía.</p>";
      return;
    }

    usersCount.textContent = `(${usuariosAdmin.length})`;
    usersContainer.innerHTML = "";

    usuariosAdmin.forEach((user) => {
      const card = document.createElement("article");
      card.className = "item-card";
      card.innerHTML = `
        <div class="user-avatar">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/></svg>
        </div>
        <div class="user-info">
          <h3>${escaparHTML(user.nombre) || "Sin nombre"} ${escaparHTML(user.apellido)}</h3>
          <p>${escaparHTML(user.email) || "Sin email"}</p>
          <div class="meta">
            <span class="role">${escaparHTML(ROL_ETIQUETAS[user.rol] || user.rol) || "sin rol"}</span>
            ${user.nivel ? `<span>${escaparHTML(user.nivel)}</span>` : ""}
          </div>
          <p class="item-date">Alta: ${formatFecha(user.created_at)}</p>
        </div>
        <div class="item-actions">
          <button class="edit-btn" data-id="${escaparHTML(user.id)}">Editar</button>
          <button class="delete-btn" data-id="${escaparHTML(user.id)}">Borrar</button>
        </div>
      `;
      usersContainer.appendChild(card);
    });

    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", () => {
        editarUsuario(button.dataset.id);
      });
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        await borrarUsuario(button.dataset.id);
      });
    });

  } catch (error) {
    usersContainer.innerHTML = `<p class="status error">${error.message}</p>`;
  }
}

function actualizarCampoNivel() {
  const esDocente = createUserForm.rol.value === "docente";
  userNivelSelect.classList.toggle("hidden", !esDocente);
  userNivelSelect.required = esDocente;
  if (!esDocente) userNivelSelect.value = "";
}

function resetFormularioUsuario() {
  userFormTitle.textContent = "Crear usuario";
  userId.value = "";
  createUserForm.reset();
  cancelEditUserBtn.classList.add("hidden");
  createUserBtn.textContent = "Crear usuario";
  setStatus(adminStatus, "");
  actualizarCampoNivel();
}

function abrirModalUsuario() {
  createUserCard.classList.add("open");
}

function cerrarPanelUsuario() {
  createUserCard.classList.remove("open");
  resetFormularioUsuario();
}

function editarUsuario(id) {
  const user = usuariosAdmin.find((item) => item.id === id);
  if (!user) return;

  abrirModalUsuario();
  userFormTitle.textContent = "Editar usuario";
  userId.value = user.id;
  createUserForm.nombre.value = user.nombre || "";
  createUserForm.apellido.value = user.apellido || "";
  createUserForm.rol.value = user.rol || "";
  userPasswordInput.value = "";
  actualizarCampoNivel();
  createUserForm.nivel.value = user.nivel || "";

  cancelEditUserBtn.classList.remove("hidden");
  createUserBtn.textContent = "Guardar cambios";
  setStatus(adminStatus, "Editando usuario seleccionado.", "success");
}

async function borrarUsuario(id) {
  const confirmacion = prompt('Para eliminar este usuario, escribí "sanvicente" (sin comillas) para confirmar:');
  if (confirmacion === null) return;
  if (confirmacion.trim().toLowerCase() !== "sanvicente") {
    alert("Texto de confirmación incorrecto. No se eliminó el usuario.");
    return;
  }
  try {
    const response = await fetchAuth(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo borrar");
    await Promise.all([cargarUsuarios(), cargarStats()]);
  } catch (error) {
    alert(error.message);
  }
}

createUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const datos = Object.fromEntries(new FormData(createUserForm).entries());
  const editando = Boolean(datos.id);

  if (!datos.rol) {
    setStatus(adminStatus, "Elegí un rol para el usuario.", "error");
    return;
  }
  datos.email = `${generarUsuarioDesdeNombre(datos.nombre, datos.apellido)}@${DOMINIO_INTERNO}`;

  try {
    createUserBtn.disabled = true;
    setStatus(adminStatus, "");

    if (editando) {
      createUserBtn.textContent = "Guardando...";
      const response = await fetchAuth(`/api/admin/users/${datos.id}`, {
        method: "PATCH",
        body: JSON.stringify(datos)
      });
      if (!response) return;
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo editar el usuario");

      if (datos.password) {
        const passResponse = await fetchAuth(`/api/admin/users/${datos.id}/password`, {
          method: "PATCH",
          body: JSON.stringify({ password: datos.password })
        });
        if (!passResponse) return;
        const passResult = await passResponse.json();
        if (!passResponse.ok) throw new Error(passResult.error || "No se pudo actualizar la contraseña");
      }

      await Promise.all([cargarUsuarios(), cargarStats()]);
      cerrarPanelUsuario();
      setStatus(adminStatus, "Usuario actualizado correctamente.", "success");
    } else {
      createUserBtn.textContent = "Creando...";
      if (!datos.password) datos.password = "12345";
      const response = await fetchAuth("/api/admin/create-user", {
        method: "POST",
        body: JSON.stringify(datos)
      });
      if (!response) return;
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo crear el usuario");
      await Promise.all([cargarUsuarios(), cargarStats()]);
      cerrarPanelUsuario();
      setStatus(adminStatus, "Usuario creado correctamente.", "success");
    }
  } catch (error) {
    setStatus(adminStatus, error.message, "error");
  } finally {
    createUserBtn.disabled = false;
    createUserBtn.textContent = editando ? "Guardar cambios" : "Crear usuario";
  }
});

createUserForm.rol.addEventListener("change", actualizarCampoNivel);

toggleCreateUserBtn.addEventListener("click", () => {
  resetFormularioUsuario();
  abrirModalUsuario();
});

closeCreateUserBtn.addEventListener("click", cerrarPanelUsuario);
cancelEditUserBtn.addEventListener("click", cerrarPanelUsuario);
reloadUsersBtn.addEventListener("click", cargarUsuarios);

createUserCard.addEventListener("click", (event) => {
  if (event.target === createUserCard) cerrarPanelUsuario();
});

/* Biblioteca */

function formatearBytes(bytes) {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

async function cargarUsoStorage() {
  if (!storageMeterFill) return;
  try {
    const response = await fetchAuth("/api/admin/storage-usage");
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo calcular el espacio usado");

    const porcentaje = Math.min(100, (result.usedBytes / result.limitBytes) * 100);
    storageMeterFill.style.width = `${porcentaje}%`;
    storageMeterFill.classList.toggle("warn", porcentaje >= 70 && porcentaje < 90);
    storageMeterFill.classList.toggle("danger", porcentaje >= 90);
    storageMeterLabel.textContent =
      `${formatearBytes(result.usedBytes)} de ${formatearBytes(result.limitBytes)} usados (${porcentaje.toFixed(1)}%)`;
  } catch (error) {
    storageMeterLabel.textContent = "No se pudo calcular el espacio usado.";
  }
}

const EXT_IMAGEN = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
const EXT_ETIQUETAS = {
  pdf: "PDF", doc: "DOC", docx: "DOC", xls: "XLS", xlsx: "XLS",
  ppt: "PPT", pptx: "PPT", csv: "CSV", txt: "TXT", zip: "ZIP"
};

function extensionDeUrl(url) {
  const limpio = String(url || "").split("?")[0];
  const match = limpio.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

function renderPreviewDocumento(doc) {
  const ext = extensionDeUrl(doc.drive_url);
  if (EXT_IMAGEN.includes(ext)) {
    return `<div class="doc-preview"><img src="${escaparHTML(doc.drive_url)}" alt="" loading="lazy" /></div>`;
  }
  const etiqueta = EXT_ETIQUETAS[ext] || (ext ? ext.toUpperCase() : "LINK");
  return `<div class="doc-preview doc-preview-file"><span>${escaparHTML(etiqueta)}</span></div>`;
}

function renderDocumentos(lista) {
  if (docsCount) {
    docsCount.textContent = lista.length === documentosAdmin.length
      ? `${lista.length} documentos`
      : `${lista.length} de ${documentosAdmin.length} documentos`;
  }

  if (!lista.length) {
    adminDocumentsContainer.innerHTML = "<p class='muted'>No hay documentos que coincidan.</p>";
    return;
  }

  adminDocumentsContainer.innerHTML = "";

  lista.forEach((doc) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.innerHTML = `
      ${renderPreviewDocumento(doc)}
      <div class="user-info">
        <h3>${escaparHTML(doc.titulo)}</h3>
        <p>${escaparHTML(doc.descripcion) || "Sin descripción"}</p>
        <div class="meta">
          <span>${escaparHTML(doc.categoria)}</span>
          <span>${escaparHTML(doc.nivel)}</span>
          <span>${escaparHTML(doc.area)}</span>
          <span class="role">${escaparHTML(doc.rol_visible)}</span>
        </div>
        <p class="item-date">Subido: ${formatFecha(doc.created_at)}</p>
      </div>
      <div class="item-actions">
        <a class="open-link" href="${escaparHTML(doc.drive_url)}" target="_blank" rel="noopener noreferrer">Abrir</a>
        <button class="edit-btn" data-id="${escaparHTML(doc.id)}">Editar</button>
        <button class="delete-btn" data-id="${escaparHTML(doc.id)}">Borrar</button>
      </div>
    `;
    adminDocumentsContainer.appendChild(card);
  });

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", () => editarDocumento(button.dataset.id));
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await borrarDocumento(button.dataset.id);
    });
  });
}

async function cargarDocumentosAdmin() {
  try {
    adminDocumentsContainer.innerHTML = skeletonCards(3);
    if (docsCount) docsCount.textContent = "";

    const response = await fetchAuth("/api/library");
    if (!response) return;
    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Error al cargar documentos");

    documentosAdmin = Array.isArray(result) ? result : [];
    aplicarBusquedaDocumentos();
  } catch (error) {
    adminDocumentsContainer.innerHTML = `<p class="status error">${error.message}</p>`;
  }
}

function aplicarBusquedaDocumentos() {
  const query = documentSearch.value.toLowerCase().trim();
  const filtrados = documentosAdmin.filter((doc) => {
    const texto = `${doc.titulo} ${doc.descripcion} ${doc.categoria} ${doc.nivel} ${doc.area} ${doc.rol_visible}`.toLowerCase();
    return texto.includes(query);
  });
  renderDocumentos(filtrados);
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
  const doc = documentosAdmin.find((item) => item.id === id);
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
    await Promise.all([cargarDocumentosAdmin(), cargarStats(), cargarUsoStorage()]);
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

    await Promise.all([cargarDocumentosAdmin(), cargarStats(), cargarUsoStorage()]);
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

reloadDocumentsBtn.addEventListener("click", cargarDocumentosAdmin);
documentSearch.addEventListener("input", aplicarBusquedaDocumentos);

/* Comunicados */

async function cargarComunicados() {
  try {
    announcementsContainer.innerHTML = skeletonCards(2);
    if (commsCount) commsCount.textContent = "";

    const response = await fetchAuth("/api/announcements");
    if (!response) return;
    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Error al cargar comunicados");

    if (!result.length) {
      if (commsCount) commsCount.textContent = "(0)";
      announcementsContainer.innerHTML = "<p class='muted'>No hay comunicados publicados.</p>";
      return;
    }

    if (commsCount) commsCount.textContent = `(${result.length})`;
    announcementsContainer.innerHTML = "";

    result.forEach((item) => {
      const card = document.createElement("article");
      card.className = "item-card";
      card.innerHTML = `
        <div>
          <h3>${escaparHTML(item.titulo)}</h3>
          <p>${escaparHTML(item.contenido)}</p>
          <div class="meta">
            <span class="role">${escaparHTML(item.rol_visible)}</span>
            <span>${formatFecha(item.created_at)}</span>
          </div>
        </div>
        <div class="item-actions">
          <button class="delete-btn" data-id="${escaparHTML(item.id)}">Borrar</button>
        </div>
      `;
      announcementsContainer.appendChild(card);
    });

    announcementsContainer.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        await borrarComunicado(button.dataset.id);
      });
    });

  } catch (error) {
    announcementsContainer.innerHTML = `<p class="status error">${error.message}</p>`;
  }
}

async function borrarComunicado(id) {
  if (!confirm("¿Seguro que querés borrar este comunicado?")) return;
  try {
    const response = await fetchAuth(`/api/admin/announcements/${id}`, { method: "DELETE" });
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo borrar");
    await Promise.all([cargarComunicados(), cargarStats()]);
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
    await Promise.all([cargarComunicados(), cargarStats()]);
  } catch (error) {
    setStatus(announcementStatus, error.message, "error");
  } finally {
    createAnnouncementBtn.disabled = false;
    createAnnouncementBtn.textContent = "Publicar comunicado";
  }
});

reloadAnnouncementsBtn.addEventListener("click", cargarComunicados);

/* =============================================
   CLUB SANVI — Galería
============================================= */

/* Sub-tabs */
document.querySelectorAll(".cs-tab").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".cs-tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".cs-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("cs-panel-" + btn.dataset.tab).classList.add("active");
  });
});

/* Filter bar */
document.getElementById("csFilterBar")?.querySelectorAll(".cs-filter-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".cs-filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const disc = btn.dataset.disc;
    document.querySelectorAll(".cs-gallery-item").forEach(function (item) {
      item.style.display = (disc === "all" || item.dataset.disc === disc) ? "" : "none";
    });
  });
});

/* File picker label */
document.getElementById("csImageInput")?.addEventListener("change", function () {
  document.getElementById("csUploadText").textContent = this.files[0]?.name || "📷 Elegir imagen";
});

async function subirImagenStorage(file, carpeta) {
  if (!file.type.startsWith("image/")) throw new Error("Solo se aceptan archivos de imagen");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("carpeta", carpeta);
  const response = await fetchAuth("/api/admin/club-sanvi/upload-imagen", {
    method: "POST",
    body: formData
  });
  if (!response) throw new Error("No se pudo subir la imagen");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo subir la imagen");
  return result.url;
}

async function cargarGaleria() {
  const grid  = document.getElementById("csGaleriaGrid");
  const count = document.getElementById("csGaleriaCount");
  if (!grid) return;
  grid.innerHTML = skeletonCards(4).replace(/skeleton-card/g, "skeleton cs-skel");

  try {
    const response = await fetchAuth("/api/club-sanvi/galeria");
    if (!response) return;
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);

    count.textContent = `(${data.length})`;
    renderGaleriaGrid(data);
  } catch (e) {
    grid.innerHTML = `<p class="status error">${e.message}</p>`;
  }
}

function renderGaleriaGrid(items) {
  const grid = document.getElementById("csGaleriaGrid");
  const disc = document.querySelector(".cs-filter-btn.active")?.dataset.disc || "all";

  if (!items.length) {
    grid.innerHTML = "<p class='muted'>No hay fotos en la galería todavía. Subí la primera arriba.</p>";
    return;
  }

  grid.innerHTML = "";
  items.forEach(function (item) {
    const el = document.createElement("div");
    el.className = "cs-gallery-item";
    el.dataset.disc = item.disciplina;
    if (disc !== "all" && item.disciplina !== disc) el.style.display = "none";
    el.innerHTML = `
      <img src="${escaparHTML(item.url)}" alt="${escaparHTML(item.alt)}" loading="lazy">
      <span class="cs-gallery-badge">${escaparHTML(item.disciplina)}</span>
      <button class="cs-delete-btn" data-id="${escaparHTML(item.id)}" title="Eliminar">×</button>
    `;
    el.querySelector("img").addEventListener("click", function () {
      if (window.openCsPreview) window.openCsPreview(item);
    });
    el.querySelector(".cs-delete-btn").addEventListener("click", async function (e) {
      e.stopPropagation();
      await eliminarFotoGaleria(item.id);
    });
    grid.appendChild(el);
  });
}

async function eliminarFotoGaleria(id) {
  if (!confirm("¿Eliminar esta foto de la galería?")) return;
  try {
    const response = await fetchAuth(`/api/admin/club-sanvi/galeria/${id}`, { method: "DELETE" });
    const result   = await response.json();
    if (!response.ok) throw new Error(result.error);
    await cargarGaleria();
  } catch (e) {
    alert(e.message);
  }
}

document.getElementById("csGaleriaForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();
  const btn      = document.getElementById("csGaleriaBtn");
  const status   = document.getElementById("csGaleriaStatus");
  const file      = document.getElementById("csImageInput").files[0];
  const form      = new FormData(this);
  const disciplina = form.get("disciplina");
  const alt       = form.get("alt") || disciplina;

  if (!file)      return setStatus(status, "Seleccioná una imagen primero.", "error");
  if (!file.type.startsWith("image/")) return setStatus(status, "Seleccioná un archivo de imagen.", "error");
  if (!disciplina) return setStatus(status, "Seleccioná una disciplina.", "error");

  try {
    btn.disabled = true;
    btn.textContent = "Subiendo...";
    setStatus(status, "");

    const url = await subirImagenStorage(file, "galeria/" + disciplina);
    const response = await fetchAuth("/api/admin/club-sanvi/galeria", {
      method: "POST",
      body: JSON.stringify({ url, alt, disciplina })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);

    setStatus(status, "¡Foto agregada a la galería!", "success");
    this.reset();
    document.getElementById("csUploadText").textContent = "📷 Elegir imagen";
    await cargarGaleria();
  } catch (e) {
    setStatus(status, e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Subir foto";
  }
});

document.getElementById("csReloadGaleriaBtn")?.addEventListener("click", cargarGaleria);

/* =============================================
   CLUB SANVI — Disciplinas
============================================= */

async function cargarDisciplinasAdmin() {
  const container = document.getElementById("csDisciplinasContainer");
  if (!container) return;
  container.innerHTML = skeletonCards(4).replace(/skeleton-card/g, "skeleton cs-skel");

  try {
    const response = await fetchAuth("/api/club-sanvi/disciplinas");
    const data     = await response.json();
    if (!response.ok) throw new Error(data.error);

    if (!data.length) {
      container.innerHTML = "<p class='muted'>No hay disciplinas cargadas en la base de datos.</p>";
      return;
    }

    container.innerHTML = "";
    data.forEach(function (disc) {
      const card = document.createElement("div");
      card.className = "cs-disc-card";
      card.innerHTML = `
        <div class="cs-disc-photo">
          <img src="${escaparHTML(disc.foto_url || "")}" alt="${escaparHTML(disc.nombre)}"
               style="${disc.foto_url ? "" : "display:none"}">
          <label class="cs-disc-photo-overlay">
            📷
            <input type="file" accept="image/*" class="cs-disc-file" data-slug="${escaparHTML(disc.slug)}">
          </label>
        </div>
        <div class="cs-disc-form-inner">
          <span class="cs-disc-label">${escaparHTML(disc.nombre)}</span>
          <input type="text" class="cs-disc-nombre" placeholder="Nombre de la disciplina"
                 value="${escaparHTML(disc.nombre)}">
          <textarea class="cs-disc-desc" placeholder="Descripción">${escaparHTML(disc.descripcion || "")}</textarea>
          <p class="status cs-disc-status"></p>
          <button class="cs-disc-save" data-slug="${escaparHTML(disc.slug)}">Guardar cambios</button>
        </div>
      `;

      const img       = card.querySelector(".cs-disc-photo img");
      const fileInput = card.querySelector(".cs-disc-file");
      const saveBtn   = card.querySelector(".cs-disc-save");
      const statusEl  = card.querySelector(".cs-disc-status");

      fileInput.addEventListener("change", function () {
        if (!this.files[0]) return;
        const reader = new FileReader();
        reader.onload = (ev) => { img.src = ev.target.result; img.style.display = ""; };
        reader.readAsDataURL(this.files[0]);
      });

      saveBtn.addEventListener("click", async function () {
        const slug       = this.dataset.slug;
        const nombre     = card.querySelector(".cs-disc-nombre").value.trim();
        const descripcion = card.querySelector(".cs-disc-desc").value.trim();
        const file       = fileInput.files[0];

        if (!nombre) return setStatus(statusEl, "El nombre no puede estar vacío.", "error");

        try {
          saveBtn.disabled = true;
          saveBtn.textContent = "Guardando...";
          setStatus(statusEl, "");

          const updates = { nombre, descripcion };
          if (file) updates.foto_url = await subirImagenStorage(file, "disciplinas/" + slug);

          const response = await fetchAuth(`/api/admin/club-sanvi/disciplinas/${slug}`, {
            method: "PUT",
            body: JSON.stringify(updates)
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);

          setStatus(statusEl, "Guardado correctamente.", "success");
        } catch (e) {
          setStatus(statusEl, e.message, "error");
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = "Guardar cambios";
        }
      });

      container.appendChild(card);
    });
  } catch (e) {
    container.innerHTML = `<p class="status error">${e.message}</p>`;
  }
}

/* Preview modal Club Sanvi */
(function () {
  var modal = document.createElement("div");
  modal.id = "csPrevModal";
  modal.className = "cs-prev-modal";
  modal.innerHTML = `
    <div class="cs-prev-inner">
      <button class="cs-prev-close" id="csPrevClose">×</button>
      <img id="csPrevImg" src="" alt="">
      <div class="cs-prev-footer">
        <span class="cs-prev-disc" id="csPrevDisc"></span>
        <button class="cs-prev-del" id="csPrevDel">Eliminar foto</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  var csPrevCurrentId = null;

  window.openCsPreview = function (item) {
    document.getElementById("csPrevImg").src = item.url;
    document.getElementById("csPrevImg").alt = item.alt || "";
    document.getElementById("csPrevDisc").textContent = item.disciplina;
    csPrevCurrentId = item.id;
    modal.classList.add("open");
  };

  function closePrev() { modal.classList.remove("open"); }

  document.getElementById("csPrevClose").addEventListener("click", closePrev);
  modal.addEventListener("click", function (e) { if (e.target === modal) closePrev(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePrev(); });

  document.getElementById("csPrevDel").addEventListener("click", async function () {
    if (!csPrevCurrentId) return;
    closePrev();
    await eliminarFotoGaleria(csPrevCurrentId);
  });
})();

/* Tabs principales Edición Galería */
document.querySelectorAll(".eg-tab").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".eg-tab").forEach(function (b) { b.classList.remove("active"); });
    document.querySelectorAll(".eg-panel").forEach(function (p) { p.classList.remove("active"); });
    btn.classList.add("active");
    document.getElementById("eg-panel-" + btn.dataset.egTab).classList.add("active");
    if (btn.dataset.egTab === "club-sanvi") {
      cargarGaleria();
      cargarDisciplinasAdmin();
    } else {
      renderSvAccordion();
    }
  });
});

/* Cargar Edición Galería al activar la sección */
document.querySelector('[data-section="edicion-galeria"]')?.addEventListener("click", function () {
  var activo = document.querySelector(".eg-tab.active")?.dataset.egTab;
  if (!activo || activo === "club-sanvi") {
    cargarGaleria();
    cargarDisciplinasAdmin();
  } else {
    renderSvAccordion();
  }
});

/* =============================================
   SAN VICENTE — IMÁGENES ADMIN
============================================= */

var SV_SECCIONES = {
  hero: {
    label: "Hero — Carrusel del Inicio",
    desc: "Las 4 imágenes que rotan en el carrusel principal de la página de inicio.",
    slots: 4
  },
  inscripcion: {
    label: "Inicio — Fondo Inscripción 2027",
    desc: "La imagen de fondo de la sección 'Inscripción: Ciclo Lectivo 2027'. Se aplica como fondo de pantalla completa en la página de inicio.",
    slots: 1,
    bg: true
  },
  instalaciones: {
    label: "Inicio — Galería Instalaciones",
    desc: "Las 5 fotos que aparecen en la sección de instalaciones del instituto en la página de inicio.",
    slots: 5
  },
  inicios: {
    label: "Inicio — Galería Inicios 2014",
    desc: "Las 4 fotos históricas de la sección 'Nuestros Inicios 2014' en la página de inicio.",
    slots: 4
  },
  edificios: {
    label: "Instituto — Galería Edificios",
    desc: "Las 10 fotos de los edificios e instalaciones del campus que aparecen en la página del instituto.",
    slots: 10
  },
  kinder: {
    label: "Nivel Inicial — Slider",
    desc: "Las fotos del slider de Nivel Inicial (Kinder). Podés agregar o quitar (hasta 7).",
    slots: 4, dynamic: true, min: 1, max: 7
  },
  "kinder-foto": {
    label: "Nivel Inicial — Foto suelta",
    desc: "La foto de «Actividad artística» que aparece debajo del slider.",
    slots: 1
  },
  primario: {
    label: "Nivel Primario — Slider",
    desc: "Las fotos del slider de Nivel Primario. Podés agregar o quitar (hasta 7).",
    slots: 4, dynamic: true, min: 1, max: 7
  },
  "primario-foto": {
    label: "Nivel Primario — Foto suelta",
    desc: "La foto que aparece debajo del slider.",
    slots: 1
  },
  secundario: {
    label: "Nivel Secundario — Slider",
    desc: "Las fotos del slider de Nivel Secundario. Podés agregar o quitar (hasta 7).",
    slots: 3, dynamic: true, min: 1, max: 7
  },
  "secundario-foto": {
    label: "Nivel Secundario — Foto suelta",
    desc: "La foto que aparece debajo del slider.",
    slots: 1
  },
  academic: {
    label: "Academic Levels — Portadas",
    desc: "Las 3 imágenes de portada de las tarjetas de niveles en la página Academic Levels.",
    slots: 3,
    slotNames: ["Portada Kinder", "Portada Primario", "Portada Secundario"]
  },
  ingles: {
    label: "Inglés — Slider",
    desc: "Las fotos del slider principal de Inglés. Podés agregar o quitar (hasta 7).",
    slots: 3, dynamic: true, min: 1, max: 7
  },
  "ingles-foto": {
    label: "Inglés — Fotos sueltas",
    desc: "La foto de «Nuestra propuesta» y la de «Inmersión en Inglaterra».",
    slots: 2,
    slotNames: ["Foto «Nuestra propuesta»", "Foto «Inmersión en Inglaterra»"]
  }
};

var SV_GRUPOS = [
  { label: "Inicio",             secciones: ["hero", "inscripcion", "instalaciones", "inicios"] },
  { label: "Instituto",          secciones: ["edificios"] },
  { label: "Niveles Académicos", secciones: ["kinder", "kinder-foto", "primario", "primario-foto", "secundario", "secundario-foto", "academic"] },
  { label: "Inglés",             secciones: ["ingles", "ingles-foto"] }
];

function renderSvAccordion() {
  var container = document.getElementById("svAccordion");
  if (!container) return;

  var html = "";
  SV_GRUPOS.forEach(function (grupo) {
    html += "<div class='sv-acc-group'>";
    html += "<p class='sv-acc-group-label'>" + grupo.label + "</p>";

    grupo.secciones.forEach(function (key) {
      var cfg = SV_SECCIONES[key];
      html += "<div class='sv-acc-item' data-seccion='" + key + "'>";
      html += "<button class='sv-acc-trigger' aria-expanded='false'>";
      html += "<div class='sv-acc-trigger-main'>";
      html += "<strong class='sv-acc-name'>" + cfg.label + "</strong>";
      html += "<span class='sv-acc-badge'>" + cfg.slots + (cfg.slots === 1 ? " foto" : " fotos") + "</span>";
      html += "</div>";
      html += "<span class='sv-acc-arrow'></span>";
      html += "</button>";
      html += "<div class='sv-acc-body' hidden>";
      html += "<p class='sv-acc-desc'>" + cfg.desc + "</p>";
      html += "<div class='sv-acc-slots' id='sv-slots-" + key + "'></div>";
      html += "</div>";
      html += "</div>";
    });

    html += "</div>";
  });

  container.innerHTML = html;

  container.querySelectorAll(".sv-acc-trigger").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = this.closest(".sv-acc-item");
      var body = item.querySelector(".sv-acc-body");
      var isOpen = this.getAttribute("aria-expanded") === "true";

      if (isOpen) {
        this.setAttribute("aria-expanded", "false");
        body.hidden = true;
      } else {
        this.setAttribute("aria-expanded", "true");
        body.hidden = false;
        if (!item.dataset.loaded) {
          item.dataset.loaded = "1";
          cargarSvSeccion(item.dataset.seccion, item.querySelector(".sv-acc-slots"));
        }
      }
    });
  });
}

async function cargarSvSeccion(seccion, container) {
  if (!container) container = document.getElementById("sv-slots-" + seccion);
  if (!container) return;
  container.innerHTML = skeletonCards(Math.min(SV_SECCIONES[seccion]?.slots || 4, 6)).replace(/skeleton-card/g, "skeleton sv-skel");
  try {
    var response = await fetchAuth("/api/sv/imagenes/" + seccion);
    if (!response) return;
    var data = await response.json();
    if (!response.ok) throw new Error(data.error);
    renderSvGrid(seccion, data, container);
  } catch (e) {
    container.innerHTML = "<p class='status error'>" + e.message + "</p>";
  }
}

function renderSvGrid(seccion, items, container) {
  if (!container) container = document.getElementById("sv-slots-" + seccion);
  var config = SV_SECCIONES[seccion];
  items = (items || []).slice().sort(function (a, b) { return a.slot - b.slot; });

  var html = "<div class='sv-slots-grid'>";

  if (config.dynamic) {
    var min = config.min || 1;
    var max = config.max || 7;
    var puedeQuitar = items.length > min;
    items.forEach(function (item, i) {
      var imgSrc = escaparHTML(item.url || "");
      var label = "Imagen " + (i + 1);
      html += "<div class='sv-slot-card' data-seccion='" + seccion + "' data-slot='" + item.slot + "'>" +
        "<div class='sv-slot-img'>" +
        (imgSrc ? "<img src='" + imgSrc + "' alt='" + label + "'>" : "<div class='sv-slot-empty'>Sin imagen</div>") +
        "</div>" +
        "<div class='sv-slot-footer'>" +
        "<span class='sv-slot-label'>" + label + "</span>" +
        "<span class='sv-slot-actions'>" +
        "<label class='sv-slot-btn'>Cambiar<input type='file' accept='image/*' class='sv-file-input' data-seccion='" + seccion + "' data-slot='" + item.slot + "'></label>" +
        (puedeQuitar ? "<button type='button' class='sv-slot-del' data-seccion='" + seccion + "' data-slot='" + item.slot + "'>✕ Quitar</button>" : "") +
        "</span>" +
        "</div>" +
        "<p class='sv-slot-status status'></p>" +
        "</div>";
    });
    if (items.length < max) {
      html += "<div class='sv-slot-card sv-slot-add'>" +
        "<label class='sv-slot-addbox'>" +
        "<span class='sv-slot-addplus'>+</span>" +
        "<span>Agregar imagen</span>" +
        "<input type='file' accept='image/*' class='sv-file-add' data-seccion='" + seccion + "'>" +
        "</label>" +
        "<p class='sv-slot-status status'></p>" +
        "</div>";
    }
  } else {
    var bySlot = {};
    items.forEach(function (item) { bySlot[item.slot] = item; });
    for (var s = 1; s <= config.slots; s++) {
      var item = bySlot[s];
      var imgSrc = item ? escaparHTML(item.url) : "";
      var slotLabel = config.slotNames ? config.slotNames[s - 1] : "Foto " + s;
      html += "<div class='sv-slot-card' data-seccion='" + seccion + "' data-slot='" + s + "'>" +
        "<div class='sv-slot-img'>" +
        (imgSrc ? "<img src='" + imgSrc + "' alt='" + slotLabel + "'>" : "<div class='sv-slot-empty'>Sin imagen</div>") +
        "</div>" +
        "<div class='sv-slot-footer'>" +
        "<span class='sv-slot-label'>" + slotLabel + "</span>" +
        "<label class='sv-slot-btn'>Cambiar<input type='file' accept='image/*' class='sv-file-input' data-seccion='" + seccion + "' data-slot='" + s + "'></label>" +
        "</div>" +
        "<p class='sv-slot-status status'></p>" +
        "</div>";
    }
  }

  html += "</div>";
  container.innerHTML = html;

  container.querySelectorAll(".sv-file-input").forEach(function (input) {
    input.addEventListener("change", async function () {
      if (!this.files[0]) return;
      await svReemplazarImagen(this.dataset.seccion, parseInt(this.dataset.slot), this.files[0], this.closest(".sv-slot-card"));
    });
  });
  container.querySelectorAll(".sv-file-add").forEach(function (input) {
    input.addEventListener("change", async function () {
      if (!this.files[0]) return;
      await svAgregarImagen(this.dataset.seccion, this.files[0], this.closest(".sv-slot-card"), container);
    });
  });
  container.querySelectorAll(".sv-slot-del").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      await svQuitarImagen(this.dataset.seccion, parseInt(this.dataset.slot), this.closest(".sv-slot-card"), container);
    });
  });
}

// Alta: sube la imagen y la guarda como último slot (respeta el tope del backend)
async function svAgregarImagen(seccion, file, card, container) {
  var status = card.querySelector(".sv-slot-status");
  setStatus(status, "Subiendo...", "");
  try {
    var url = await subirImagenStorage(file, "sv/" + seccion);
    if (!url) throw new Error("No se pudo subir la imagen");
    var actuales = container.querySelectorAll(".sv-slot-card[data-slot]").length;
    var response = await fetchAuth("/api/admin/sv/imagenes/" + seccion + "/" + (actuales + 1), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url, alt: file.name })
    });
    var result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await cargarSvSeccion(seccion, container);
  } catch (e) {
    setStatus(status, e.message, "error");
  }
}

// Baja: borra la imagen (el backend renumera los slots siguientes)
async function svQuitarImagen(seccion, slot, card, container) {
  if (!confirm("¿Quitar esta imagen?")) return;
  var status = card.querySelector(".sv-slot-status");
  setStatus(status, "Quitando...", "");
  try {
    var response = await fetchAuth("/api/admin/sv/imagenes/" + seccion + "/" + slot, { method: "DELETE" });
    var result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await cargarSvSeccion(seccion, container);
  } catch (e) {
    setStatus(status, e.message, "error");
  }
}

async function svReemplazarImagen(seccion, slot, file, card) {
  var status = card.querySelector(".sv-slot-status");
  setStatus(status, "Subiendo...", "");
  try {
    var url = await subirImagenStorage(file, "sv/" + seccion);
    if (!url) throw new Error("No se pudo subir la imagen");
    var response = await fetchAuth("/api/admin/sv/imagenes/" + seccion + "/" + slot, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url, alt: file.name })
    });
    var result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setStatus(status, "Imagen actualizada", "success");
    var img = card.querySelector("img");
    if (img) {
      img.src = url;
    } else {
      card.querySelector(".sv-slot-img").innerHTML = "<img src='" + escaparHTML(url) + "' alt='Slot " + slot + "'>";
    }
  } catch (e) {
    setStatus(status, e.message, "error");
  }
}


/* Verificar rol admin */

async function verificarAdmin() {
  const response = await fetchAuth("/api/me");
  if (!response) return;
  const result = await response.json();
  if (!response.ok || result.profile?.rol !== "admin") {
    window.location.href = "login.html";
  }
}

/* Inicio */

async function iniciarAdmin() {
  await verificarAdmin();
  await Promise.all([
    cargarStats(),
    cargarUsuarios(),
    cargarDocumentosAdmin(),
    cargarComunicados(),
    cargarUsoStorage()
  ]);
}

iniciarAdmin();
