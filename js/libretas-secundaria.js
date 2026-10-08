(function (root, factory) {
  if (typeof module === "object" && module.exports) factory(require("./libretas-core.js"));
  else factory(root.LibretasCore);
})(typeof self !== "undefined" ? self : this, function (core) {
  "use strict";

  const { leerNumero, num, redondear, techoMedio, texto } = core;
  const APROBADO = 7;

  const INGLES_HABILIDADES = [
    { id: "speaking", label: "Speaking" },
    { id: "listening", label: "Listening comprehension" },
    { id: "reading", label: "Reading Comprehension" },
    { id: "writing", label: "Writing" },
    { id: "use", label: "Use of English" }
  ];

  const MATERIAS = {
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

  const ELECTIVOS = {
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

  const CURSOS = [
    { id: "1", label: "1º Año", titulo: "1° AÑO NIVEL SECUNDARIO" },
    { id: "2", label: "2º Año", titulo: "2° AÑO NIVEL SECUNDARIO" },
    { id: "3", label: "3º Año", titulo: "3° AÑO NIVEL SECUNDARIO" },
    { id: "4", label: "4º Año", titulo: "4° AÑO NIVEL SECUNDARIO" }
  ];

  function materiasDe(cursoId) {
    return (MATERIAS[String(cursoId)] || []).map(([id, label]) => ({ id, label, clave: "mat:" + id }));
  }

  function electivosDe(cursoId) {
    return (ELECTIVOS[String(cursoId)] || []).map(([id, label]) => ({ id, label, clave: "ece:" + id }));
  }

  /* ---------- Columnas por tipo de planilla ---------- */

  const G1 = "1º Cuatrimestre";
  const G2 = "2º Cuatrimestre";

  const COLUMNAS = {
    materia: [
      { key: "p1", label: "PROCON", grupo: G1, tipo: "nota" },
      { key: "e11", label: "EV1", grupo: G1, tipo: "nota", sub: "a11" },
      { key: "e12", label: "EV2", grupo: G1, tipo: "nota", sub: "a12" },
      { key: "pm1", label: "Promedio", grupo: G1, tipo: "derivado", decimales: 1, resumen: true },
      { key: "p2", label: "PROCON", grupo: G2, tipo: "nota" },
      { key: "e21", label: "EV1", grupo: G2, tipo: "nota", sub: "a21" },
      { key: "e22", label: "EV2", grupo: G2, tipo: "nota", sub: "a22" },
      { key: "pm2", label: "Promedio", grupo: G2, tipo: "derivado", decimales: 2, resumen: true },
      { key: "dic", label: "Dic.", grupo: "Mesas de exámenes", tipo: "nota" },
      { key: "feb", label: "Feb.", grupo: "Mesas de exámenes", tipo: "nota" },
      { key: "fin", label: "Nota final", grupo: "Final", tipo: "nota", auto: "finAuto", decimales: 2, resumen: true }
    ],
    "ing-habilidad": [
      { key: "p1", label: "PROCON", grupo: G1, tipo: "nota" },
      { key: "n1", label: "Nota", grupo: G1, tipo: "nota", resumen: true },
      { key: "p2", label: "PROCON", grupo: G2, tipo: "nota" },
      { key: "n2", label: "Nota", grupo: G2, tipo: "nota", resumen: true }
    ],
    "ing-general": [
      { key: "avg1", label: "Average", grupo: G1, tipo: "derivado", decimales: 2, resumen: true },
      { key: "com1", label: "Comentario", grupo: G1, tipo: "texto" },
      { key: "avg2", label: "Average", grupo: G2, tipo: "derivado", decimales: 2, resumen: true },
      { key: "com2", label: "Comentario", grupo: G2, tipo: "texto" },
      { key: "dic", label: "Dic.", grupo: "Mesas de exámenes", tipo: "nota" },
      { key: "feb", label: "Feb.", grupo: "Mesas de exámenes", tipo: "nota" },
      { key: "fin", label: "Nota final", grupo: "Final", tipo: "nota", auto: "finAuto", decimales: 2, resumen: true }
    ],
    electivo: [
      { key: "p1", label: "Nota", grupo: G1, tipo: "nota", resumen: true },
      { key: "p2", label: "Nota", grupo: G2, tipo: "nota", resumen: true }
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
    if (clave === "asis") return "asistencia";
    if (clave === "dev") return "devolucion";
    if (clave === "ing:gen") return "ing-general";
    if (clave.startsWith("ing:")) return "ing-habilidad";
    if (clave.startsWith("ece:")) return "electivo";
    if (clave.startsWith("mat:")) return "materia";
    return null;
  }

  function clavesValidas(cursoId) {
    const set = new Set(["asis", "dev", "ing:gen"]);
    INGLES_HABILIDADES.forEach((h) => set.add("ing:" + h.id));
    materiasDe(cursoId).forEach((m) => set.add(m.clave));
    electivosDe(cursoId).forEach((e) => set.add(e.clave));
    return set;
  }

  function planillas(cursoId) {
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

  /* ---------- Cálculos ---------- */

  function notaOEfectiva(ev, act) {
    if (ev === null) return null;
    return ev >= APROBADO ? ev : act !== null ? act : ev;
  }

  function calcularMateria(datos) {
    const d = datos || {};
    const n = (k) => num(d[k]);
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

  function promedioCinco(valores) {
    if (valores.length !== INGLES_HABILIDADES.length || valores.some((v) => v === null)) return null;
    return redondear(valores.reduce((a, b) => a + b, 0) / valores.length, 2);
  }

  function calcularInglesGeneral(datos, notasAlumno) {
    const d = datos || {};
    const mapa = notasAlumno || {};
    const valoresDe = (campo) => INGLES_HABILIDADES.map((h) => num((mapa["ing:" + h.id] || {})[campo]));
    const avg1 = promedioCinco(valoresDe("n1"));
    const avg2 = promedioCinco(valoresDe("n2"));
    const finAuto = avg1 !== null && avg2 !== null ? redondear((avg1 + avg2) / 2, 2) : null;
    const manual = num(d.fin);
    return { avg1, avg2, finAuto, fin: manual !== null ? manual : finAuto };
  }

  function calcularAsistencia(datos) {
    const d = datos || {};
    const suma = (claves) => claves.reduce((acc, k) => acc + (num(d[k]) || 0), 0);
    const hayDatos = Object.keys(d).length > 0;
    const t1 = suma(["ij1", "ii1", "tj1", "ti1"]);
    const t2 = suma(["ij2", "ii2", "tj2", "ti2"]);
    return { t1: hayDatos ? t1 : null, t2: hayDatos ? t2 : null, ta: hayDatos ? t1 + t2 : null };
  }

  function calcular(clave, datos, mapa) {
    const tipo = tipoDeClave(clave);
    if (tipo === "materia") return calcularMateria(datos);
    if (tipo === "ing-general") return calcularInglesGeneral(datos, mapa);
    if (tipo === "asistencia") return calcularAsistencia(datos);
    return {};
  }

  /* ---------- Modelo de la libreta ---------- */

  function armarLibreta(cursoId, alumno, mapa, anio) {
    const curso = CURSOS.find((c) => c.id === cursoId);
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
      tipo: "secundaria",
      anio,
      alumno: { id: alumno.id, nombreCompleto: core.nombreCompleto(alumno) },
      curso: { id: cursoId, titulo: curso ? curso.titulo : "" },
      materias, ingles, electivos, promedioAnual, asistencia,
      devolucion: texto(get("dev").texto)
    };
  }

  function progreso(cursoId, mapa) {
    const requeridas = materiasDe(cursoId).map((m) => m.clave);
    const conNota = requeridas.filter((c) => Object.keys(mapa[c] || {}).length > 0);
    return { completas: conNota.length, total: requeridas.length };
  }

  core.registrar({
    id: "Secundario",
    label: "Nivel Secundario",
    disponible: true,
    cursos: CURSOS,
    columnas: COLUMNAS,
    tipoDeClave,
    clavesValidas,
    planillas,
    calcular,
    armarLibreta,
    progreso,
    resumen: () => "Se aprueba con 7 o más"
  });
});
