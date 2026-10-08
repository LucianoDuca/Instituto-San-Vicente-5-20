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

    if (sectionName === "libretas") {
      window.LibretasUI.mount(document.getElementById("libretasRoot"), {
        fetchAuth,
        perfil: { rol: "admin", nivel: "General" }
      });
    }

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

    const cantidadAdmins = usuariosAdmin.filter((u) => u.rol === "admin").length;

    usuariosAdmin.forEach((user) => {
      const esUnicoAdmin = user.rol === "admin" && cantidadAdmins <= 1;

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
          ${user.rol === "docente" ? `<button class="mat-btn" data-id="${escaparHTML(user.id)}">Materias</button>` : ""}
          <button class="edit-btn" data-id="${escaparHTML(user.id)}">Editar</button>
          ${esUnicoAdmin
            ? `<button class="delete-btn" disabled title="Es el único administrador del sistema, no se puede eliminar.">Borrar</button>`
            : `<button class="delete-btn" data-id="${escaparHTML(user.id)}">Borrar</button>`}
        </div>
      `;
      usersContainer.appendChild(card);
    });

    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", () => {
        editarUsuario(button.dataset.id);
      });
    });

    document.querySelectorAll(".mat-btn").forEach((button) => {
      button.addEventListener("click", () => abrirAsignaciones(button.dataset.id));
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

/* Ventanas flotantes del panel */

function abrirModalAdmin(html, claseExtra) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay open";
  overlay.innerHTML = `<div class="modal-box ${claseExtra || ""}" role="dialog" aria-modal="true">
    <button type="button" class="modal-close" data-cerrar aria-label="Cerrar">✕</button>${html}</div>`;
  const cerrar = () => {
    overlay.remove();
    document.removeEventListener("keydown", tecla);
  };
  const tecla = (e) => { if (e.key === "Escape") cerrar(); };
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) cerrar(); });
  overlay.addEventListener("click", (e) => { if (e.target.closest("[data-cerrar]")) cerrar(); });
  document.addEventListener("keydown", tecla);
  document.body.appendChild(overlay);
  return { overlay, cerrar, box: overlay.querySelector(".modal-box") };
}

/* Materias asignadas a cada docente */

async function abrirAsignaciones(id) {
  const user = usuariosAdmin.find((u) => u.id === id);
  if (!user) return;
  const core = window.LibretasCore;
  const nivel = user.nivel;
  if (!["Inicial", "Primario", "Secundario"].includes(nivel)) {
    alert("Primero elegí el nivel de este docente (botón Editar) y después asignale sus materias.");
    return;
  }

  let seleccion = new Set();
  try {
    const response = await fetchAuth(`/api/admin/libretas/asignaciones/${id}`);
    if (!response) return;
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudieron cargar las materias");
    seleccion = new Set(result.asignaciones.map((a) => `${a.curso}|${a.clave}`));
  } catch (error) {
    alert(/lib_asignaciones|schema cache/i.test(error.message)
      ? "Falta crear la tabla de asignaciones en Supabase (ejecutar supabase/libretas.sql)."
      : error.message);
    return;
  }

  const cursos = core.nivelDe(nivel).cursos;
  const validas = new Map(cursos.map((c) => [c.id, new Set()]));
  const filas = new Map();
  cursos.forEach((c) => {
    core.planillasDe(nivel, c.id).forEach((cat) => {
      cat.hojas.forEach((hoja) => {
        validas.get(c.id).add(hoja.clave);
        const k = `${cat.id}|${hoja.clave}`;
        if (!filas.has(k)) filas.set(k, { cat: cat.label, catId: cat.id, clave: hoja.clave, label: hoja.label });
      });
    });
  });
  const grupos = [];
  filas.forEach((f) => {
    let g = grupos.find((x) => x.id === f.catId);
    if (!g) { g = { id: f.catId, label: f.cat, filas: [] }; grupos.push(g); }
    g.filas.push(f);
  });

  const nombre = `${escaparHTML(user.nombre)} ${escaparHTML(user.apellido)}`.trim();
  const cabecera = cursos.map((c) => `<th><button type="button" class="mat-col" data-col="${c.id}" title="Marcar o desmarcar todo ${escaparHTML(c.label)}">${escaparHTML(c.label)}</button></th>`).join("");
  const cuerpo = grupos.map((g) => `
    <tr class="mat-grupo"><td colspan="${cursos.length + 1}">${escaparHTML(g.label)}</td></tr>
    ${g.filas.map((f) => `<tr>
      <td class="mat-nombre"><button type="button" class="mat-fila" data-clave="${escaparHTML(f.clave)}" title="Marcar o desmarcar en todos los cursos">${escaparHTML(f.label)}</button></td>
      ${cursos.map((c) => validas.get(c.id).has(f.clave)
        ? `<td><input type="checkbox" data-curso="${c.id}" data-clave="${escaparHTML(f.clave)}"${seleccion.has(`${c.id}|${f.clave}`) ? " checked" : ""} aria-label="${escaparHTML(f.label)} en ${escaparHTML(c.label)}"></td>`
        : `<td class="mat-na">·</td>`).join("")}
    </tr>`).join("")}`).join("");

  const { overlay, cerrar, box } = abrirModalAdmin(`
    <h2>Materias de ${nombre}</h2>
    <p class="muted">Nivel ${escaparHTML(nivel)}. Marcá en qué cursos da cada materia: solo esas planillas le van a aparecer para cargar notas. Tocá el nombre de un curso o de una materia para marcar toda la columna o toda la fila.</p>
    <div class="mat-tabla-wrap"><table class="mat-tabla"><thead><tr><th>Materia</th>${cabecera}</tr></thead><tbody>${cuerpo}</tbody></table></div>
    <p class="status" id="matStatus"></p>
    <div class="form-actions mat-acciones">
      <span class="mat-contador" id="matContador"></span>
      <button type="button" class="secondary" data-cerrar>Cancelar</button>
      <button type="button" id="matGuardar">Guardar materias</button>
    </div>`, "ancho");

  const cajas = () => [...box.querySelectorAll("input[type=checkbox][data-curso]")];
  const contar = () => {
    const n = cajas().filter((c) => c.checked).length;
    box.querySelector("#matContador").textContent = `${n} materia${n === 1 ? "" : "s"} asignada${n === 1 ? "" : "s"}`;
  };
  const alternar = (lista) => {
    const marcar = lista.some((c) => !c.checked);
    lista.forEach((c) => (c.checked = marcar));
    contar();
  };
  box.addEventListener("change", contar);
  box.addEventListener("click", (e) => {
    const col = e.target.closest("[data-col]");
    if (col) alternar(cajas().filter((c) => c.dataset.curso === col.dataset.col));
    const fila = e.target.closest(".mat-fila");
    if (fila) alternar(cajas().filter((c) => c.dataset.clave === fila.dataset.clave));
  });
  contar();

  box.querySelector("#matGuardar").addEventListener("click", async (e) => {
    const estado = box.querySelector("#matStatus");
    const asignaciones = cajas().filter((c) => c.checked).map((c) => ({ curso: c.dataset.curso, clave: c.dataset.clave }));
    e.target.disabled = true;
    setStatus(estado, "Guardando...");
    try {
      const response = await fetchAuth(`/api/admin/libretas/asignaciones/${id}`, {
        method: "PUT",
        body: JSON.stringify({ asignaciones })
      });
      if (!response) return;
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron guardar las materias");
      cerrar();
      alert(`Listo: ${nombre} tiene ${result.total} materia${result.total === 1 ? "" : "s"} asignada${result.total === 1 ? "" : "s"}.`);
    } catch (error) {
      e.target.disabled = false;
      setStatus(estado, error.message, "error");
    }
  });
}

/* Alta masiva de usuarios */

const NIVEL_ALIAS = { inicial: "Inicial", jardin: "Inicial", kinder: "Inicial", primario: "Primario", primaria: "Primario", secundario: "Secundario", secundaria: "Secundario" };
const ROL_ALIAS = { docente: "docente", profe: "docente", profesor: "docente", profesora: "docente", maestra: "docente", maestro: "docente", directivo: "directivo", directiva: "directivo", directora: "directivo", director: "directivo" };

function sinTildes(t) {
  return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function parsearUsuarios(texto, opciones) {
  return texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((linea) => {
    const sep = linea.includes("\t") ? "\t" : linea.includes(";") ? ";" : ",";
    const p = linea.split(sep).map((x) => x.trim());
    let nombre = p[0] || "";
    let apellido = p[1] || "";
    if (opciones.apellidoPrimero) [nombre, apellido] = [apellido, nombre];
    const rol = p[2] ? ROL_ALIAS[sinTildes(p[2])] : opciones.rol;
    const nivelTexto = p[3] ? NIVEL_ALIAS[sinTildes(p[3])] : opciones.nivel;
    const nivel = rol === "docente" ? nivelTexto || "" : "";
    let error = "";
    if (!nombre || !apellido) error = "Falta nombre o apellido";
    else if (!rol) error = "Rol no reconocido (usá docente o directivo)";
    else if (rol === "docente" && !nivel) error = "Falta el nivel del docente";
    return { nombre, apellido, rol: rol || "", nivel, error };
  });
}

function csvDeResultados(resultados) {
  const celda = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const filas = [["Nombre", "Apellido", "Rol", "Nivel", "Usuario", "Contraseña temporal", "Estado"]]
    .concat(resultados.map((r) => [r.nombre, r.apellido, ROL_ETIQUETAS[r.rol] || r.rol, r.nivel, r.email || "", r.password || "", r.ok ? "Creado" : r.error]));
  return "\ufeff" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
}

function abrirAltaMasiva() {
  const { box, cerrar } = abrirModalAdmin(`
    <h2>Crear varios usuarios</h2>
    <p class="muted">Pegá una lista (podés copiarla desde Excel): una persona por línea con <b>Nombre</b> y <b>Apellido</b>. Opcionalmente, rol y nivel en las columnas siguientes. A cada uno se le genera su usuario y una contraseña temporal que debe cambiar al ingresar.</p>
    <div class="bulk-opciones">
      <label>Rol por defecto
        <select id="bulkRol"><option value="docente">Docente</option><option value="directivo">Directivo</option></select>
      </label>
      <label>Nivel por defecto (docentes)
        <select id="bulkNivel"><option value="">— Elegir —</option><option value="Inicial">Inicial</option><option value="Primario">Primario</option><option value="Secundario">Secundario</option></select>
      </label>
      <label class="bulk-check"><input type="checkbox" id="bulkOrden"> Mi lista viene como Apellido, Nombre</label>
    </div>
    <textarea id="bulkTexto" class="bulk-texto" placeholder="María&#9;González&#10;Laura&#9;Pérez&#9;docente&#9;Primario&#10;Ana&#9;Suárez&#9;directivo"></textarea>
    <div id="bulkPrevia"></div>
    <p class="status" id="bulkStatus"></p>
    <div class="form-actions mat-acciones">
      <span class="mat-contador" id="bulkContador"></span>
      <button type="button" class="secondary" data-cerrar>Cancelar</button>
      <button type="button" id="bulkCrear" disabled>Crear usuarios</button>
    </div>`, "ancho");

  const q = (s) => box.querySelector(s);
  let lista = [];

  const repintar = () => {
    lista = parsearUsuarios(q("#bulkTexto").value, { rol: q("#bulkRol").value, nivel: q("#bulkNivel").value, apellidoPrimero: q("#bulkOrden").checked });
    const errores = lista.filter((l) => l.error).length;
    q("#bulkPrevia").innerHTML = lista.length ? `<div class="mat-tabla-wrap bulk-previa"><table class="mat-tabla"><thead><tr><th>#</th><th>Nombre</th><th>Apellido</th><th>Rol</th><th>Nivel</th><th></th></tr></thead><tbody>${lista.map((l, i) => `
      <tr class="${l.error ? "bulk-error" : ""}"><td>${i + 1}</td><td>${escaparHTML(l.nombre)}</td><td>${escaparHTML(l.apellido)}</td><td>${escaparHTML(ROL_ETIQUETAS[l.rol] || "—")}</td><td>${escaparHTML(l.nivel || "—")}</td><td>${l.error ? escaparHTML(l.error) : "✓"}</td></tr>`).join("")}</tbody></table></div>` : "";
    q("#bulkContador").textContent = lista.length ? `${lista.length} persona${lista.length === 1 ? "" : "s"}${errores ? ` · ${errores} con errores` : ""}` : "";
    q("#bulkCrear").disabled = !lista.length || errores > 0;
  };
  ["#bulkTexto", "#bulkRol", "#bulkNivel", "#bulkOrden"].forEach((s) => q(s).addEventListener("input", repintar));
  q("#bulkTexto").focus();

  q("#bulkCrear").addEventListener("click", async (e) => {
    const estado = q("#bulkStatus");
    e.target.disabled = true;
    setStatus(estado, `Creando ${lista.length} usuarios...`);
    try {
      const response = await fetchAuth("/api/admin/create-users-bulk", {
        method: "POST",
        body: JSON.stringify({ usuarios: lista.map(({ nombre, apellido, rol, nivel }) => ({ nombre, apellido, rol, nivel })) })
      });
      if (!response) return;
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudieron crear los usuarios");
      await Promise.all([cargarUsuarios(), cargarStats()]);
      mostrarResultadosAlta(box, result.resultados, cerrar);
    } catch (error) {
      e.target.disabled = false;
      setStatus(estado, error.message, "error");
    }
  });
}

