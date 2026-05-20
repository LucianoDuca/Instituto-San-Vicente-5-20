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

const createAnnouncementForm = document.getElementById("createAnnouncementForm");
const announcementStatus = document.getElementById("announcementStatus");
const createAnnouncementBtn = document.getElementById("createAnnouncementBtn");
const reloadAnnouncementsBtn = document.getElementById("reloadAnnouncementsBtn");
const announcementsContainer = document.getElementById("announcementsContainer");

let documentosAdmin = [];

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.className = `status ${type}`;
}

function formatDate(date) {
  if (!date) return "Sin fecha";
  return new Date(date).toLocaleString("es-AR");
}

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

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
}

/* Navegación */

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const sectionName = button.dataset.section;

    navButtons.forEach((btn) => btn.classList.remove("active"));
    sections.forEach((section) => section.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(sectionName).classList.add("active");

    sectionTitle.textContent = button.textContent;
  });
});

/* Logout */

logoutBtn.addEventListener("click", async () => {
  await window.supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

/* Stats */

async function cargarStats() {
  try {
    const response = await fetchAuth("/api/admin/stats");
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
    usersContainer.innerHTML = "<p class='muted'>Cargando usuarios...</p>";

    const response = await fetchAuth("/api/admin/users");
    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Error al cargar usuarios");

    if (!result.length) {
      usersContainer.innerHTML = "<p class='muted'>No hay usuarios creados todavía.</p>";
      return;
    }

    usersContainer.innerHTML = "";

    result.forEach((user) => {
      const card = document.createElement("article");
      card.className = "item-card";

      card.innerHTML = `
        <div>
          <h3>${user.nombre || "Sin nombre"} ${user.apellido || ""}</h3>
          <p>${user.email || "Sin email"}</p>

          <div class="meta">
            <span class="role">${user.rol || "sin rol"}</span>
            <span>${user.nivel || "General"}</span>
            <span>${user.area || "Sin área"}</span>
            <span>${user.cargo || "Sin cargo"}</span>
          </div>
        </div>

        <div class="item-actions">
          <button class="delete-btn" data-id="${user.id}">Borrar</button>
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
    const response = await fetchAuth(`/api/admin/users/${id}`, {
      method: "DELETE"
    });

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
  if (!lista.length) {
    adminDocumentsContainer.innerHTML = "<p class='muted'>No hay documentos cargados.</p>";
    return;
  }

  adminDocumentsContainer.innerHTML = "";

  lista.forEach((doc) => {
    const card = document.createElement("article");
    card.className = "item-card";

    card.innerHTML = `
      <div>
        <h3>${doc.titulo}</h3>
        <p>${doc.descripcion || "Sin descripción"}</p>

        <div class="meta">
          <span>${doc.categoria}</span>
          <span>${doc.nivel}</span>
          <span>${doc.area}</span>
          <span class="role">${doc.rol_visible}</span>
        </div>
      </div>

      <div class="item-actions">
        <a class="open-link" href="${doc.drive_url}" target="_blank" rel="noopener noreferrer">Abrir</a>
        <button class="edit-btn" data-id="${doc.id}">Editar</button>
        <button class="delete-btn" data-id="${doc.id}">Borrar</button>
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
    adminDocumentsContainer.innerHTML = "<p class='muted'>Cargando documentos...</p>";

    const response = await fetchAuth("/api/library");
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
    const texto = `
      ${doc.titulo}
      ${doc.descripcion}
      ${doc.categoria}
      ${doc.nivel}
      ${doc.area}
      ${doc.rol_visible}
    `.toLowerCase();

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
    const response = await fetchAuth(`/api/admin/library/${id}`, {
      method: "DELETE"
    });

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
      {
        method: editando ? "PATCH" : "POST",
        body: JSON.stringify(datos)
      }
    );

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
    announcementsContainer.innerHTML = "<p class='muted'>Cargando comunicados...</p>";

    const response = await fetchAuth("/api/announcements");
    const result = await response.json();

    if (!response.ok) throw new Error(result.error || "Error al cargar comunicados");

    if (!result.length) {
      announcementsContainer.innerHTML = "<p class='muted'>No hay comunicados publicados.</p>";
      return;
    }

    announcementsContainer.innerHTML = "";

    result.forEach((item) => {
      const card = document.createElement("article");
      card.className = "item-card";

      card.innerHTML = `
        <div>
          <h3>${item.titulo}</h3>
          <p>${item.contenido}</p>

          <div class="meta">
            <span class="role">${item.rol_visible}</span>
            <span>${formatDate(item.created_at)}</span>
          </div>
        </div>

        <div class="item-actions">
          <button class="delete-btn" data-id="${item.id}">Borrar</button>
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
    const response = await fetchAuth(`/api/admin/announcements/${id}`, {
      method: "DELETE"
    });

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

/* Inicio */

async function iniciarAdmin() {
  await Promise.all([
    cargarStats(),
    cargarUsuarios(),
    cargarDocumentosAdmin(),
    cargarComunicados()
  ]);
}

iniciarAdmin();