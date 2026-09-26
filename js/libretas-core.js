(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LibretasCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const APROBADO = 7;
  const NOTA_MAX = 10;
  const NIVELES_ORDEN = ["Inicial", "Primario", "Secundario"];

  /* ---------- Números ---------- */

  // Devuelve null si está vacío, NaN si es inválido. Acepta coma o punto decimal.
  function leerNumero(valor) {
    if (valor === null || valor === undefined) return null;
    const texto = String(valor).trim().replace(",", ".");
    if (texto === "") return null;
    if (!/^\d+(\.\d+)?$/.test(texto)) return NaN;
    return parseFloat(texto);
  }

  function num(valor) {
    const n = leerNumero(valor);
    return Number.isNaN(n) ? null : n;
  }

  function limpiarRuido(x) {
    return +Number(x).toPrecision(12);
  }

  function redondear(x, decimales) {
    const f = Math.pow(10, decimales);
    return Math.round(limpiarRuido(x * f)) / f;
  }

  function techoMedio(x) {
    return Math.ceil(limpiarRuido(x * 2)) / 2;
  }

  function fmt(numero, decimales) {
    if (numero === null || numero === undefined || Number.isNaN(numero)) return "";
    return Number(numero).toFixed(decimales);
  }

  function texto(valor) {
    return valor === null || valor === undefined ? "" : String(valor);
  }

  function promedioDe(valores, decimales) {
    const v = valores.filter((x) => x !== null && x !== undefined && !Number.isNaN(x));
    if (!v.length) return null;
    return redondear(v.reduce((a, b) => a + b, 0) / v.length, decimales === undefined ? 2 : decimales);
  }

  /* ---------- Registro de niveles ---------- */

  const definiciones = {};
  const tipos = {};
  const resolvedores = [];

  function registrar(def) {
    definiciones[def.id] = def;
    Object.assign(tipos, def.columnas || {});
    resolvedores.push({ def, tipoDeClave: def.tipoDeClave });
  }

  const marcadores = {
    Inicial: { id: "Inicial", label: "Nivel Inicial", disponible: false, cursos: [] },
    Primario: { id: "Primario", label: "Nivel Primario", disponible: false, cursos: [] },
    Secundario: { id: "Secundario", label: "Nivel Secundario", disponible: false, cursos: [] }
  };

  function nivelDe(nivel) {
    return definiciones[nivel] || marcadores[nivel] || null;
  }

  function cursoDe(nivel, cursoId) {
    const n = nivelDe(nivel);
    return n ? n.cursos.find((c) => c.id === String(cursoId)) || null : null;
  }

  function planillasDe(nivel, cursoId) {
    const d = definiciones[nivel];
    return d && cursoDe(nivel, cursoId) ? d.planillas(String(cursoId)) : [];
  }

  function clavesValidas(nivel, cursoId) {
    const d = definiciones[nivel];
    return d && cursoDe(nivel, cursoId) ? d.clavesValidas(String(cursoId)) : new Set();
  }

  function columnasDe(tipo) {
    return tipos[tipo] || [];
  }

  function resolver(clave, nivel, cursoId) {
    const c = String(clave || "");
    const lista = nivel ? resolvedores.filter((r) => r.def.id === nivel) : resolvedores;
    for (const r of lista) {
      const t = r.tipoDeClave(c, cursoId === undefined ? undefined : String(cursoId));
      if (t) return { def: r.def, tipo: t };
    }
    return null;
  }

  function tipoDeClave(clave, nivel, cursoId) {
    const r = resolver(clave, nivel, cursoId);
    return r ? r.tipo : null;
  }

  function calcularClave(clave, datos, notasAlumno, nivel, cursoId) {
    const r = resolver(clave, nivel, cursoId);
    return r && r.def.calcular ? r.def.calcular(String(clave), datos || {}, notasAlumno || {}, cursoId === undefined ? undefined : String(cursoId)) : {};
  }

  function armarLibreta(nivel, cursoId, alumno, notasAlumno, anio, config) {
    const d = definiciones[nivel];
    return d ? d.armarLibreta(String(cursoId), alumno, notasAlumno || {}, anio, config || {}) : null;
  }

  function progresoLibreta(nivel, cursoId, notasAlumno) {
    const d = definiciones[nivel];
    return d && d.progreso ? d.progreso(String(cursoId), notasAlumno || {}) : { completas: 0, total: 0 };
  }

  function nombreCompleto(alumno) {
    return [alumno.apellido, alumno.nombre].filter(Boolean).join(" ").toUpperCase();
  }

  /* ---------- Validación y normalización de lo que se carga ---------- */

  function normalizarDatos(clave, datos, nivel, cursoId) {
    const tipo = tipoDeClave(clave, nivel, cursoId);
    if (!tipo) return { ok: false, errores: ["Planilla desconocida"] };
    const editables = columnasDe(tipo).filter((c) => c.tipo !== "derivado");
    const limpio = {};
    const errores = [];
    const origen = datos && typeof datos === "object" ? datos : {};

    editables.forEach((col) => {
      const bruto = origen[col.key];
      if (bruto === undefined || bruto === null) return;

      if (col.tipo === "texto") {
        const t = String(bruto).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, col.max || 1500);
        if (t) limpio[col.key] = t;
        return;
      }

      if (col.tipo === "concepto") {
        const v = String(bruto).trim().toUpperCase();
        if (!v) return;
        if (!col.opciones.includes(v)) errores.push(`"${bruto}" no es una opción válida (${col.label})`);
        else limpio[col.key] = v;
        return;
      }

      if (col.tipo === "foto") {
        const u = String(bruto).trim();
        if (u && u.length <= 500 && /^https:\/\//.test(u)) limpio[col.key] = u;
        else if (u) errores.push(`La imagen no es válida (${col.label})`);
        return;
      }

      if (col.tipo === "check") {
        if (bruto === true || bruto === "1" || bruto === 1) limpio[col.key] = "1";
        return;
      }

      if (col.guion && String(bruto).trim() === "-") {
        limpio[col.key] = "-";
        return;
      }

      const n = leerNumero(bruto);
      if (n === null) return;
      if (Number.isNaN(n)) {
        errores.push(`"${bruto}" no es un número válido (${col.label})`);
        return;
      }
      if (col.tipo === "nota" && n > NOTA_MAX) {
        errores.push(`La nota ${bruto} supera el máximo de ${NOTA_MAX} (${col.label})`);
        return;
      }
      if (col.tipo === "entero" && n > 999) {
        errores.push(`El valor ${bruto} es demasiado alto (${col.label})`);
        return;
      }
      limpio[col.key] = String(bruto).trim().replace(",", ".");
    });

    return errores.length ? { ok: false, errores } : { ok: true, datos: limpio };
  }

  function anioLectivoActual() {
    return new Date().getFullYear();
  }

  const api = {
    APROBADO, NOTA_MAX, NIVELES_ORDEN,
    leerNumero, num, redondear, techoMedio, fmt, texto, promedioDe, nombreCompleto,
    registrar, nivelDe, cursoDe, planillasDe, clavesValidas, columnasDe, tipoDeClave,
    normalizarDatos, calcularClave, armarLibreta, progresoLibreta, anioLectivoActual
  };

  Object.defineProperty(api, "NIVELES", {
    get() {
      const out = {};
      NIVELES_ORDEN.forEach((n) => (out[n] = nivelDe(n)));
      return out;
    }
  });

  return api;
});