function mostrarResultadosAlta(box, resultados, cerrar) {
  const ok = resultados.filter((r) => r.ok);
  const fallidos = resultados.filter((r) => !r.ok);
  box.innerHTML = `
    <button type="button" class="modal-close" data-cerrar aria-label="Cerrar">✕</button>
    <h2>${ok.length} usuario${ok.length === 1 ? "" : "s"} creado${ok.length === 1 ? "" : "s"}${fallidos.length ? ` · ${fallidos.length} con error` : ""}</h2>
    <p class="muted"><b>Guardá estas contraseñas ahora:</b> no se vuelven a mostrar. Cada persona debe cambiarla la primera vez que ingresa. Descargá la lista para repartirla.</p>
    <div class="mat-tabla-wrap bulk-previa"><table class="mat-tabla"><thead><tr><th>Nombre</th><th>Rol</th><th>Nivel</th><th>Usuario</th><th>Contraseña temporal</th></tr></thead><tbody>
      ${resultados.map((r) => r.ok
        ? `<tr><td>${escaparHTML(r.apellido)}, ${escaparHTML(r.nombre)}</td><td>${escaparHTML(ROL_ETIQUETAS[r.rol] || r.rol)}</td><td>${escaparHTML(r.nivel || "—")}</td><td><code>${escaparHTML(r.email)}</code></td><td><code>${escaparHTML(r.password)}</code></td></tr>`
        : `<tr class="bulk-error"><td>${escaparHTML(r.apellido)}, ${escaparHTML(r.nombre)}</td><td colspan="4">${escaparHTML(r.error)}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="form-actions mat-acciones">
      <button type="button" class="secondary" id="bulkCopiar">Copiar lista</button>
      <button type="button" id="bulkDescargar">Descargar CSV</button>
      <button type="button" class="secondary" data-cerrar>Cerrar</button>
    </div>`;
  box.querySelector("#bulkDescargar").addEventListener("click", () => {
    const blob = new Blob([csvDeResultados(resultados)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "usuarios-nuevos.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  box.querySelector("#bulkCopiar").addEventListener("click", async (e) => {
    const texto = ok.map((r) => [r.apellido + ", " + r.nombre, r.email, r.password].join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      e.target.textContent = "¡Copiado!";
    } catch (error) {
      e.target.textContent = "No se pudo copiar";
    }
  });
}

document.getElementById("bulkUsersBtn").addEventListener("click", abrirAltaMasiva);

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
        <p class="item-date">${infoAutoria(doc)}</p>
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
          </div>
          <p class="item-date">${infoAutoria(item)}</p>
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
    desc: "Las imágenes que rotan en el carrusel principal de la página de inicio. Podés agregar o quitar (hasta 7).",
    slots: 4, dynamic: true, min: 1, max: 7
  },
  inscripcion: {
    label: "Inicio — Fondo Inscripción 2027",
    desc: "La imagen de fondo de la sección 'Inscripción: Ciclo Lectivo 2027'. Se aplica como fondo de pantalla completa en la página de inicio.",
    slots: 1,
    bg: true
  },
  instalaciones: {
    label: "Inicio — Galería Instalaciones",
    desc: "Las fotos de la sección de instalaciones del instituto en la página de inicio. Podés agregar o quitar (hasta 7).",
    slots: 5, dynamic: true, min: 1, max: 7
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

  var html = "<div class='sv-seed-box'>" +
    "<button type='button' id='svSeedBtn' class='sv-seed-btn'>Importar imágenes actuales</button>" +
    "<span class='sv-seed-note'>Solo la primera vez: carga las fotos actuales del sitio para poder agregarlas/quitarlas. No pisa las que ya editaste.</span>" +
    "<span id='svSeedStatus' class='status'></span>" +
    "</div>";
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

  var seedBtn = document.getElementById("svSeedBtn");
  if (seedBtn) seedBtn.addEventListener("click", svImportarActuales);

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

async function svImportarActuales() {
  var btn = document.getElementById("svSeedBtn");
  var status = document.getElementById("svSeedStatus");
  if (!confirm("Carga las imágenes actuales del sitio en las secciones dinámicas para poder gestionarlas. No pisa las que ya editaste. ¿Continuar?")) return;
  try {
    if (btn) { btn.disabled = true; btn.textContent = "Importando..."; }
    var response = await fetchAuth("/api/admin/sv/seed", { method: "POST" });
    var result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setStatus(status, "¡Listo! Ya podés gestionar las imágenes.", "success");
    document.querySelectorAll(".sv-acc-item").forEach(function (item) {
      var body = item.querySelector(".sv-acc-body");
      if (body && !body.hidden) cargarSvSeccion(item.dataset.seccion, item.querySelector(".sv-acc-slots"));
    });
  } catch (e) {
    setStatus(status, e.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Importar imágenes actuales"; }
  }
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
    var maxSlot = 0;
    container.querySelectorAll(".sv-slot-card[data-slot]").forEach(function (c) {
      var s = parseInt(c.dataset.slot) || 0;
      if (s > maxSlot) maxSlot = s;
    });
    var response = await fetchAuth("/api/admin/sv/imagenes/" + seccion + "/" + (maxSlot + 1), {
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
