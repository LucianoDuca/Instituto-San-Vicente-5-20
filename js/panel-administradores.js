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
