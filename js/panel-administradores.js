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
const usersContainer = document.getElementById("usersContainer");
const usersCount = document.getElementById("usersCount");
const adminStatus = document.getElementById("adminStatus");
const createUserBtn = document.getElementById("createUserBtn");
const reloadUsersBtn = document.getElementById("reloadUsersBtn");

const createDocumentForm = document.getElementById("createDocumentForm");
const documentFormTitle = document.getElementById("documentFormTitle");
const documentId = document.getElementById("documentId");
const documentStatus = document.getElementById("documentStatus");
const createDocumentBtn = document.getElementById("createDocumentBtn");
const cancelEditDocumentBtn = document.getElementById("cancelEditDocumentBtn");
const reloadDocumentsBtn = document.getElementById("reloadDocumentsBtn");
const adminDocumentsContainer = document.getElementById("adminDocumentsContainer");
const documentSearch = document.getElementById("documentSearch");
const docsCount = document.getElementById("docsCount");

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
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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

async function cargarUsuarios() {
  try {
    usersContainer.innerHTML = skeletonCards(3);
    usersCount.textContent = "";

    const response = await fetchAuth("/api/admin/users");
    if (!response) return;
    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Error al cargar usuarios");

    if (!result.length) {
      usersContainer.innerHTML = "<p class='muted'>No hay usuarios creados todavía.</p>";
      return;
    }

    usersCount.textContent = `(${result.length})`;
    usersContainer.innerHTML = "";

    result.forEach((user) => {
      const card = document.createElement("article");
      card.className = "item-card";
      card.innerHTML = `
        <div>
          <h3>${escaparHTML(user.nombre) || "Sin nombre"} ${escaparHTML(user.apellido)}</h3>
          <p>${escaparHTML(user.email) || "Sin email"}</p>
          <div class="meta">
            <span class="role">${escaparHTML(user.rol) || "sin rol"}</span>
            <span>${escaparHTML(user.nivel) || "General"}</span>
            <span>${escaparHTML(user.area) || "Sin área"}</span>
            <span>${escaparHTML(user.cargo) || "Sin cargo"}</span>
          </div>
          <p class="item-date">Alta: ${formatFecha(user.created_at)}</p>
        </div>
        <div class="item-actions">
          <button class="delete-btn" data-id="${escaparHTML(user.id)}">Borrar</button>
        </div>
      `;
      usersContainer.appendChild(card);
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

async function borrarUsuario(id) {
  if (!confirm("¿Seguro que querés borrar este usuario?")) return;
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
  try {
    createUserBtn.disabled = true;
    createUserBtn.textContent = "Creando...";
    setStatus(adminStatus, "");
    const response = await fetchAuth("/api/admin/create-user", {
      method: "POST",
      body: JSON.stringify(datos)
    });
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo crear el usuario");
    setStatus(adminStatus, "Usuario creado correctamente.", "success");
    createUserForm.reset();
    await Promise.all([cargarUsuarios(), cargarStats()]);
  } catch (error) {
    setStatus(adminStatus, error.message, "error");
  } finally {
    createUserBtn.disabled = false;
    createUserBtn.textContent = "Crear usuario";
  }
});

reloadUsersBtn.addEventListener("click", cargarUsuarios);

/* Biblioteca */

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
      <div>
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

function editarDocumento(id) {
  const doc = documentosAdmin.find((item) => item.id === id);
  if (!doc) return;
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

function cancelarEdicionDocumento() {
  documentFormTitle.textContent = "Cargar documento";
  documentId.value = "";
  createDocumentForm.reset();
  cancelEditDocumentBtn.classList.add("hidden");
  setStatus(documentStatus, "");
}

async function borrarDocumento(id) {
  if (!confirm("¿Seguro que querés borrar este documento?")) return;
  try {
    const response = await fetchAuth(`/api/admin/library/${id}`, { method: "DELETE" });
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo borrar");
    await Promise.all([cargarDocumentosAdmin(), cargarStats()]);
  } catch (error) {
    alert(error.message);
  }
}

createDocumentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const datos = Object.fromEntries(new FormData(createDocumentForm).entries());
  const editando = Boolean(datos.id);
  try {
    createDocumentBtn.disabled = true;
    createDocumentBtn.textContent = editando ? "Guardando..." : "Cargando...";
    setStatus(documentStatus, "");
    const response = await fetchAuth(
      editando ? `/api/admin/library/${datos.id}` : "/api/admin/library",
      { method: editando ? "PATCH" : "POST", body: JSON.stringify(datos) }
    );
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo guardar el documento");
    setStatus(documentStatus, editando ? "Documento editado correctamente." : "Documento cargado correctamente.", "success");
    cancelarEdicionDocumento();
    await Promise.all([cargarDocumentosAdmin(), cargarStats()]);
  } catch (error) {
    setStatus(documentStatus, error.message, "error");
  } finally {
    createDocumentBtn.disabled = false;
    createDocumentBtn.textContent = "Guardar documento";
  }
});

cancelEditDocumentBtn.addEventListener("click", cancelarEdicionDocumento);
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
  const ext  = file.name.split(".").pop();
  const path = `${carpeta}/${Date.now()}.${ext}`;
  const { error } = await window.supabaseClient.storage
    .from("club-sanvi")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error("Storage: " + error.message);
  const { data } = window.supabaseClient.storage.from("club-sanvi").getPublicUrl(path);
  return data.publicUrl;
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

/* Cargar Club Sanvi al activar la sección */
document.querySelector('[data-section="club-sanvi"]')?.addEventListener("click", function () {
  cargarGaleria();
  cargarDisciplinasAdmin();
});

/* =============================================
   SAN VICENTE — IMÁGENES ADMIN
============================================= */

var SV_SECCIONES = {
  hero:          { label: "Hero (Inicio)",  slots: 4 },
  instalaciones: { label: "Instalaciones", slots: 5 },
  inicios:       { label: "Inicios 2014",  slots: 4 },
  edificios:     { label: "Edificios",     slots: 9 },
  kinder:        { label: "Kinder",        slots: 5 },
  primario:      { label: "Primario",      slots: 5 },
  secundario:    { label: "Secundario",    slots: 4 }
};

var svSeccionActiva = "hero";

document.getElementById("svTabs")?.querySelectorAll(".sv-tab").forEach(function (btn) {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".sv-tab").forEach(function (b) { b.classList.remove("active"); });
    btn.classList.add("active");
    svSeccionActiva = btn.dataset.svTab;
    cargarSvSeccion(svSeccionActiva);
  });
});

