(function () {
  "use strict";

  const core = window.LibretasCore;

  // Link de YouTube del tutorial para docentes (watch, youtu.be o shorts). Vacío = "próximamente".
  const TUTORIAL_URL = "https://youtu.be/_ajnR9jSASA";

  let ctx = null;
  let root = null;

  const estado = {
    anio: core.anioLectivoActual(),
    nivel: "Secundario",
    curso: "1",
    vista: "notas",
    categoria: "materias",
    hoja: null,
    alumnos: [],
    notas: {},
    base: {},
    sucios: new Set(),
    invalidos: new Set(),
    cargando: false,
    alumnoLibreta: null,
    editandoAlumno: null,
    filtroAlumno: "",
    alumnoFicha: null,
    configCurso: {},
    borradorConfig: null,
    guardadoEn: null,
    errorGuardado: false
  };

  /* ---------- Utilidades ---------- */

  function esc(valor) {
    return String(valor === null || valor === undefined ? "" : valor)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function claveSucia(alumnoId, clave) {
    return alumnoId + "|" + clave;
  }

  function copia(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function igual(a, b) {
    return JSON.stringify(ordenar(a)) === JSON.stringify(ordenar(b));
  }

  function ordenar(obj) {
    const out = {};
    Object.keys(obj || {}).sort().forEach((k) => (out[k] = obj[k]));
    return out;
  }

  async function api(url, options) {
    const res = await ctx.fetchAuth(url, options);
    if (!res) throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || "Ocurrió un error");
      err.detalle = data.detalle;
      throw err;
    }
    return data;
  }

  function nivelesPermitidos() {
    const p = ctx.perfil || {};
    if (["admin", "directivo", "docente"].includes(p.rol)) return ["Inicial", "Primario", "Secundario"];
    return [];
  }

  function hayCambios() {
    return estado.sucios.size > 0;
  }

  const ICONO = {
    notas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    alumnos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
    libretas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    descargar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
    mas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    buscar: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    izq: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    der: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };

  /* ---------- Avisos y confirmaciones ---------- */

  function toast(texto, tipo) {
    let caja = document.getElementById("lbToasts");
    if (!caja) {
      caja = document.createElement("div");
      caja.id = "lbToasts";
      caja.className = "lb-toasts";
      caja.setAttribute("role", "status");
      document.body.appendChild(caja);
    }
    const t = document.createElement("div");
    t.className = "lb-toast " + (tipo || "");
    t.textContent = texto;
    caja.appendChild(t);
    setTimeout(() => t.classList.add("salir"), 3800);
    setTimeout(() => t.remove(), 4300);
  }

  function confirmar({ titulo, mensaje, ok, peligro }) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "lb-modal";
      overlay.innerHTML = `
        <div class="lb-modal-box" role="dialog" aria-modal="true">
          <h3>${esc(titulo)}</h3>
          <p>${esc(mensaje)}</p>
          <div class="lb-modal-actions">
            <button class="lb-btn sec" data-r="0">Cancelar</button>
            <button class="lb-btn ${peligro ? "rojo" : "verde"}" data-r="1">${esc(ok || "Aceptar")}</button>
          </div>
        </div>`;
      const cerrar = (valor) => {
        overlay.remove();
        document.removeEventListener("keydown", tecla);
        resolve(valor);
      };
      const tecla = (e) => { if (e.key === "Escape") cerrar(false); };
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) cerrar(false);
        const b = e.target.closest("[data-r]");
        if (b) cerrar(b.dataset.r === "1");
      });
      document.addEventListener("keydown", tecla);
      document.body.appendChild(overlay);
      overlay.querySelector('[data-r="0"]').focus();
    });
  }

  function idYoutube(url) {
    const m = String(url || "").match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/);
    return m ? m[1] : null;
  }

  function abrirTutorial() {
    const id = idYoutube(TUTORIAL_URL);
    const overlay = document.createElement("div");
    overlay.className = "lb-modal";
    overlay.innerHTML = `
      <div class="lb-modal-box lb-tutorial" role="dialog" aria-modal="true" aria-label="Tutorial">
        <h3>Cómo cargar las notas</h3>
        ${id
          ? `<div class="lb-video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0" title="Tutorial: cómo cargar las notas" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
          : "<p>El video tutorial va a estar disponible muy pronto.</p>"}
        <div class="lb-modal-actions">
          ${id ? `<a class="lb-btn sec" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">Abrir en YouTube</a>` : ""}
          <button class="lb-btn" data-cerrar>Cerrar</button>
        </div>
      </div>`;
    const cerrar = () => {
      overlay.remove();
      document.removeEventListener("keydown", tecla);
    };
    const tecla = (e) => { if (e.key === "Escape") cerrar(); };
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.closest("[data-cerrar]")) cerrar();
    });
    document.addEventListener("keydown", tecla);
    document.body.appendChild(overlay);
    overlay.querySelector("[data-cerrar]").focus();
  }

  /* ---------- Guardado automático ---------- */

  let temporizador = null;
  let guardando = false;

  function programarAutoguardado() {
    clearTimeout(temporizador);
    if (!hayCambios() || estado.invalidos.size) return;
    temporizador = setTimeout(() => guardar(true), 1200);
  }

  async function asegurarGuardado() {
    clearTimeout(temporizador);
    if (estado.invalidos.size) {
      toast("Corregí los valores marcados en rojo antes de cambiar de pantalla.", "err");
      return false;
    }
    let intentos = 0;
    while ((hayCambios() || guardando) && !estado.errorGuardado && intentos < 6) {
      if (!guardando) await guardar(true);
      else await new Promise((r) => setTimeout(r, 250));
      intentos++;
    }
    return !hayCambios();
  }

  function mostrarMensaje(el, texto, tipo) {
    if (!el) return;
    el.textContent = texto || "";
    el.className = "lb-msg " + (tipo || "");
  }

  function planillas() {
    return core.planillasDe(estado.nivel, estado.curso);
  }

  function hojaActual() {
    const cats = planillas();
    const cat = cats.find((c) => c.id === estado.categoria) || cats[0];
    if (!cat) return null;
    return cat.hojas.find((h) => h.clave === estado.hoja) || cat.hojas[0];
  }

  /* ---------- Carga de datos ---------- */

  async function cargarCurso() {
    estado.cargando = true;
    estado.sucios.clear();
    estado.invalidos.clear();
    render();
    try {
      const q = new URLSearchParams({ anio: estado.anio, nivel: estado.nivel, curso: estado.curso });
      const data = await api("/api/libretas/notas?" + q.toString());
      estado.alumnos = data.alumnos;
      estado.notas = {};
      estado.base = {};
      data.alumnos.forEach((a) => {
        estado.notas[a.id] = {};
        estado.base[a.id] = {};
        const filas = data.notas[a.id] || {};
        Object.keys(filas).forEach((clave) => {
          estado.notas[a.id][clave] = copia(filas[clave].datos);
          estado.base[a.id][clave] = copia(filas[clave].datos);
        });
      });
      if (estado.nivel !== "Secundario") {
        try {
          const cfg = await api("/api/libretas/config?" + q.toString());
          estado.configCurso[claveConfig()] = cfg.datos || {};
        } catch (errorConfig) {
          estado.configCurso[claveConfig()] = {};
        }
      }
      estado.borradorConfig = null;
      if (!estado.alumnoLibreta || !estado.alumnos.some((a) => a.id === estado.alumnoLibreta)) {
        estado.alumnoLibreta = estado.alumnos.length ? estado.alumnos[0].id : null;
      }
    } catch (error) {
      estado.alumnos = [];
      estado.notas = {};
      estado.error = /lib_alumnos|lib_notas|schema cache/i.test(error.message)
        ? "El módulo de libretas todavía no está habilitado en la base de datos. Avisá al administrador del sitio."
        : error.message;
    }
    estado.cargando = false;
    render();
  }

  /* ---------- Estructura general ---------- */

  function montarBase() {
    root.innerHTML = `
      <div class="lb">
        <div class="lb-card lb-hero">
          <div class="lb-hero-info">
            <span class="lb-eyebrow" id="lbEyebrow"></span>
            <h2 class="lb-title" id="lbTitulo"></h2>
            <p class="lb-hero-sub" id="lbResumen"></p>
          </div>
          <div class="lb-hero-controls">
            <div class="lb-seg" id="lbNiveles"></div>
            <div class="lb-seg" id="lbCursos"></div>
            <select class="lb-select" id="lbAnio" aria-label="Año lectivo"></select>
            ${(ctx.perfil || {}).rol === "docente" ? `<button class="lb-btn lb-btn-tutorial" data-accion="tutorial"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z"/></svg><span>Ver tutorial</span></button>` : ""}
          </div>
        </div>
        <div class="lb-tabs" id="lbVistas" role="tablist"></div>
        <div id="lbContenido"></div>
      </div>`;

    root.addEventListener("input", onInput);
    root.addEventListener("keydown", onKeydown);
    root.addEventListener("click", onClick);
    root.addEventListener("change", onChange);
    root.addEventListener("focusin", (e) => {
      if (e.target.matches("input.lb-in")) e.target.select();
    });
    window.addEventListener("beforeunload", (e) => {
      if (hayCambios()) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
    window.addEventListener("resize", ajustarVisor);
  }

  function render() {
    renderToolbar();
    renderContenido();
  }

  function renderToolbar() {
    const permitidos = nivelesPermitidos();
    const cfgNivel = core.nivelDe(estado.nivel);
    const curso = core.cursoDe(estado.nivel, estado.curso);

    document.getElementById("lbEyebrow").textContent = "Libretas · Año lectivo " + estado.anio;
    document.getElementById("lbTitulo").textContent = `${cfgNivel.label}${curso ? " · " + curso.label : ""}`;
    document.getElementById("lbResumen").textContent = estado.cargando
      ? "Cargando..."
      : `${estado.alumnos.length} estudiante${estado.alumnos.length === 1 ? "" : "s"}${cfgNivel.resumen ? " · " + cfgNivel.resumen(estado.curso) : ""}`;

    const mostrarNiveles = permitidos.length > 1;
    const segNiveles = document.getElementById("lbNiveles");
    segNiveles.style.display = mostrarNiveles ? "" : "none";
    segNiveles.innerHTML = ["Inicial", "Primario", "Secundario"]
      .filter((n) => permitidos.includes(n))
      .map((n) => {
        const cfg = core.nivelDe(n);
        const activo = n === estado.nivel ? " active" : "";
        return cfg.disponible
          ? `<button class="${activo.trim()}" data-accion="nivel" data-valor="${n}">${cfg.label.replace("Nivel ", "")}</button>`
          : `<button disabled title="Próximamente">${cfg.label.replace("Nivel ", "")}</button>`;
      }).join("");

    document.getElementById("lbCursos").innerHTML = cfgNivel.cursos.map((c) =>
      `<button class="${c.id === estado.curso ? "active" : ""}" data-accion="curso" data-valor="${c.id}">${esc(c.label)}</button>`
    ).join("");

    const anios = [];
    for (let a = core.anioLectivoActual() + 1; a >= core.anioLectivoActual() - 3; a--) anios.push(a);
    document.getElementById("lbAnio").innerHTML = anios.map((a) => `<option value="${a}"${a === estado.anio ? " selected" : ""}>Año ${a}</option>`).join("");

    document.getElementById("lbVistas").innerHTML = [
      ["notas", "Cargar notas", ICONO.notas], ["alumnos", "Estudiantes", ICONO.alumnos], ["libretas", "Libretas", ICONO.libretas]
    ].map(([id, label, icono]) => `<button role="tab" class="lb-tab${estado.vista === id ? " active" : ""}" data-accion="vista" data-valor="${id}">${icono}<span>${label}</span></button>`).join("");
  }

  function renderContenido() {
    const cont = document.getElementById("lbContenido");
    if (estado.cargando) {
      cont.innerHTML = `<div class="lb-card"><div class="skeleton skeleton-card"></div></div>`;
      return;
    }
    if (estado.error) {
      cont.innerHTML = `<div class="lb-card"><p class="lb-msg err">${esc(estado.error)}</p></div>`;
      estado.error = null;
      return;
    }
    if (estado.vista === "alumnos") return renderAlumnos(cont);
    if (estado.vista === "libretas") return renderLibretas(cont);
    return renderNotas(cont);
  }

  /* ---------- Vista: cargar notas ---------- */

  function sinAlumnos() {
    return `<div class="lb-card"><div class="lb-vacio">
      <div class="lb-vacio-icono">${ICONO.alumnos}</div>
      <h3>Todavía no hay estudiantes en este curso</h3>
      <p>Agregá la lista del curso para empezar a cargar notas y armar las libretas.</p>
      <button class="lb-btn verde" data-accion="vista" data-valor="alumnos">${ICONO.mas}<span>Agregar estudiantes</span></button>
    </div></div>`;
  }

  function progresoHoja(clave) {
    const total = estado.alumnos.length;
    const con = estado.alumnos.filter((a) => {
      const d = (estado.notas[a.id] || {})[clave];
      return d && Object.keys(d).length > 0;
    }).length;
    return { con, total, nivel: con === 0 ? "vacio" : con === total ? "completo" : "parcial" };
  }

  function chipHoja(h, activa) {
    const p = progresoHoja(h.clave);
    return `<button class="lb-chip prog-${p.nivel}${activa ? " active" : ""}" data-accion="hoja" data-valor="${h.clave}" title="${p.con} de ${p.total} estudiantes con datos"><i class="lb-dot"></i>${esc(h.label)}</button>`;
  }

  function renderNotas(cont) {
    if (!estado.alumnos.length) {
      cont.innerHTML = sinAlumnos();
      return;
    }
    const cats = planillas();
    if (!cats.some((c) => c.id === estado.categoria)) estado.categoria = cats[0].id;
    const cat = cats.find((c) => c.id === estado.categoria);
    if (!cat.hojas.some((h) => h.clave === estado.hoja)) estado.hoja = cat.hojas[0].clave;
    const hoja = cat.hojas.find((h) => h.clave === estado.hoja);

    const chipsCat = cats.map((c) =>
      `<button class="lb-seg-btn${c.id === estado.categoria ? " active" : ""}" data-accion="categoria" data-valor="${c.id}">${esc(c.label)}</button>`
    ).join("");

    const chipsHoja = cat.hojas.length > 1
      ? `<div class="lb-sub-chips" id="lbChipsHoja">${cat.hojas.map((h) => chipHoja(h, h.clave === hoja.clave)).join("")}</div>`
      : "";

    cont.innerHTML = `
      <div class="lb-card">
        <div class="lb-cats">${chipsCat}</div>
        ${chipsHoja}
        <div class="lb-sheet-head">
          <div>
            <h3>${esc(hoja.label)}</h3>
            <p class="lb-progress-txt" id="lbProgresoTxt"></p>
          </div>
          <div class="lb-progress" aria-hidden="true"><span id="lbProgresoBarra"></span></div>
        </div>
        <p class="lb-hint">${ICONO.info}<span>${hoja.formulario ? "Elegí un estudiante y completá sus indicadores: se guardan solos." : "Escribí las notas: se guardan solas. Con <kbd>Enter</kbd> o <kbd>↓</kbd> pasás al estudiante de abajo. Podés usar coma o punto."}</span></p>
        ${ayudaHoja(hoja)}
        ${hoja.formulario ? htmlFicha(hoja) : `<div class="lb-grid-wrap">${htmlGrid(hoja)}</div>`}
        <div class="lb-statusbar">
          <span class="lb-status" id="lbEstado"></span>
          <button class="lb-btn chico sec" data-accion="guardar" id="lbGuardar">Guardar ahora</button>
        </div>
      </div>`;
    actualizarBarra();
    actualizarProgreso();
  }

  function actualizarProgreso() {
    const hoja = hojaActual();
    if (!hoja) return;
    const p = progresoHoja(hoja.clave);
    const txt = document.getElementById("lbProgresoTxt");
    const barra = document.getElementById("lbProgresoBarra");
    if (txt) txt.textContent = `${p.con} de ${p.total} estudiantes con datos cargados`;
    if (barra) barra.style.width = (p.total ? Math.round((p.con / p.total) * 100) : 0) + "%";
    root.querySelectorAll("#lbChipsHoja .lb-chip").forEach((chip) => {
      const pp = progresoHoja(chip.dataset.valor);
      chip.classList.remove("prog-vacio", "prog-parcial", "prog-completo");
      chip.classList.add("prog-" + pp.nivel);
      chip.title = `${pp.con} de ${pp.total} estudiantes con datos`;
    });
  }

  function ayudaHoja(hoja) {
    const detalle = (contenido) =>
      `<details class="lb-details"><summary>¿Cómo se calcula esta planilla?</summary><div>${contenido}</div></details>`;
    if (hoja.tipo === "materia") {
      return detalle(`<ul>
        <li><b>Promedio de cada cuatrimestre:</b> PROCON 20% + EV1 40% + EV2 40%. Se calcula cuando las dos evaluaciones están aprobadas (7 o más).</li>
        <li><b>Diciembre:</b> si la nota es 7 o más, las evaluaciones desaprobadas se corrigen con el promedio entre esa evaluación y Diciembre (mínimo 7). La corrección se ve en verde debajo de la nota original.</li>
        <li><b>Febrero:</b> si un cuatrimestre quedó desaprobado y la nota de Febrero es 7 o más, se promedia con ese cuatrimestre.</li>
        <li><b>Nota final:</b> promedio de los dos cuatrimestres. Se calcula sola, pero si escribís un valor en esa celda, ese valor manda.</li>
      </ul>`);
    }
    if (hoja.tipo === "ing-general") {
      return detalle(`<ul>
        <li><b>Average:</b> promedio de las cinco habilidades en cada cuatrimestre (se calcula cuando están las cinco).</li>
        <li><b>Nota final:</b> promedio de los dos cuatrimestres. Podés escribir una nota final manual.</li>
        <li>Los comentarios aparecen en la libreta, debajo del bloque de Inglés.</li>
      </ul>`);
    }
    if (hoja.tipo === "asistencia") {
      return detalle(`<p>Cargá las cantidades de cada cuatrimestre. Los totales se calculan solos.</p>`);
    }
    if (hoja.tipo === "devolucion") {
      return detalle(`<p>Este texto aparece al pie de la libreta, en el recuadro "Devolución anual".</p>`);
    }
    if (hoja.tipo === "pri1-materia" || hoja.tipo === "pri1-ingles" || hoja.tipo === "pri1-ingles-avg") {
      const esIngles = hoja.tipo !== "pri1-materia";
      return detalle(esIngles
        ? `<p>Elegí <b>EX</b> (excelente), <b>VG</b> (muy bueno), <b>G</b> (bueno) o <b>IP</b> (en proceso). El guion "-" indica que no corresponde en ese período.</p>`
        : `<p>Elegí <b>ML</b> (muy logrado, 10-9), <b>L</b> (logrado, 8-7), <b>EP</b> (en proceso, 6-5) o <b>NR</b> (necesita reforzar, 4 o menos). El guion "-" indica que la materia no corresponde en ese trimestre.</p>`);
    }
    if (hoja.tipo === "pri1-procon") {
      return detalle(`<p>Cargá la nota numérica de cada trimestre: en la libreta se muestra automáticamente como concepto (10-9 ML, 8-7 L, 6-5 EP, 4 o menos NR). Diciembre, Febrero y nota final se eligen a mano.</p>`);
    }
    if (hoja.tipo === "pri2-materia") {
      return detalle(`<ul>
        <li>Cargá la nota de cada trimestre (o un guion "-" si no corresponde). Se aprueba con 6 o más.</li>
        <li><b>Nota final:</b> si los trimestres están cargados y todos aprobados, se calcula sola como el promedio. Si escribís un valor en esa celda, ese valor manda (por ejemplo, después de Diciembre o Febrero).</li>
      </ul>`);
    }
    if (hoja.tipo === "pri-asis") {
      return detalle(`<p>Cargá los días hábiles, las inasistencias y las tardanzas de cada trimestre. El total se suma solo (inasistencias + tardanzas); si necesitás otro valor, escribilo en la celda "Total".</p>`);
    }
    if (hoja.tipo === "pri-dev") {
      return detalle(`<p>Escribí la devolución de cada trimestre. Aparece en la libreta, en el recuadro "Devolución / Comments".</p>`);
    }
    if (hoja.tipo === "pri-fin") {
      return detalle(`<p>Completá el cierre del año. Marcá <b>las firmas</b> de cada trimestre cuando ya esté entregada la libreta de ese período: solo así aparecen las firmas del docente y del director en la última página.</p>`);
    }
    return "";
  }

  function htmlFicha(hoja) {
    if (!estado.alumnos.some((a) => a.id === estado.alumnoFicha)) estado.alumnoFicha = estado.alumnos[0].id;
    const alumno = estado.alumnos.find((a) => a.id === estado.alumnoFicha);
    const datos = (estado.notas[alumno.id] || {})[hoja.clave] || {};
    const cols = core.columnasDe(hoja.tipo);
    const colDe = (key) => cols.find((c) => c.key === key);

    const lista = estado.alumnos.map((a) => {
      const d = (estado.notas[a.id] || {})[hoja.clave] || {};
      const n = Object.keys(d).length;
      return `<button class="${a.id === alumno.id ? "active" : ""}" data-accion="ficha-alumno" data-valor="${a.id}"><span>${esc(a.apellido)}, ${esc(a.nombre)}</span><em class="lb-badge ${n ? "ok" : "warn"}">${n ? n : "—"}</em></button>`;
    }).join("");

    const control = (id, tipo, etapa) => {
      const key = `${id}_${etapa}`;
      const col = colDe(key);
      const base = `data-a="${alumno.id}" data-c="${hoja.clave}" data-k="${key}"`;
      const sucio = cambiado(alumno.id, hoja.clave, key) ? " sucio" : "";
      if (!col) return "";
      if (col.tipo === "concepto") {
        const opciones = [""].concat(col.opciones).map((o) => `<option value="${esc(o)}"${datos[key] === o ? " selected" : ""}>${esc(o)}</option>`).join("");
        return `<select class="lb-in lb-sel${sucio}" ${base}>${opciones}</select>`;
      }
      return `<input class="lb-in${sucio}" type="text" autocomplete="off" ${base} value="${esc(datos[key])}">`;
    };

    const bloques = hoja.area.bloques.map((b) => {
      const filas = b.filas.map(([id, label, tipo, subs]) => {
        if (subs && subs.length) {
          return subs.map(([sid, slabel], i) => `<tr>${i === 0 ? `<td class="eti" rowspan="${subs.length}">${esc(label)}</td>` : ""}<td class="sub">${esc(slabel)}</td><td class="val">${control(`${id}_${sid}`, tipo, 1)}</td><td class="val">${control(`${id}_${sid}`, tipo, 2)}</td></tr>`).join("");
        }
        return `<tr><td class="eti" colspan="2">${esc(label)}</td><td class="val">${control(id, tipo, 1)}</td><td class="val">${control(id, tipo, 2)}</td></tr>`;
      }).join("");
      return `${b.titulo ? `<h4>${esc(b.titulo)}</h4>` : ""}<table class="lb-rub"><thead><tr><th colspan="2">Indicador</th><th>1ª Etapa</th><th>2ª Etapa</th></tr></thead><tbody>${filas}</tbody></table>`;
    }).join("");

    return `<div class="lb-ficha">
      <div class="lb-ficha-lista">${lista}</div>
      <div class="lb-ficha-form"><h3 class="lb-ficha-nombre">${esc(alumno.apellido)}, ${esc(alumno.nombre)}</h3>${bloques}</div>
    </div>`;
  }

  function htmlGrid(hoja) {
    const cols = core.columnasDe(hoja.tipo);
    const grupos = [];
    cols.forEach((c) => {
      const ult = grupos[grupos.length - 1];
      if (ult && ult.label === c.grupo) ult.span++;
      else grupos.push({ label: c.grupo, span: 1 });
    });

    const thead = `
      <thead>
        <tr><th class="lb-alumno" rowspan="2">Estudiante</th>${grupos.map((g) => `<th colspan="${g.span}">${esc(g.label)}</th>`).join("")}</tr>
        <tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr>
      </thead>`;

    const filas = estado.alumnos.map((al, i) => {
      const datos = (estado.notas[al.id] || {})[hoja.clave] || {};
      const calc = core.calcularClave(hoja.clave, datos, estado.notas[al.id], estado.nivel, estado.curso);
      const celdas = cols.map((c) => htmlCelda(al, hoja, c, datos, calc)).join("");
      return `<tr data-fila="${al.id}"><td class="lb-alumno"><span class="lb-num">${i + 1}</span>${esc(al.apellido)}, ${esc(al.nombre)}</td>${celdas}</tr>`;
    }).join("");

    return `<table class="lb-grid" data-clave="${hoja.clave}">${thead}<tbody>${filas}</tbody></table>`;
  }

  function valorDerivado(col, calc) {
    const v = calc[col.key];
    if (v === null || v === undefined || v === "") return "";
    return col.decimales === null || col.decimales === undefined ? String(v) : core.fmt(v, col.decimales);
  }

  function minimoAprobado(col) {
    return col.aprobado || core.APROBADO;
  }

  function formatoAuto(col, v) {
    if (v === null || v === undefined) return "";
    return col.decimales === null ? String(v) : core.fmt(v, col.decimales === undefined ? 2 : col.decimales);
  }

  function htmlCelda(al, hoja, col, datos, calc) {
    const base = `data-a="${al.id}" data-c="${hoja.clave}" data-k="${col.key}"`;
    if (col.tipo === "derivado") {
      const v = valorDerivado(col, calc);
      const baja = v !== "" && col.decimales !== null && col.decimales !== undefined && parseFloat(v) < minimoAprobado(col) ? " baja" : "";
      return `<td class="lb-derivado${baja}" ${base} data-der="1">${esc(v)}</td>`;
    }
    const sucio = cambiado(al.id, hoja.clave, col.key) ? " sucio" : "";
    if (col.tipo === "texto") {
      const largo = ["devolucion", "pri-dev", "ini-libre", "ini-obs"].includes(hoja.tipo);
      const ancho = largo ? " ancho" : col.max && col.max <= 40 ? " corto" : "";
      const filas = hoja.tipo === "ini-libre" ? 9 : col.max && col.max <= 40 ? 1 : 2;
      return `<td><textarea class="lb-texto${ancho}${sucio}" rows="${filas}" ${base}>${esc(datos[col.key])}</textarea></td>`;
    }
    if (col.tipo === "concepto") {
      const opciones = [""].concat(col.opciones).map((o) => `<option value="${esc(o)}"${datos[col.key] === o ? " selected" : ""}>${esc(o)}</option>`).join("");
      return `<td><select class="lb-in lb-sel${sucio}" ${base}>${opciones}</select></td>`;
    }
    if (col.tipo === "foto") {
      const url = datos[col.key];
      return `<td class="lb-foto-td">${url ? `<img class="lb-foto-mini" src="${esc(url)}" alt="">` : `<span class="lb-sin-foto">Sin foto</span>`}
        <div class="lb-foto-acc"><label class="lb-btn chico sec">${url ? "Cambiar" : "Subir foto"}<input type="file" accept="image/*" hidden data-foto="1" ${base}></label>
        ${url ? `<button class="lb-btn chico rojo" data-accion="quitar-foto" ${base}>Quitar</button>` : ""}</div></td>`;
    }
    if (col.tipo === "check") {
      return `<td><input type="checkbox" class="lb-check${sucio}" ${base}${datos[col.key] === "1" ? " checked" : ""}></td>`;
    }
    const placeholder = col.auto ? formatoAuto(col, calc[col.auto]) : "";
    const sub = col.sub ? `<span class="lb-sub" data-sub="${col.sub}" ${base}>${subTexto(calc[col.sub])}</span>` : "";
    const clases = ["lb-in"];
    if (sucio) clases.push("sucio");
    if (estado.invalidos.has(campoId(al.id, hoja.clave, col.key))) clases.push("invalido");
    const n = core.leerNumero(datos[col.key]);
    if (col.tipo === "nota" && n !== null && !Number.isNaN(n) && n < minimoAprobado(col)) clases.push("baja");
    return `<td><input class="${clases.join(" ")}" type="text" inputmode="decimal" autocomplete="off" ${base} value="${esc(datos[col.key])}" placeholder="${esc(placeholder)}">${sub}</td>`;
  }

  function subTexto(v) {
    return v === null || v === undefined ? "" : "→ " + core.fmt(v, 2);
  }

  function campoId(a, c, k) {
    return a + "|" + c + "|" + k;
  }

  function cambiado(alumnoId, clave, key) {
    const actual = ((estado.notas[alumnoId] || {})[clave] || {})[key];
    const original = ((estado.base[alumnoId] || {})[clave] || {})[key];
    return (actual || "") !== (original || "");
  }

  function actualizarBarra() {
    const span = document.getElementById("lbEstado");
    const btn = document.getElementById("lbGuardar");
    if (!span || !btn) return;
    let clase = "ok";
    let html;
    if (estado.invalidos.size) {
      clase = "err";
      html = `Hay ${estado.invalidos.size} valor${estado.invalidos.size === 1 ? "" : "es"} inválido${estado.invalidos.size === 1 ? "" : "s"}: corregilo${estado.invalidos.size === 1 ? "" : "s"} para poder guardar`;
    } else if (guardando) {
      clase = "trabajando";
      html = "Guardando...";
    } else if (estado.errorGuardado) {
      clase = "err";
      html = "No se pudo guardar. Revisá tu conexión y tocá “Guardar ahora”";
    } else if (hayCambios()) {
      clase = "pendiente";
      html = "Cambios sin guardar: se guardan solos en un momento";
    } else {
      const hora = estado.guardadoEn
        ? " · " + estado.guardadoEn.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
        : "";
      html = `${ICONO.check}<span>Todo guardado${hora}</span>`;
    }
    span.className = "lb-status " + clase;
    span.innerHTML = clase === "ok" ? html : `<span>${html}</span>`;
    btn.style.display = hayCambios() ? "" : "none";
    btn.disabled = guardando || estado.invalidos.size > 0;
  }

  function refrescarFila(alumnoId, clave) {
    const datos = (estado.notas[alumnoId] || {})[clave] || {};
    const calc = core.calcularClave(clave, datos, estado.notas[alumnoId], estado.nivel, estado.curso);
    const cols = core.columnasDe(core.tipoDeClave(clave, estado.nivel, estado.curso));
    const tr = root.querySelector(`tr[data-fila="${alumnoId}"]`);
    if (!tr) return;
    cols.forEach((col) => {
      if (col.tipo === "derivado") {
        const td = tr.querySelector(`td[data-k="${col.key}"]`);
        if (td) {
          const v = valorDerivado(col, calc);
          td.textContent = v;
          td.classList.toggle("baja", v !== "" && col.decimales !== null && col.decimales !== undefined && parseFloat(v) < minimoAprobado(col));
        }
      }
      if (col.sub) {
        const sp = tr.querySelector(`span[data-sub="${col.sub}"]`);
        if (sp) sp.textContent = subTexto(calc[col.sub]);
      }
      if (col.auto) {
        const inp = tr.querySelector(`input[data-k="${col.key}"]`);
        if (inp) inp.placeholder = formatoAuto(col, calc[col.auto]);
      }
    });
  }

  /* ---------- Eventos ---------- */

  function onInput(e) {
    const el = e.target;
    if (el.matches("input[data-cfg]")) {
      borradorConfig()[el.dataset.cfg] = el.value;
      return;
    }
    if (!el.matches("input[data-a], textarea[data-a], select[data-a]")) return;
    const { a, c, k } = el.dataset;
    const col = core.columnasDe(core.tipoDeClave(c, estado.nivel, estado.curso)).find((x) => x.key === k);
    if (!col) return;

    const fila = ((estado.notas[a] = estado.notas[a] || {})[c] = estado.notas[a][c] || {});
    let valor = col.tipo === "texto" ? el.value : el.value.trim();
    if (col.tipo === "check") valor = el.checked ? "1" : "";
    if (valor === "") delete fila[k];
    else fila[k] = col.tipo === "texto" || col.tipo === "concepto" || col.tipo === "check" ? valor : valor.replace(",", ".");

    let invalido = false;
    if ((col.tipo === "nota" || col.tipo === "entero") && valor !== "" && !(col.guion && valor === "-")) {
      const n = core.leerNumero(valor);
      invalido = Number.isNaN(n) || (col.tipo === "nota" && n > 10) || (col.tipo === "entero" && n > 999);
    }
    const id = campoId(a, c, k);
    if (invalido) estado.invalidos.add(id);
    else estado.invalidos.delete(id);
    el.classList.toggle("invalido", invalido);

    const clave = claveSucia(a, c);
    if (igual(fila, (estado.base[a] || {})[c] || {})) estado.sucios.delete(clave);
    else estado.sucios.add(clave);
    el.classList.toggle("sucio", cambiado(a, c, k));

    if (col.tipo === "nota") {
      const n = core.leerNumero(valor);
      el.classList.toggle("baja", n !== null && !Number.isNaN(n) && n < minimoAprobado(col));
    }

    estado.errorGuardado = false;
    refrescarFila(a, c);
    actualizarBarra();
    actualizarProgreso();
    programarAutoguardado();
  }

  function onKeydown(e) {
    const el = e.target;
    if (!el.matches("input.lb-in")) return;
    if (e.key !== "Enter" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const filas = Array.from(root.querySelectorAll("tbody tr[data-fila]"));
    const actual = filas.findIndex((tr) => tr.dataset.fila === el.dataset.a);
    const destino = filas[actual + (e.key === "ArrowUp" ? -1 : 1)];
    if (!destino) return;
    const sig = destino.querySelector(`input[data-k="${el.dataset.k}"]`);
    if (sig) {
      sig.focus();
      sig.select();
    }
  }

  async function cambiarContexto(cambios) {
    if (!(await asegurarGuardado())) {
      renderToolbar();
      return;
    }
    Object.assign(estado, cambios);
    estado.hoja = null;
    estado.filtroAlumno = "";
    await cargarCurso();
  }

  function establecerValor(a, c, k, valor) {
    const fila = ((estado.notas[a] = estado.notas[a] || {})[c] = estado.notas[a][c] || {});
    if (valor) fila[k] = valor;
    else delete fila[k];
    const clave = claveSucia(a, c);
    if (igual(fila, (estado.base[a] || {})[c] || {})) estado.sucios.delete(clave);
    else estado.sucios.add(clave);
    renderContenido();
    programarAutoguardado();
  }

  async function subirFoto(input) {
    const archivo = input.files && input.files[0];
    if (!archivo) return;
    const { a, c, k } = input.dataset;
    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("tipo", "foto");
    fd.append("alumno_id", a);
    toast("Subiendo foto...", "");
    try {
      const r = await api("/api/libretas/imagen", { method: "POST", body: fd });
      establecerValor(a, c, k, r.url);
      toast("Foto subida", "ok");
    } catch (error) {
      toast(error.message, "err");
    }
    input.value = "";
  }

  async function onChange(e) {
    if (e.target.matches("input[type=file][data-foto]")) return subirFoto(e.target);
    if (e.target.matches("input[type=file][data-firma]")) return subirFirma(e.target);
    if (e.target.id === "lbAnio") await cambiarContexto({ anio: parseInt(e.target.value, 10) });
    else if (e.target.matches("select[data-a], input[type=checkbox][data-a]")) onInput(e);
  }

  async function onClick(e) {
    const btn = e.target.closest("[data-accion]");
    if (!btn) return;
    const accion = btn.dataset.accion;
    const valor = btn.dataset.valor;

    if (accion === "tutorial") {
      abrirTutorial();
    } else if (accion === "nivel") {
      if (valor !== estado.nivel) await cambiarContexto({ nivel: valor, curso: core.nivelDe(valor).cursos[0].id });
    } else if (accion === "curso") {
      if (valor !== estado.curso) await cambiarContexto({ curso: valor });
    } else if (accion === "vista") {
      estado.vista = valor;
      render();
    } else if (accion === "categoria") {
      estado.categoria = valor;
      estado.hoja = null;
      renderContenido();
    } else if (accion === "hoja") {
      estado.hoja = valor;
      renderContenido();
    } else if (accion === "quitar-foto") {
      establecerValor(btn.dataset.a, btn.dataset.c, btn.dataset.k, "");
    } else if (accion === "quitar-firma") {
      borradorConfig()[btn.dataset.campo].splice(parseInt(btn.dataset.indice, 10), 1);
      renderConfigCurso();
    } else if (accion === "guardar-config") {
      await guardarConfig();
    } else if (accion === "ficha-alumno") {
      estado.alumnoFicha = valor;
      renderContenido();
    } else if (accion === "guardar") {
      await guardar();
    } else if (accion === "libreta-anterior" || accion === "libreta-siguiente") {
      const lista = alumnosFiltrados();
      const i = lista.findIndex((a) => a.id === estado.alumnoLibreta);
      const destino = lista[i + (accion === "libreta-anterior" ? -1 : 1)];
      if (destino) {
        estado.alumnoLibreta = destino.id;
        renderContenido();
      }
    } else if (accion === "agregar-alumnos") {
      await agregarAlumnos();
    } else if (accion === "editar-alumno") {
      estado.editandoAlumno = valor;
      renderContenido();
    } else if (accion === "cancelar-alumno") {
      estado.editandoAlumno = null;
      renderContenido();
    } else if (accion === "guardar-alumno") {
      await guardarAlumno(valor);
    } else if (accion === "eliminar-alumno") {
      await eliminarAlumno(valor);
    } else if (accion === "ver-libreta") {
      estado.alumnoLibreta = valor;
      renderContenido();
    } else if (accion === "pdf-alumno") {
      await exportarPdf([estado.alumnoLibreta], btn);
    } else if (accion === "pdf-curso") {
      await exportarPdf(estado.alumnos.map((a) => a.id), btn);
    }
  }

  async function guardar() {
    if (guardando || !hayCambios() || estado.invalidos.size) return;
    clearTimeout(temporizador);
    guardando = true;
    estado.errorGuardado = false;
    actualizarBarra();

    const items = Array.from(estado.sucios).map((k) => {
      const [alumnoId, clave] = k.split("|");
      return { alumno_id: alumnoId, clave, datos: copia((estado.notas[alumnoId] || {})[clave]) };
    });

    try {
      await api("/api/libretas/notas", { method: "PUT", body: JSON.stringify({ items }) });
      items.forEach((it) => {
        const actual = (estado.notas[it.alumno_id] || {})[it.clave] || {};
        const base = (estado.base[it.alumno_id] = estado.base[it.alumno_id] || {});
        if (Object.keys(it.datos).length) base[it.clave] = copia(it.datos);
        else delete base[it.clave];
        if (igual(actual, it.datos)) {
          estado.sucios.delete(claveSucia(it.alumno_id, it.clave));
          if (!Object.keys(actual).length) delete estado.notas[it.alumno_id][it.clave];
        }
      });
      estado.guardadoEn = new Date();
      root.querySelectorAll(".lb-in.sucio, .lb-texto.sucio").forEach((el) => {
        if (!cambiado(el.dataset.a, el.dataset.c, el.dataset.k)) el.classList.remove("sucio");
      });
    } catch (error) {
      estado.errorGuardado = true;
      const detalle = error.detalle && error.detalle[0] ? ": " + error.detalle[0].errores.join(", ") : "";
      toast(error.message + detalle, "err");
    }

    guardando = false;
    actualizarBarra();
    actualizarProgreso();
    if (hayCambios() && !estado.errorGuardado) programarAutoguardado();
  }

  /* ---------- Vista: estudiantes ---------- */

  function parsearLinea(linea) {
    const limpiarDni = (v) => String(v || "").replace(/[.\s]/g, "");
    const cortar = (separador) => linea.split(separador).map((p) => p.trim());

    if (linea.includes("\t") || (linea.includes(";") && !cortar(";")[0].includes(","))) {
      const p = cortar(linea.includes("\t") ? "\t" : ";");
      if (p.length === 2 && /^[\d.\s]+$/.test(p[1])) {
        const palabras = p[0].split(/\s+/);
        return { apellido: palabras[0], nombre: palabras.slice(1).join(" "), dni: limpiarDni(p[1]) };
      }
      return { apellido: p[0] || "", nombre: p[1] || "", dni: limpiarDni(p[2]) };
    }
    if (linea.includes(";")) {
      const [nombres, dni] = cortar(";");
      const i = nombres.indexOf(",");
      return { apellido: nombres.slice(0, i).trim(), nombre: nombres.slice(i + 1).trim(), dni: limpiarDni(dni) };
    }
    if (linea.includes(",")) {
      const p = cortar(",");
      return { apellido: p[0] || "", nombre: p[1] || "", dni: limpiarDni(p[2]) };
    }
    const palabras = linea.split(/\s+/);
    return { apellido: palabras[0], nombre: palabras.slice(1).join(" "), dni: "" };
  }

  function parsearLista(texto) {
    return texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map(parsearLinea);
  }

  function definicionNivel() {
    return core.nivelDe(estado.nivel);
  }

  function puedeConfigurar() {
    const p = ctx.perfil || {};
    if (estado.nivel === "Secundario") return false;
    if (p.rol !== "admin" && p.rol !== "directivo") return false;
    const c = core.cursoDe(estado.nivel, estado.curso);
    return !(estado.nivel === "Inicial" && c && c.sala < 4);
  }

  function camposConfig() {
    if (estado.nivel === "Primario") {
      return {
        textos: [["docentes", "Docentes del curso"]],
        firmas: [["firmasDocentes", "Firmas de los docentes"], ["firmasDirector", "Firmas de dirección"]]
      };
    }
    return {
      textos: [["docentes1", "Docentes 1ª etapa"], ["docentes2", "Docentes 2ª etapa"]],
      firmas: [["firmas1", "Firmas docentes 1ª etapa"], ["firmas2", "Firmas docentes 2ª etapa"], ["firmasDirector", "Firmas de dirección"]]
    };
  }

  function borradorConfig() {
    if (!estado.borradorConfig) {
      const guardada = configCurso();
      const defecto = (definicionNivel().CURSOS_DEFECTO || {})[estado.curso] || {};
      const campos = camposConfig();
      const b = {};
      campos.textos.forEach(([k]) => (b[k] = guardada[k] !== undefined ? guardada[k] : defecto[k] || ""));
      campos.firmas.forEach(([k]) => (b[k] = (guardada[k] || defecto[k] || []).slice()));
      estado.borradorConfig = b;
    }
    return estado.borradorConfig;
  }

  function htmlConfigCurso() {
    const b = borradorConfig();
    const campos = camposConfig();
    const textos = campos.textos.map(([k, etq]) => `<label class="lb-campo"><span>${esc(etq)}</span><input type="text" data-cfg="${k}" value="${esc(b[k])}" maxlength="200" placeholder="Ej: Apellido Nombre - Apellido Nombre"></label>`).join("");
    const firmas = campos.firmas.map(([k, etq]) => `<div class="lb-campo"><span>${esc(etq)}</span>
      <div class="lb-firmas-lista">${b[k].map((f, i) => `<div class="lb-firma-item"><img src="${esc(window.LibretasHojas.firmaSrc(f))}" alt="" onerror="this.style.opacity=.25"><button class="lb-btn chico rojo" data-accion="quitar-firma" data-campo="${k}" data-indice="${i}">Quitar</button></div>`).join("")}
      ${b[k].length < 6 ? `<label class="lb-btn chico sec lb-subir">${ICONO.mas}<span>Agregar firma</span><input type="file" accept="image/*" hidden data-firma="${k}"></label>` : ""}</div></div>`).join("");
    return `<h2>Datos del curso</h2>
      <p class="lb-help">Aparecen en la portada y en las firmas de la libreta. Subí la firma sobre fondo blanco o transparente.</p>
      <div class="lb-form">${textos}${firmas}<button class="lb-btn verde" data-accion="guardar-config">Guardar datos del curso</button></div>`;
  }

  function renderConfigCurso() {
    const cont = document.getElementById("lbConfigCurso");
    if (cont) cont.innerHTML = htmlConfigCurso();
  }

  async function subirFirma(input) {
    const archivo = input.files && input.files[0];
    if (!archivo) return;
    const campo = input.dataset.firma;
    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("tipo", "firma");
    toast("Subiendo firma...", "");
    try {
      const r = await api("/api/libretas/imagen", { method: "POST", body: fd });
      borradorConfig()[campo].push(r.url);
      renderConfigCurso();
      toast("Firma subida: recordá guardar los datos del curso", "ok");
    } catch (error) {
      toast(error.message, "err");
    }
    input.value = "";
  }

  async function guardarConfig() {
    try {
      const datos = Object.assign({}, borradorConfig());
      await api("/api/libretas/config", {
        method: "PUT",
        body: JSON.stringify({ anio: estado.anio, nivel: estado.nivel, curso: estado.curso, datos })
      });
      estado.configCurso[claveConfig()] = datos;
      toast("Datos del curso guardados", "ok");
    } catch (error) {
      toast(error.message, "err");
    }
  }

  function renderAlumnos(cont) {
    const filas = estado.alumnos.map((a, i) => {
      if (estado.editandoAlumno === a.id) {
        const cursos = core.nivelDe(estado.nivel).cursos;
        return `<tr>
          <td>${i + 1}</td>
          <td><input id="edAp" value="${esc(a.apellido)}"></td>
          <td><input id="edNo" value="${esc(a.nombre)}"></td>
          <td><input id="edDni" value="${esc(a.dni)}"></td>
          <td><select id="edCurso">${cursos.map((c) => `<option value="${c.id}"${c.id === a.curso ? " selected" : ""}>${esc(c.label)}</option>`).join("")}</select></td>
          <td style="white-space:nowrap"><button class="lb-btn chico verde" data-accion="guardar-alumno" data-valor="${a.id}">Guardar</button>
          <button class="lb-btn chico sec" data-accion="cancelar-alumno">Cancelar</button></td></tr>`;
      }
      return `<tr>
        <td>${i + 1}</td><td><b>${esc(a.apellido)}</b></td><td>${esc(a.nombre)}</td><td>${esc(a.dni)}</td><td>${esc((core.cursoDe(estado.nivel, a.curso) || {}).label)}</td>
        <td style="white-space:nowrap"><button class="lb-btn chico sec" data-accion="editar-alumno" data-valor="${a.id}">Editar</button>
        <button class="lb-btn chico rojo" data-accion="eliminar-alumno" data-valor="${a.id}">Eliminar</button></td></tr>`;
    }).join("");

    cont.innerHTML = `
      <div class="lb-two">
        <div class="lb-card">
          <h2>Estudiantes de ${esc(core.cursoDe(estado.nivel, estado.curso).label)} · ${estado.anio} <span class="list-counter">(${estado.alumnos.length})</span></h2>
          ${estado.alumnos.length
            ? `<table class="lb-table"><thead><tr><th>#</th><th>Apellido</th><th>Nombre</th><th>DNI</th><th>Curso</th><th></th></tr></thead><tbody>${filas}</tbody></table>`
            : `<p class="lb-empty">Todavía no hay estudiantes en este curso.</p>`}
        </div>
        <div class="lb-card">
          <h2>Agregar estudiantes</h2>
          <p class="lb-help">Pegá la lista, un estudiante por línea: <b>APELLIDO, NOMBRE</b> (con coma). Si copiás desde Excel con columnas Apellido / Nombre / DNI también funciona.</p>
          <div class="lb-form">
            <textarea id="lbLista" placeholder="GARCIA, JUAN PABLO&#10;LOPEZ RUIZ, MARIA; 45123456"></textarea>
            <div id="lbPrevia"></div>
            <p class="lb-msg" id="lbMsgAlumnos"></p>
            <button class="lb-btn verde" data-accion="agregar-alumnos">Agregar a este curso</button>
          </div>
        </div>
        ${puedeConfigurar() ? `<div class="lb-card lb-config" id="lbConfigCurso">${htmlConfigCurso()}</div>` : ""}
      </div>`;

    const ta = document.getElementById("lbLista");
    ta.addEventListener("input", () => {
      const lista = parsearLista(ta.value);
      document.getElementById("lbPrevia").innerHTML = lista.length
        ? `<table class="lb-preview-tbl"><thead><tr><th>Apellido</th><th>Nombre</th><th>DNI</th></tr></thead><tbody>${lista.slice(0, 60).map((l) =>
            `<tr><td>${esc(l.apellido)}</td><td>${l.nombre ? esc(l.nombre) : '<span style="color:#c1121f">falta</span>'}</td><td>${esc(l.dni)}</td></tr>`).join("")}</tbody></table>`
        : "";
    });
  }

  async function agregarAlumnos() {
    const msg = document.getElementById("lbMsgAlumnos");
    const lista = parsearLista(document.getElementById("lbLista").value);
    if (!lista.length) return mostrarMensaje(msg, "Pegá al menos un estudiante", "err");
    if (lista.some((l) => !l.apellido || !l.nombre)) {
      return mostrarMensaje(msg, "Cada línea necesita apellido y nombre (usá una coma para separarlos)", "err");
    }
    try {
      mostrarMensaje(msg, "Agregando...", "");
      await api("/api/libretas/alumnos", {
        method: "POST",
        body: JSON.stringify({ anio: estado.anio, nivel: estado.nivel, curso: estado.curso, alumnos: lista })
      });
      toast(`${lista.length} estudiante${lista.length === 1 ? "" : "s"} agregado${lista.length === 1 ? "" : "s"}`, "ok");
      await cargarCurso();
    } catch (error) {
      mostrarMensaje(msg, error.message, "err");
    }
  }

  async function guardarAlumno(id) {
    try {
      await api("/api/libretas/alumnos/" + id, {
        method: "PATCH",
        body: JSON.stringify({
          apellido: document.getElementById("edAp").value,
          nombre: document.getElementById("edNo").value,
          dni: document.getElementById("edDni").value,
          curso: document.getElementById("edCurso").value
        })
      });
      estado.editandoAlumno = null;
      await cargarCurso();
    } catch (error) {
      toast(error.message, "err");
    }
  }

  async function eliminarAlumno(id) {
    const a = estado.alumnos.find((x) => x.id === id);
    if (!a) return;
    const ok = await confirmar({
      titulo: `¿Eliminar a ${a.apellido}, ${a.nombre}?`,
      mensaje: "Se borran también todas sus notas. Esta acción no se puede deshacer.",
      ok: "Sí, eliminar",
      peligro: true
    });
    if (!ok) return;
    try {
      await api("/api/libretas/alumnos/" + id, { method: "DELETE" });
      toast("Estudiante eliminado", "ok");
      await cargarCurso();
    } catch (error) {
      toast(error.message, "err");
    }
  }

  /* ---------- Vista: libretas ---------- */

  function modeloLibreta(alumnoId) {
    const alumno = estado.alumnos.find((a) => a.id === alumnoId);
    if (!alumno) return null;
    return core.armarLibreta(estado.nivel, estado.curso, alumno, estado.notas[alumnoId], estado.anio, configCurso());
  }

  function alumnosFiltrados() {
    const q = estado.filtroAlumno.trim().toLowerCase();
    if (!q) return estado.alumnos;
    return estado.alumnos.filter((a) => `${a.apellido} ${a.nombre}`.toLowerCase().includes(q));
  }

  function htmlListaLibretas(lista) {
    if (!lista.length) return `<p class="lb-empty" style="padding:14px">Ningún estudiante coincide con la búsqueda.</p>`;
    return lista.map((a) => {
      const p = core.progresoLibreta(estado.nivel, estado.curso, estado.notas[a.id]);
      const insignia = `<em class="lb-badge ${p.completas === p.total ? "ok" : "warn"}" title="${p.completas} de ${p.total} materias con notas cargadas">${p.completas}/${p.total}</em>`;
      return `<button class="${a.id === estado.alumnoLibreta ? "active" : ""}" data-accion="ver-libreta" data-valor="${a.id}"><span>${esc(a.apellido)}, ${esc(a.nombre)}</span>${insignia}</button>`;
    }).join("");
  }

  function renderLibretas(cont) {
    if (!estado.alumnos.length) {
      cont.innerHTML = sinAlumnos();
      return;
    }
    const lista = alumnosFiltrados();
    const idx = lista.findIndex((a) => a.id === estado.alumnoLibreta);
    const actual = estado.alumnos.find((a) => a.id === estado.alumnoLibreta);

    cont.innerHTML = `
      <div class="lb-libretas">
        <div class="lb-card lb-lateral">
          <div class="lb-buscar">${ICONO.buscar}<input type="search" id="lbBuscar" placeholder="Buscar estudiante..." value="${esc(estado.filtroAlumno)}" autocomplete="off"></div>
          <div class="lb-lista" id="lbLista2">${htmlListaLibretas(lista)}</div>
        </div>
        <div class="lb-card">
          <div class="lb-actions">
            <div class="lb-nav">
              <button class="lb-btn sec icono" data-accion="libreta-anterior" aria-label="Estudiante anterior"${idx <= 0 ? " disabled" : ""}>${ICONO.izq}</button>
              <span class="lb-nav-txt">${actual ? esc(actual.apellido + ", " + actual.nombre) : ""}</span>
              <button class="lb-btn sec icono" data-accion="libreta-siguiente" aria-label="Estudiante siguiente"${idx < 0 || idx >= lista.length - 1 ? " disabled" : ""}>${ICONO.der}</button>
            </div>
            <div class="lb-actions-der">
              <button class="lb-btn verde" data-accion="pdf-alumno">${ICONO.descargar}<span>PDF de este estudiante</span></button>
              <button class="lb-btn" data-accion="pdf-curso">${ICONO.descargar}<span>PDF de todo el curso</span></button>
            </div>
          </div>
          <p class="lb-msg" id="lbMsgPdf"></p>
          <div class="lb-visor" id="lbVisor"><div class="lb-visor-escala" id="lbEscala">${htmlPila(estado.alumnoLibreta)}</div></div>
          <p class="lb-hint">${ICONO.info}<span>Así se va a ver el PDF. Si falta algún dato, volvé a "Cargar notas": se guarda solo y la libreta se actualiza.</span></p>
        </div>
      </div>`;

    document.getElementById("lbBuscar").addEventListener("input", (e) => {
      estado.filtroAlumno = e.target.value;
      document.getElementById("lbLista2").innerHTML = htmlListaLibretas(alumnosFiltrados());
    });
    document.querySelectorAll("#lbEscala .lb-hoja").forEach(ajustarHoja);
    ajustarVisor();
  }

  function htmlPila(alumnoId) {
    const hojas = window.LibretasHojas.htmlHojas(modeloLibreta(alumnoId));
    return `<div class="lb-pila">${hojas.join("")}</div>`;
  }

  function claveConfig() {
    return estado.nivel + "|" + estado.curso + "|" + estado.anio;
  }

  function configCurso() {
    return (estado.configCurso && estado.configCurso[claveConfig()]) || {};
  }

  function ajustarVisor() {
    const visor = document.getElementById("lbVisor");
    const escala = document.getElementById("lbEscala");
    if (!visor || !escala) return;
    const ancho = visor.clientWidth - 28;
    const pila = escala.firstElementChild;
    if (!pila) return;
    const w = pila.offsetWidth || 1123;
    const h = pila.offsetHeight || 794;
    const s = Math.min(1, ancho / w);
    escala.style.transform = `scale(${s})`;
    escala.style.width = w + "px";
    visor.style.height = Math.round(h * s + 28) + "px";
  }

  function ajustarHoja(hoja) {
    const cuerpo = hoja && hoja.querySelector(".lb-cuerpo");
    if (!cuerpo) return;
    cuerpo.style.transform = "";
    const disponible = hoja.clientHeight - 8;
    const fin = cuerpo.offsetTop + cuerpo.offsetHeight;
    if (fin > disponible) {
      const k = (disponible - cuerpo.offsetTop) / cuerpo.offsetHeight;
      cuerpo.style.transform = `scale(${k.toFixed(4)})`;
      cuerpo.style.transformOrigin = "top left";
    }
  }

  /* ---------- Exportación a PDF ---------- */

  function cargarScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("No se pudo cargar una librería de PDF. Revisá tu conexión."));
      document.head.appendChild(s);
    });
  }

  async function prepararPdf() {
    if (!window.html2canvas) await cargarScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    if (!window.jspdf) await cargarScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  }

  function esperarImagenes(el) {
    const pendientes = Array.from(el.querySelectorAll("img")).filter((i) => !i.complete);
    return Promise.all(pendientes.map((i) => new Promise((r) => { i.onload = r; i.onerror = r; })));
  }

  function nombreArchivo(texto) {
    return texto.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
  }

  async function exportarPdf(ids, boton) {
    const msg = document.getElementById("lbMsgPdf");
    const modelos = ids.map(modeloLibreta).filter(Boolean);
    if (!modelos.length) return;
    const original = boton.innerHTML;
    const inicio = Date.now();
    boton.disabled = true;
    const stage = document.createElement("div");
    stage.className = "lb-stage";
    document.body.appendChild(stage);
    try {
      mostrarMensaje(msg, "Preparando PDF...", "");
      await prepararPdf();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      let paginas = 0;
      for (let i = 0; i < modelos.length; i++) {
        mostrarMensaje(msg, `Generando libreta ${i + 1} de ${modelos.length}...`, "");
        const hojas = window.LibretasHojas.htmlHojas(modelos[i]);
        for (const html of hojas) {
          stage.innerHTML = html;
          const hoja = stage.firstElementChild;
          await esperarImagenes(hoja);
          ajustarHoja(hoja);
          const canvas = await window.html2canvas(hoja, {
            scale: modelos.length > 1 ? 1.6 : 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
            scrollX: 0, scrollY: 0, windowWidth: hoja.offsetWidth, windowHeight: hoja.offsetHeight
          });
          if (paginas > 0) pdf.addPage();
          pdf.addImage(canvas.toDataURL("image/jpeg", modelos.length > 1 ? 0.88 : 0.92), "JPEG", 0, 0, 297, 210);
          paginas++;
        }
      }

      const curso = core.cursoDe(estado.nivel, estado.curso).label;
      const nombre = modelos.length === 1
        ? `${modelos[0].alumno.nombreCompleto} - ${curso} ${estado.anio}`
        : `Libretas ${curso} ${estado.anio}`;
      const archivo = nombreArchivo(nombre) + ".pdf";
      if (Date.now() - inicio < 3500) {
        pdf.save(archivo);
        mostrarMensaje(msg, "PDF descargado", "ok");
      } else {
        const url = URL.createObjectURL(pdf.output("blob"));
        msg.className = "lb-msg ok";
        msg.innerHTML = `${modelos.length} libretas listas. <a class="lb-btn verde chico" href="${url}" download="${esc(archivo)}" style="text-decoration:none;display:inline-block;margin-left:8px">Descargar PDF</a>`;
      }
    } catch (error) {
      mostrarMensaje(msg, error.message, "err");
    } finally {
      stage.remove();
      boton.disabled = false;
      boton.innerHTML = original;
    }
  }

  /* ---------- API pública ---------- */

  function mount(container, opciones) {
    if (root) return;
    root = container;
    ctx = opciones;
    const permitidos = nivelesPermitidos();
    if (permitidos.length && !permitidos.includes(estado.nivel)) {
      estado.nivel = permitidos.find((n) => core.nivelDe(n).disponible) || permitidos[0];
      estado.curso = core.nivelDe(estado.nivel).cursos.length ? core.nivelDe(estado.nivel).cursos[0].id : "";
    }
    montarBase();
    cargarCurso();
  }

  window.LibretasUI = { mount, htmlHojas: (vm) => window.LibretasHojas.htmlHojas(vm) };
})();
