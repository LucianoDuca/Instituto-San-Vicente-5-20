(function (root, factory) {
  if (typeof module === "object" && module.exports) factory(require("./libretas-core.js"));
  else factory(root.LibretasCore);
})(typeof self !== "undefined" ? self : this, function (core) {
  "use strict";

  const { num, redondear, texto, promedioDe } = core;
  const APROBADO = 6;

  const CONCEPTOS = ["ML", "L", "EP", "NR", "-"];
  const CONCEPTOS_INGLES = ["EX", "VG", "G", "IP", "-"];

  const CURSOS = [];
  for (let g = 1; g <= 6; g++) {
    ["S", "V"].forEach((s) => {
      CURSOS.push({ id: `${g}${s}`, label: `${g}º${s}`, titulo: `${g}º${s}`, grado: g, ciclo: g <= 3 ? 1 : 2 });
    });
  }

  const MATERIAS_C1 = [
    ["lengua", "Lengua", "LENGUA"],
    ["matematica", "Matemática", "MATEMATICA"],
    ["ciencias-naturales", "Ciencias Naturales", "CIENCIAS NATURALES"],
    ["ciencias-sociales", "Ciencias Sociales", "CIENCIAS SOCIALES"],
    ["formacion-etica", "Formación Ética y Ciudadana", ["FORMACIÓN ÉTICA", "Y CIUDADANA"]],
    ["tecnologica", "Educación Tecnológica", ["EDUCACIÓN", "TECNOLÓGICA"]],
    ["musica", "Música", "MÚSICA"],
    ["artes-visuales", "Artes Visuales", "ARTES VISUALES"],
    ["ajedrez", "Ajedrez", "AJEDREZ"],
    ["folklore", "Folklore", "FOLKLORE"],
    ["informatica", "Informática", "INFORMÁTICA"],
    ["yoga", "Yoga", "YOGA"],
    ["lsa", "LSA", "LSA"],
    ["educacion-fisica", "Educación Física", "EDUCACIÓN FÍSICA"],
    ["natacion", "Natación", "NATACIÓN"]
  ];

  const MATERIAS_C2 = [
    ["lengua", "Lengua", "LENGUA"],
    ["matematica", "Matemática", "MATEMATICA"],
    ["ciencias-naturales", "Ciencias Naturales", "CIENCIAS NATURALES"],
    ["ciencias-sociales", "Ciencias Sociales", "CIENCIAS SOCIALES"],
    ["formacion-etica", "Formación Ética y Ciudadana", ["FORMACIÓN ÉTICA", "Y CIUDADANA"]],
    ["tecnologica", "Educación Tecnológica", ["EDUCACIÓN", "TECNOLÓGICA"]],
    ["musica", "Música", "MÚSICA"],
    ["artes-visuales", "Artes Visuales", "ARTES VISUALES"],
    ["drama", "Drama", "DRAMA"],
    ["informatica", "Informática", "INFORMÁTICA"],
    ["educacion-fisica", "Educación Física", "EDUCACIÓN FÍSICA"]
  ];

  const INGLES_C1 = [
    ["speaking", "Speaking", "SPEAKING"],
    ["listening", "Listening comprehension", ["LISTENING", "COMPREHENSION"]],
    ["use", "Use of English", "USE OF ENGLISH"]
  ];

  const INGLES_C2 = [
    ["literature", "Literature", "LITERATURE"],
    ["speaking", "Speaking", "SPEAKING"],
    ["listening", "Listening comprehension", ["LISTENING", "COMPREHENSION"]],
    ["reading", "Reading comprehension", ["READING", "COMPREHENSION"]],
    ["use", "Use of English", "USE OF ENGLISH"]
  ];

  // Docentes y firmas por defecto (tomados del sistema anterior); se pueden cambiar por curso desde el panel.
  const CURSOS_DEFECTO = {
    "1S": { docentes: "Roldán Soledad - Arano Jennifer", firmasDocentes: ["firma-soldad-roldan.png", "firma-arano.png"], firmasDirector: ["firma-dire.png"] },
    "1V": { docentes: "Lomoro Ángeles - Arano Jennifer", firmasDocentes: ["firma-lomoro.png", "firma-arano.png"], firmasDirector: ["firma-dire.png"] },
    "2S": { docentes: "Schneir Carolina", firmasDocentes: ["firma-carolina-s.png"], firmasDirector: ["firma-dire.png"] },
    "2V": { docentes: "Sairo Paulina", firmasDocentes: ["firma-sairo.png"], firmasDirector: ["firma-dire.png"] },
    "4S": { docentes: "Gil Ines - Pascual Nadia", firmasDocentes: ["firma-gil-ines.png", "firma-nadia-4.png"], firmasDirector: ["firma-dire.png", "firma-ana.png"] }
  };

  function cursoInfo(cursoId) {
    return CURSOS.find((c) => c.id === cursoId);
  }

  function materiasDe(cursoId) {
    const c = cursoInfo(cursoId);
    const base = c && c.ciclo === 1 ? MATERIAS_C1 : MATERIAS_C2;
    return base.map(([id, label, cabecera]) => ({ id, label, cabecera, clave: "pm:" + id }));
  }

  function inglesDe(cursoId) {
    const c = cursoInfo(cursoId);
    const base = c && c.ciclo === 1 ? INGLES_C1 : INGLES_C2;
    return base.map(([id, label, cabecera]) => ({ id, label, cabecera, clave: "pi:" + id }));
  }

  /* ---------- Columnas por tipo de planilla ---------- */

  const T = "Trimestres";
  const R = "Recuperatorios";
  const F = "Final";

  function colsConcepto(opciones) {
    return [
      { key: "t1", label: "1º Trim.", grupo: T, tipo: "concepto", opciones, resumen: true },
      { key: "t2", label: "2º Trim.", grupo: T, tipo: "concepto", opciones, resumen: true },
      { key: "t3", label: "3º Trim.", grupo: T, tipo: "concepto", opciones, resumen: true },
      { key: "dic", label: "Dic.", grupo: R, tipo: "concepto", opciones },
      { key: "feb", label: "Feb.", grupo: R, tipo: "concepto", opciones },
      { key: "fin", label: "Nota final", grupo: F, tipo: "concepto", opciones, resumen: true }
    ];
  }

  const COLS_NUM = [
    { key: "t1", label: "1º Trim.", grupo: T, tipo: "nota", guion: true, aprobado: APROBADO, resumen: true },
    { key: "t2", label: "2º Trim.", grupo: T, tipo: "nota", guion: true, aprobado: APROBADO, resumen: true },
    { key: "t3", label: "3º Trim.", grupo: T, tipo: "nota", guion: true, aprobado: APROBADO, resumen: true },
    { key: "dic", label: "Dic.", grupo: R, tipo: "nota", aprobado: APROBADO },
    { key: "feb", label: "Feb.", grupo: R, tipo: "nota", aprobado: APROBADO },
    { key: "fin", label: "Nota final", grupo: F, tipo: "nota", auto: "finAuto", decimales: 2, aprobado: APROBADO, resumen: true }
  ];

  const COLUMNAS = {
    "pri1-materia": colsConcepto(CONCEPTOS),
    "pri1-ingles": colsConcepto(CONCEPTOS_INGLES).filter((c) => c.key !== "fin"),
    "pri1-ingles-avg": colsConcepto(CONCEPTOS_INGLES).filter((c) => c.key !== "dic" && c.key !== "feb"),
    "pri1-procon": [
      { key: "t1", label: "1º Trim.", grupo: T, tipo: "nota", aprobado: APROBADO },
      { key: "t2", label: "2º Trim.", grupo: T, tipo: "nota", aprobado: APROBADO },
      { key: "t3", label: "3º Trim.", grupo: T, tipo: "nota", aprobado: APROBADO },
      { key: "c1", label: "1º Trim.", grupo: "Se muestra como", tipo: "derivado", decimales: null, resumen: true },
      { key: "c2", label: "2º Trim.", grupo: "Se muestra como", tipo: "derivado", decimales: null, resumen: true },
      { key: "c3", label: "3º Trim.", grupo: "Se muestra como", tipo: "derivado", decimales: null, resumen: true },
      { key: "dic", label: "Dic.", grupo: R, tipo: "concepto", opciones: CONCEPTOS },
      { key: "feb", label: "Feb.", grupo: R, tipo: "concepto", opciones: CONCEPTOS },
      { key: "fin", label: "Nota final", grupo: F, tipo: "concepto", opciones: CONCEPTOS }
    ],
    "pri2-materia": COLS_NUM,
    "pri-asis": [1, 2, 3].flatMap((n) => {
      const g = `${n}º Trimestre`;
      return [
        { key: "h" + n, label: "Días hábiles", grupo: g, tipo: "entero" },
        { key: "i" + n, label: "Inasistencias", grupo: g, tipo: "entero" },
        { key: "r" + n, label: "Tardanzas", grupo: g, tipo: "entero" },
        { key: "tt" + n, label: "Total", grupo: g, tipo: "entero", auto: "tot" + n, decimales: null }
      ];
    }),
    "pri-dev": [
      { key: "d1", label: "1º Trimestre", grupo: "Devolución / Comments", tipo: "texto" },
      { key: "d2", label: "2º Trimestre", grupo: "Devolución / Comments", tipo: "texto" },
      { key: "d3", label: "3º Trimestre", grupo: "Devolución / Comments", tipo: "texto" }
    ],
    "pri-fin": [
      { key: "prom", label: "Promedio final", grupo: "Cierre del año", tipo: "texto", max: 12 },
      { key: "prom_a", label: "Promovido a", grupo: "Cierre del año", tipo: "texto", max: 40 },
      { key: "acomp", label: "Promovido c/ acompañamiento a", grupo: "Cierre del año", tipo: "texto", max: 40 },
      { key: "perm", label: "Permanece en", grupo: "Cierre del año", tipo: "texto", max: 40 },
      { key: "f1", label: "1º Trim.", grupo: "Firmas visibles en la libreta", tipo: "check" },
      { key: "f2", label: "2º Trim.", grupo: "Firmas visibles en la libreta", tipo: "check" },
      { key: "f3", label: "3º Trim.", grupo: "Firmas visibles en la libreta", tipo: "check" }
    ]
  };

  // El tipo real depende del ciclo del curso (1º a 3º: conceptos; 4º a 6º: notas numéricas).
  function tipoFinal(clave, ciclo) {
    if (clave === "pa") return "pri-asis";
    if (clave === "pd") return "pri-dev";
    if (clave === "pf") return "pri-fin";
    if (clave === "pp") return ciclo === 1 ? "pri1-procon" : "pri2-materia";
    if (clave === "pi:average") return ciclo === 1 ? "pri1-ingles-avg" : null;
    if (clave.startsWith("pm:")) return ciclo === 1 ? "pri1-materia" : "pri2-materia";
    if (clave.startsWith("pi:")) return ciclo === 1 ? "pri1-ingles" : "pri2-materia";
    return null;
  }

  function tipoDeClave(clave, cursoId) {
    const c = cursoInfo(cursoId);
    return c ? tipoFinal(clave, c.ciclo) : null;
  }

  /* ---------- Cálculos ---------- */

  function conceptoDeNota(n) {
    if (n === null) return "";
    if (n >= 9) return "ML";
    if (n >= 7) return "L";
    if (n >= 5) return "EP";
    return "NR";
  }

  function finAutoNumerico(d) {
    const valores = [];
    for (const k of ["t1", "t2", "t3"]) {
      const v = String(d[k] === undefined ? "" : d[k]).trim();
      if (v === "-") continue;
      const n = num(v);
      if (n === null) return null;
      valores.push(n);
    }
    if (!valores.length || valores.some((n) => n < APROBADO)) return null;
    return redondear(valores.reduce((a, b) => a + b, 0) / valores.length, 2);
  }

  function calcular(clave, datos, ciclo) {
    const d = datos || {};
    if (clave === "pa") {
      const out = {};
      [1, 2, 3].forEach((n) => {
        const i = num(d["i" + n]), r = num(d["r" + n]);
        out["tot" + n] = i === null && r === null ? null : (i || 0) + (r || 0);
      });
      return out;
    }
    if (ciclo === 1) {
      if (clave === "pp") return { c1: conceptoDeNota(num(d.t1)), c2: conceptoDeNota(num(d.t2)), c3: conceptoDeNota(num(d.t3)) };
      return {};
    }
    if (clave === "pp" || clave.startsWith("pm:") || clave.startsWith("pi:")) {
      const finAuto = finAutoNumerico(d);
      const manual = num(d.fin);
      return { finAuto, fin: manual !== null ? manual : finAuto };
    }
    return {};
  }

  function calcularEnCurso(clave, datos, mapa, cursoId) {
    const c = cursoInfo(cursoId);
    return c ? calcular(clave, datos, c.ciclo) : {};
  }

  /* ---------- Planillas ---------- */

  function clavesValidas(cursoId) {
    const c = cursoInfo(cursoId);
    const set = new Set(["pa", "pd", "pf", "pp"]);
    materiasDe(cursoId).forEach((m) => set.add(m.clave));
    inglesDe(cursoId).forEach((i) => set.add(i.clave));
    if (c && c.ciclo === 1) set.add("pi:average");
    return set;
  }

  function planillas(cursoId) {
    const c = cursoInfo(cursoId);
    const t = (clave) => tipoFinal(clave, c.ciclo);
    const ingles = inglesDe(cursoId).map((i) => ({ clave: i.clave, label: i.label, tipo: t(i.clave) }));
    if (c.ciclo === 1) ingles.push({ clave: "pi:average", label: "Average", tipo: "pri1-ingles-avg" });
    return [
      {
        id: "materias",
        label: "Materias",
        hojas: materiasDe(cursoId).map((m) => ({ clave: m.clave, label: m.label, tipo: t(m.clave) }))
          .concat([{ clave: "pp", label: "PROCON", tipo: t("pp") }])
      },
      { id: "ingles", label: "Inglés", hojas: ingles },
      { id: "asistencia", label: "Asistencia", hojas: [{ clave: "pa", label: "Asistencia", tipo: "pri-asis" }] },
      { id: "devolucion", label: "Devolución", hojas: [{ clave: "pd", label: "Devolución / Comments", tipo: "pri-dev" }] },
      { id: "cierre", label: "Cierre del año", hojas: [{ clave: "pf", label: "Promedio final, promoción y firmas", tipo: "pri-fin" }] }
    ];
  }

  /* ---------- Modelo de la libreta ---------- */

  const FILAS = ["t1", "t2", "t3", "dic", "feb", "fin"];

  function armarLibreta(cursoId, alumno, mapa, anio, config) {
    const c = cursoInfo(cursoId);
    const ciclo = c.ciclo;
    const get = (clave) => mapa[clave] || {};
    const defecto = CURSOS_DEFECTO[cursoId] || { docentes: "", firmasDocentes: [], firmasDirector: [] };
    const cfg = {
      docentes: config.docentes !== undefined && config.docentes !== null ? config.docentes : defecto.docentes,
      firmasDocentes: config.firmasDocentes || defecto.firmasDocentes,
      firmasDirector: config.firmasDirector || defecto.firmasDirector
    };

    const valoresDe = (clave) => {
      const d = get(clave);
      const calc = calcular(clave, d, ciclo);
      const v = {};
      FILAS.forEach((k) => (v[k] = k === "fin" && ciclo === 2 ? (calc.fin === null || calc.fin === undefined ? "" : String(calc.fin)) : texto(d[k])));
      if (ciclo === 2 && v.fin !== "") v.fin = core.fmt(Number(v.fin), 2);
      return v;
    };

    const materias = materiasDe(cursoId).map((m) => ({ label: m.label, cabecera: m.cabecera, v: valoresDe(m.clave) }));

    const dp = get("pp");
    const cp = calcular("pp", dp, ciclo);
    const procon = { label: "PROCON", cabecera: "PROCON", v: {} };
    FILAS.forEach((k) => {
      if (ciclo === 1 && (k === "t1" || k === "t2" || k === "t3")) procon.v[k] = cp["c" + k.slice(1)] || "";
      else procon.v[k] = texto(dp[k]);
    });
    if (ciclo === 2) procon.v = valoresDe("pp");

    const ingles = inglesDe(cursoId).map((i) => ({ label: i.label, cabecera: i.cabecera, v: valoresDe(i.clave) }));
    let average;
    if (ciclo === 1) {
      average = { label: "Average", cabecera: "AVERAGE", v: valoresDe("pi:average") };
    } else {
      const v = {};
      FILAS.forEach((k) => {
        const p = promedioDe(ingles.map((i) => num(i.v[k])), 2);
        v[k] = p === null ? "" : core.fmt(p, 2);
      });
      average = { label: "Average", cabecera: "AVERAGE", v };
    }

    let promTrimestral = null;
    if (ciclo === 2) {
      promTrimestral = {};
      FILAS.forEach((k) => {
        const pMaterias = promedioDe(materias.map((m) => num(m.v[k])), 2);
        const pProcon = num(procon.v[k]);
        let p = null;
        if (pMaterias !== null && pProcon !== null) p = core.redondear(pMaterias * 0.8 + pProcon * 0.2, 2);
        else if (pMaterias !== null) p = pMaterias;
        else if (pProcon !== null) p = pProcon;
        promTrimestral[k] = p === null ? "" : core.fmt(p, 2);
      });
    }

    const da = get("pa");
    const ca = calcular("pa", da, ciclo);
    const asistencia = [1, 2, 3].map((n) => {
      const manual = da["tt" + n];
      const total = manual !== undefined ? manual : ca["tot" + n] === null ? "" : String(ca["tot" + n]);
      return { h: texto(da["h" + n]), i: texto(da["i" + n]), r: texto(da["r" + n]), total };
    });

    const dd = get("pd");
    const df = get("pf");

    return {
      tipo: "primaria",
      ciclo,
      anio,
      alumno: { id: alumno.id, nombreCompleto: core.nombreCompleto(alumno), dni: texto(alumno.dni) },
      curso: { id: cursoId, titulo: c.titulo },
      docentes: cfg.docentes,
      firmas: { docentes: cfg.firmasDocentes, director: cfg.firmasDirector },
      materias, procon, ingles, average, promTrimestral,
      asistencia,
      devolucion: [texto(dd.d1), texto(dd.d2), texto(dd.d3)],
      final: {
        promedio: texto(df.prom), promovido: texto(df.prom_a), acomp: texto(df.acomp), permanece: texto(df.perm),
        firmas: [df.f1 === "1", df.f2 === "1", df.f3 === "1"]
      }
    };
  }

  function progreso(cursoId, mapa) {
    const requeridas = materiasDe(cursoId).map((m) => m.clave);
    const con = requeridas.filter((k) => Object.keys(mapa[k] || {}).length > 0);
    return { completas: con.length, total: requeridas.length };
  }

  const def = {
    id: "Primario",
    label: "Nivel Primario",
    disponible: true,
    cursos: CURSOS,
    columnas: COLUMNAS,
    tipoDeClave,
    clavesValidas,
    planillas,
    calcular: calcularEnCurso,
    armarLibreta,
    progreso,
    resumen: (cursoId) => (cursoInfo(cursoId) && cursoInfo(cursoId).ciclo === 1 ? "Se evalúa con conceptos: ML, L, EP y NR" : "Se aprueba con 6 o más"),
    CURSOS_DEFECTO
  };

  core.registrar(def);
});