async function cargarSvSeccion(seccion) {
  var container = document.getElementById("svGaleriaContainer");
  if (!container) return;
  container.innerHTML = skeletonCards(4).replace(/skeleton-card/g, "skeleton sv-skel");
  try {
    var response = await fetchAuth("/api/sv/imagenes/" + seccion);
    if (!response) return;
    var data = await response.json();
    if (!response.ok) throw new Error(data.error);
    renderSvGrid(seccion, data);
  } catch (e) {
    container.innerHTML = "<p class='status error'>" + e.message + "</p>";
  }
}

function renderSvGrid(seccion, items) {
  var container = document.getElementById("svGaleriaContainer");
  var config = SV_SECCIONES[seccion];
  var bySlot = {};
  items.forEach(function (item) { bySlot[item.slot] = item; });

  var html = "<div class='sv-slots-grid'>";
  for (var s = 1; s <= config.slots; s++) {
    var item = bySlot[s];
    var imgSrc = item ? escaparHTML(item.url) : "";
    html += "<div class='sv-slot-card' data-seccion='" + seccion + "' data-slot='" + s + "'>" +
      "<div class='sv-slot-img'>" +
      (imgSrc ? "<img src='" + imgSrc + "' alt='Slot " + s + "'>" : "<div class='sv-slot-empty'>Sin imagen</div>") +
      "</div>" +
      "<div class='sv-slot-footer'>" +
      "<span class='sv-slot-label'>Slot " + s + "</span>" +
      "<label class='sv-slot-btn'>Cambiar<input type='file' accept='image/*' class='sv-file-input' data-seccion='" + seccion + "' data-slot='" + s + "'></label>" +
      "</div>" +
      "<p class='sv-slot-status status'></p>" +
      "</div>";
  }
  html += "</div>";
  container.innerHTML = html;

  container.querySelectorAll(".sv-file-input").forEach(function (input) {
    input.addEventListener("change", async function () {
      if (!this.files[0]) return;
      await svReemplazarImagen(this.dataset.seccion, parseInt(this.dataset.slot), this.files[0], this.closest(".sv-slot-card"));
    });
  });
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

document.querySelector("[data-section='san-vicente']")?.addEventListener("click", function () {
  cargarSvSeccion(svSeccionActiva);
});

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
    cargarComunicados()
  ]);
}

iniciarAdmin();
