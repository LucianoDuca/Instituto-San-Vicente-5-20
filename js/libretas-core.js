(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LibretasCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const APROBADO = 7;
  const NOTA_MAX = 10;

  /* ---------- Números ---------- */

  // Devuelve null si está vacío, NaN si es inválido. Acepta coma o punto decimal.
  function leerNumero(valor) {
    if (valor === null || valor === undefined) return null;
    const texto = String(valor).trim().replace(",", ".");
    if (texto === "") return null;
    if (!/^\d+(\.\d+)?$/.test(texto)) return NaN;
    return parseFloat(texto);
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

  /* ---------- Definición de niveles y cursos ---------- */

  const INGLES_HABILIDADES = [
    { id: "speaking", label: "Speaking" },
    { id: "listening", label: "Listening comprehension" },
    { id: "reading", label: "Reading Comprehension" },
    { id: "writing", label: "Writing" },
    { id: "use", label: "Use of English" }
  ];

  const SEC_MATERIAS = {
    "1": [
      ["lengua", "Lengua"], ["matematica", "Matemática"], ["historia", "Historia"],
      ["geografia", "Geografía"], ["biologia", "Biología"],
      ["formacion-etica", "Formación Ética y Ciudadana"],
      ["tecnologia-informatica", "Educación Tecnológica e Informática"],
      ["taller-literario", "Taller Literario"], ["educacion-fisica", "Educación Física"],
      ["artes-visuales", "Artes Visuales"], ["tutorias", "Espacio de Tutorías"]
    ],
    "2": [
      ["lengua", "Lengua"], ["matematica", "Matemática"], ["historia", "Historia"],
      ["geografia", "Geografía"], ["biologia", "Biología"], ["quimica", "Química"],
      ["formacion-etica", "Formación Ética y Ciudadana"],
      ["tecnologia-informatica", "Educación Tecnológica e Informática"],
      ["educacion-fisica", "Educación Física"], ["artes-visuales", "Artes Visuales"],
      ["tutorias", "Espacio de Tutorías"]
    ],
    "3": [
      ["lengua", "Lengua"], ["matematica", "Matemática"], ["historia", "Historia"],
      ["geografia", "Geografía"], ["biologia", "Biología"], ["fisica", "Física"],
      ["formacion-etica", "Formación Ética y Ciudadana"],
      ["tecnologia-informatica", "Educación Tecnológica e Informática"],
      ["educacion-fisica", "Educación Física"], ["educacion-artistica", "Educación Artística"],
      ["tutorias", "Espacio de Tutorías"]
    ],
    "4": [
      ["lengua-literatura", "Lengua y Literatura"], ["matematica", "Matemática"],
      ["historia", "Historia"], ["geografia", "Geografía"], ["biologia", "Biología"],
      ["politica-ciudadania", "Política y Ciudadanía"], ["tecnologia", "Educación Tecnológica"],
      ["educacion-fisica", "Educación Física"], ["educacion-artistica", "Educación Artística"],
      ["conocimiento-cientifico", "Introducción al Conocimiento Científico"],
      ["psicologia", "Psicología"], ["derecho", "Introducción al Derecho"],
      ["salud-adolescencia", "Salud y Adolescencia"], ["herramientas-digitales", "Herramientas Digitales"]
    ]
  };

  const SEC_ELECTIVOS = {
    "1": [
      ["english-workshop", "English Workshop"], ["science-club", "Science Club"],
      ["deporte", "Deporte"], ["liderazgo", "Formación en Liderazgo y Servicio"],
      ["granja", "Granja"], ["futbol", "Taller de Futbol"]
    ],
    "2": [
      ["english-workshop", "English Workshop"], ["science-club", "Science Club"],
      ["deporte", "Taller Deportivo"], ["liderazgo", "Formación en Liderazgo y Servicio"],
      ["granja", "Granja"], ["futbol", "Taller de Futbol"]
    ],
    "3": [
      ["english-workshop", "English Workshop"], ["science-club", "Science Club"],
      ["deporte", "Taller Deportivo"], ["liderazgo", "Formación en Liderazgo y Servicio"],
      ["granja", "Granja"], ["futbol", "Taller de Futbol"]
    ],
    "4": []
  };

  const NIVELES = {
    Secundario: {
      id: "Secundario",
      label: "Nivel Secundario",
      disponible: true,
      cursos: [
        { id: "1", label: "1º Año", titulo: "1° AÑO NIVEL SECUNDARIO" },
        { id: "2", label: "2º Año", titulo: "2° AÑO NIVEL SECUNDARIO" },
        { id: "3", label: "3º Año", titulo: "3° AÑO NIVEL SECUNDARIO" },
        { id: "4", label: "4º Año", titulo: "4° AÑO NIVEL SECUNDARIO" }
      ]
    },
    Primario: { id: "Primario", label: "Nivel Primario", disponible: false, cursos: [] },
    Inicial: { id: "Inicial", label: "Nivel Inicial", disponible: false, cursos: [] }
  };

  function nivelDe(nivel) {
    return NIVELES[nivel] || null;
  }

  function cursoDe(nivel, cursoId) {
    const n = nivelDe(nivel);
    return n ? n.cursos.find((c) => c.id === String(cursoId)) || null : null;
  }

  function materiasDe(cursoId) {
    return (SEC_MATERIAS[String(cursoId)] || []).map(([id, label]) => ({ id, label, clave: "mat:" + id }));
  }

  function electivosDe(cursoId) {
    return (SEC_ELECTIVOS[String(cursoId)] || []).map(([id, label]) => ({ id, label, clave: "ece:" + id }));
  }

  /* ---------- Columnas por tipo de planilla ---------- */

  const G1 = "1º Cuatrimestre";
  const G2 = "2º Cuatrimestre";

  const COLUMNAS = {
    materia: [
      { key: "p1", label: "PROCON", grupo: G1, tipo: "nota" },
      { key: "e11", label: "EV1", grupo: G1, tipo: "nota", sub: "a11" },
      { key: "e12", label: "EV2", grupo: G1, tipo: "nota", sub: "a12" },
      { key: "pm1", label: "Promedio", grupo: G1, tipo: "derivado", decimales: 1 },
      { key: "p2", label: "PROCON", grupo: G2, tipo: "nota" },
      { key: "e21", label: "EV1", grupo: G2, tipo: "nota", sub: "a21" },
      { key: "e22", label: "EV2", grupo: G2, tipo: "nota", sub: "a22" },
      { key: "pm2", label: "Promedio", grupo: G2, tipo: "derivado", decimales: 2 },
      { key: "dic", label: "Dic.", grupo: "Mesas de exámenes", tipo: "nota" },
      { key: "feb", label: "Feb.", grupo: "Mesas de exámenes", tipo: "nota" },
      { key: "fin", label: "Nota final", grupo: "Final", tipo: "nota", auto: "finAuto", decimales: 2 }
    ],
    "ing-habilidad": [
      { key: "p1", label: "PROCON", grupo: G1, tipo: "nota" },
      { key: "n1", label: "Nota", grupo: G1, tipo: "nota" },
      { key: "p2", label: "PROCON", grupo: G2, tipo: "nota" },
      { key: "n2", label: "Nota", grupo: G2, tipo: "nota" }
    ],
    "ing-general": [
      { key: "avg1", label: "Average", grupo: G1, tipo: "derivado", decimales: 2 },
      { key: "com1", label: "Comentario", grupo: G1, tipo: "texto" },
      { key: "avg2", label: "Average", grupo: G2, tipo: "derivado", decimales: 2 },
      { key: "com2", label: "Comentario", grupo: G2, tipo: "texto" },
      { key: "dic", label: "Dic.", grupo: "Mesas de exámenes", tipo: "nota" },
      { key: "feb", label: "Feb.", grupo: "Mesas de exámenes", tipo: "nota" },
      { key: "fin", label: "Nota final", grupo: "Final", tipo: "nota", auto: "finAuto", decimales: 2 }
    ],
    electivo: [
      { key: "p1", label: "Nota", grupo: G1, tipo: "nota" },
      { key: "p2", label: "Nota", grupo: G2, tipo: "nota" }
    ],
    asistencia: [
      { key: "ij1", label: "Inasist. justif.", grupo: G1, tipo: "entero" },
      { key: "ii1", label: "Inasist. injustif.", grupo: G1, tipo: "entero" },
      { key: "tj1", label: "Tard. justif.", grupo: G1, tipo: "entero" },
      { key: "ti1", label: "Tard. injustif.", grupo: G1, tipo: "entero" },
      { key: "t1", label: "Total", grupo: G1, tipo: "derivado", decimales: null },
      { key: "ij2", label: "Inasist. justif.", grupo: G2, tipo: "entero" },
      { key: "ii2", label: "Inasist. injustif.", grupo: G2, tipo: "entero" },
      { key: "tj2", label: "Tard. justif.", grupo: G2, tipo: "entero" },
      { key: "ti2", label: "Tard. injustif.", grupo: G2, tipo: "entero" },
      { key: "t2", label: "Total", grupo: G2, tipo: "derivado", decimales: null },
      { key: "ta", label: "Total anual", grupo: "Anual", tipo: "derivado", decimales: null }
    ],
    devolucion: [{ key: "texto", label: "Devolución anual", grupo: "", tipo: "texto" }]
  };

  function tipoDeClave(clave) {
    const c = String(clave || "");
    if (c === "asis") return "asistencia";
    if (c === "dev") return "devolucion";
    if (c === "ing:gen") return "ing-general";
    if (c.startsWith("ing:")) return "ing-habilidad";
    if (c.startsWith("ece:")) return "electivo";
    if (c.startsWith("mat:")) return "materia";
    return null;
  }

  function columnasDe(tipo) {
    return COLUMNAS[tipo] || [];
  }

  function clavesValidas(nivel, cursoId) {
    const set = new Set(["asis", "dev", "ing:gen"]);
    INGLES_HABILIDADES.forEach((h) => set.add("ing:" + h.id));
    materiasDe(cursoId).forEach((m) => set.add(m.clave));
    electivosDe(cursoId).forEach((e) => set.add(e.clave));
    return nivel === "Secundario" ? set : new Set();
  }

  function planillasDe(nivel, cursoId) {
    if (nivel !== "Secundario" || !cursoDe(nivel, cursoId)) return [];
    const categorias = [
      {
        id: "materias",
        label: "Materias",
        hojas: materiasDe(cursoId).map((m) => ({ clave: m.clave, label: m.label, tipo: "materia" }))
      },
      {
        id: "ingles",
        label: "Inglés",
        hojas: INGLES_HABILIDADES.map((h) => ({ clave: "ing:" + h.id, label: h.label, tipo: "ing-habilidad" }))
          .concat([{ clave: "ing:gen", label: "Resumen y final", tipo: "ing-general" }])
      }
    ];
    const electivos = electivosDe(cursoId);
    if (electivos.length) {
      categorias.push({
        id: "electivos",
        label: "Electivos (ECE)",
        hojas: electivos.map((e) => ({ clave: e.clave, label: e.label, tipo: "electivo" }))
      });
    }
    categorias.push({ id: "asistencia", label: "Asistencia", hojas: [{ clave: "asis", label: "Asistencia", tipo: "asistencia" }] });
    categorias.push({ id: "devolucion", label: "Devolución anual", hojas: [{ clave: "dev", label: "Devolución anual", tipo: "devolucion" }] });
    return categorias;
  }

  /* ---------- Validación y normalización de lo que se carga ---------- */

  function normalizarDatos(clave, datos) {
    const tipo = tipoDeClave(clave);
    if (!tipo) return { ok: false, errores: ["Planilla desconocida"] };
    const editables = columnasDe(tipo).filter((c) => c.tipo !== "derivado");
    const limpio = {};
    const errores = [];
    const origen = datos && typeof datos === "object" ? datos : {};

    editables.forEach((col) => {
      const bruto = origen[col.key];
      if (bruto === undefined || bruto === null) return;

      if (col.tipo === "texto") {
        const t = String(bruto).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 1500);
        if (t) limpio[col.key] = t;
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

  /* ---------- Cálculos ---------- */

  function notaOEfectiva(ev, act) {
    if (ev === null) return null;
    return ev >= APROBADO ? ev : act !== null ? act : ev;
  }

  function calcularMateria(datos) {
    const d = datos || {};
    const n = (k) => {
      const v = leerNumero(d[k]);
      return Number.isNaN(v) ? null : v;
    };
    const p1 = n("p1"), e11 = n("e11"), e12 = n("e12");
    const p2 = n("p2"), e21 = n("e21"), e22 = n("e22");
    const dic = n("dic"), feb = n("feb"), finManual = n("fin");

    const corregida = (ev) => {
      if (dic === null || dic < APROBADO || ev === null || ev >= APROBADO) return null;
      const media = (dic + ev) / 2;
      return media < APROBADO ? APROBADO : redondear(media, 2);
    };
    const a11 = corregida(e11), a12 = corregida(e12), a21 = corregida(e21), a22 = corregida(e22);

    const f11 = notaOEfectiva(e11, a11), f12 = notaOEfectiva(e12, a12);
    const f21 = notaOEfectiva(e21, a21), f22 = notaOEfectiva(e22, a22);

    let pm1 = null;
    if (p1 !== null && f11 !== null && f12 !== null && f11 >= APROBADO && f12 >= APROBADO) {
      pm1 = techoMedio(p1 * 0.2 + f11 * 0.4 + f12 * 0.4);
    }
    let pm2 = null;
    if (p2 !== null && f21 !== null && f22 !== null && f21 >= APROBADO && f22 >= APROBADO) {
      pm2 = redondear(p2 * 0.2 + f21 * 0.4 + f22 * 0.4, 2);
    }

    let finAuto = null;
    if (pm1 !== null && pm2 !== null && pm1 >= APROBADO && pm2 >= APROBADO) {
      finAuto = redondear((pm1 + pm2) / 2, 2);
    } else if (feb !== null && feb >= APROBADO && pm1 !== null && pm2 !== null) {
      if (pm1 < APROBADO) finAuto = redondear((pm2 + (pm1 + feb) / 2) / 2, 2);
      else if (pm2 < APROBADO) finAuto = redondear((pm1 + (pm2 + feb) / 2) / 2, 2);
    }

    return { a11, a12, a21, a22, pm1, pm2, finAuto, fin: finManual !== null ? finManual : finAuto };
  }

  function promedioSimple(valores, cantidad) {
    if (valores.length !== cantidad || valores.some((v) => v === null)) return null;
    return redondear(valores.reduce((a, b) => a + b, 0) / cantidad, 2);
  }

  function calcularInglesGeneral(datos, notasAlumno) {
    const d = datos || {};
    const mapa = notasAlumno || {};
    const valoresDe = (campo) =>
      INGLES_HABILIDADES.map((h) => {
        const v = leerNumero((mapa["ing:" + h.id] || {})[campo]);
        return Number.isNaN(v) ? null : v;
      });
    const avg1 = promedioSimple(valoresDe("n1"), INGLES_HABILIDADES.length);
    const avg2 = promedioSimple(valoresDe("n2"), INGLES_HABILIDADES.length);
    const finAuto = avg1 !== null && avg2 !== null ? redondear((avg1 + avg2) / 2, 2) : null;
    const manual = leerNumero(d.fin);
    return { avg1, avg2, finAuto, fin: manual !== null && !Number.isNaN(manual) ? manual : finAuto };
  }

  function calcularAsistencia(datos) {
    const d = datos || {};
    const suma = (claves) =>
      claves.reduce((acc, k) => {
        const v = leerNumero(d[k]);
        return acc + (v === null || Number.isNaN(v) ? 0 : v);
      }, 0);
    const hayDatos = Object.keys(d).length > 0;
    const t1 = suma(["ij1", "ii1", "tj1", "ti1"]);
    const t2 = suma(["ij2", "ii2", "tj2", "ti2"]);
    return { t1: hayDatos ? t1 : null, t2: hayDatos ? t2 : null, ta: hayDatos ? t1 + t2 : null };
  }

  function calcularClave(clave, datos, notasAlumno) {
    const tipo = tipoDeClave(clave);
    if (tipo === "materia") return calcularMateria(datos);
    if (tipo === "ing-general") return calcularInglesGeneral(datos, notasAlumno);
    if (tipo === "asistencia") return calcularAsistencia(datos);
    return {};
  }

  /* ---------- Modelo de la libreta ---------- */

  function nombreCompleto(alumno) {
    return [alumno.apellido, alumno.nombre].filter(Boolean).join(" ").toUpperCase();
  }

  function armarLibreta(nivel, cursoId, alumno, notasAlumno, anio) {
    const curso = cursoDe(nivel, cursoId);
    const mapa = notasAlumno || {};
    const get = (clave) => mapa[clave] || {};

    const materias = materiasDe(cursoId).map((m) => {
      const d = get(m.clave);
      const c = calcularMateria(d);
      return {
        clave: m.clave, label: m.label,
        p1: texto(d.p1), e11: texto(d.e11), a11: c.a11, e12: texto(d.e12), a12: c.a12, pm1: c.pm1,
        p2: texto(d.p2), e21: texto(d.e21), a21: c.a21, e22: texto(d.e22), a22: c.a22, pm2: c.pm2,
        dic: texto(d.dic), feb: texto(d.feb), fin: c.fin
      };
    });

    const gen = get("ing:gen");
    const cg = calcularInglesGeneral(gen, mapa);
    const ingles = {
      habilidades: INGLES_HABILIDADES.map((h) => {
        const d = get("ing:" + h.id);
        return { label: h.label, p1: texto(d.p1), n1: texto(d.n1), p2: texto(d.p2), n2: texto(d.n2) };
      }),
      avg1: cg.avg1, avg2: cg.avg2, fin: cg.fin,
      dic: texto(gen.dic), feb: texto(gen.feb), com1: texto(gen.com1), com2: texto(gen.com2)
    };

    const electivos = electivosDe(cursoId).map((e) => {
      const d = get(e.clave);
      return { label: e.label, p1: texto(d.p1), p2: texto(d.p2) };
    });

    const finales = materias.map((m) => m.fin);
    const promedioAnual = cg.fin !== null && finales.every((f) => f !== null)
      ? redondear((finales.reduce((a, b) => a + b, 0) + cg.fin) / (finales.length + 1), 2)
      : null;

    const ca = calcularAsistencia(get("asis"));
    const da = get("asis");
    const asistencia = {
      ij1: texto(da.ij1), ii1: texto(da.ii1), tj1: texto(da.tj1), ti1: texto(da.ti1),
      ij2: texto(da.ij2), ii2: texto(da.ii2), tj2: texto(da.tj2), ti2: texto(da.ti2),
      t1: ca.t1, t2: ca.t2, ta: ca.ta
    };

    return {
      anio,
      alumno: { id: alumno.id, nombreCompleto: nombreCompleto(alumno) },
      curso: { id: curso ? curso.id : String(cursoId), titulo: curso ? curso.titulo : "" },
      materias, ingles, electivos, promedioAnual, asistencia,
      devolucion: texto(get("dev").texto)
    };
  }

  function progresoLibreta(nivel, cursoId, notasAlumno) {
    const mapa = notasAlumno || {};
    const requeridas = materiasDe(cursoId).map((m) => m.clave);
    const conNota = requeridas.filter((c) => {
      const d = mapa[c] || {};
      return leerNumero(d.p1) !== null || leerNumero(d.e11) !== null;
    });
    return { completas: conNota.length, total: requeridas.length };
  }

  function anioLectivoActual() {
    return new Date().getFullYear();
  }

  return {
    APROBADO, NIVELES, INGLES_HABILIDADES,
    leerNumero, redondear, techoMedio, fmt,
    nivelDe, cursoDe, materiasDe, electivosDe, planillasDe, clavesValidas,
    columnasDe, tipoDeClave, normalizarDatos,
    calcularClave, calcularMateria, calcularInglesGeneral, calcularAsistencia,
    armarLibreta, progresoLibreta, nombreCompleto, anioLectivoActual
  };
});
