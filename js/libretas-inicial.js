(function (root, factory) {
  if (typeof module === "object" && module.exports) factory(require("./libretas-core.js"));
  else factory(root.LibretasCore);
})(typeof self !== "undefined" ? self : this, function (core) {
  "use strict";

  const { num, texto } = core;

  const CONCEPTOS = ["ML", "L", "EP", "NR", "-"];
  const ACTITUDINAL = ["S", "F", "AV", "AN", "-"];

  const CURSOS = [];
  [2, 3, 4, 5].forEach((sala) => {
    ["S", "V"].forEach((s) => {
      CURSOS.push({ id: `${sala}${s}`, label: `Sala ${sala}º${s}`, titulo: `Sala ${sala}`, sala, seccion: s });
    });
  });

  /* ---------- Indicadores ---------- */
  // Fila: [id, etiqueta, tipo?, subfilas?]. tipo: "c" concepto (por defecto), "s" actitudinal, "n" número o texto corto.
  // Las subfilas son [id, etiqueta] y se evalúan por separado.

  const S = "s";
  const N = "n";

  const LENGUA_4 = {
    id: "lengua", label: "Lengua",
    bloques: [
      { titulo: "LENGUA ORAL", filas: [
        ["escucha", "Escucha atentamente."],
        ["transmite", "Transmite mensajes simples"],
        ["expresa", "Expresa en forma oral lo que sucede"],
        ["turno", "Respeta el turno en el uso de la palabra"],
        ["consignas", "Respeta consignas dadas"]
      ] },
      { titulo: "LENGUA ESCRITA", filas: [
        ["dibujo_letra", "Diferencia dibujo de letra."],
        ["letra_numero", "Diferencia letra de número."],
        ["reconoce_nombre", "Reconoce su nombre escrito."],
        ["escribe_nombre", "Escribe su nombre c/ soporte"],
        ["anticipa", "Anticipa el contenido de un texto."]
      ] },
      { titulo: "LITERATURA", filas: [
        ["placer", "Manifiesta placer por escuchar diversos géneros literarios."],
        ["reelabora", "Reelabora una narración"],
        ["participa", "Participa de actividades literarias y/o dramatizaciones"],
        ["secuencias", "Organiza secuencias temporales con apoyo de imágenes"],
        ["biblioteca", "Cuida y valora elementos de la biblioteca."]
      ] }
    ]
  };

  const LENGUA_5 = {
    id: "lengua", label: "Lengua",
    bloques: [
      { titulo: "LENGUA ORAL", filas: [
        ["escucha", "Escucha atentamente"],
        ["consignas", "Respeta consignas dadas"],
        ["turno", "Respeta el turno en el uso de la palabra"],
        ["palabras", "Incorpora nuevas palabras"],
        ["sonidos", "Identifica sonidos aislados de letras de una palabra", "c", [["inicial", "Inicial"], ["final", "Final"]]],
        ["describe", "Describe objetos y situaciones"]
      ] },
      { titulo: "LENGUA ESCRITA", filas: [
        ["dibujo_letra", "Diferencia dibujo de letra"],
        ["letra_numero", "Diferencia letra de número"],
        ["reconoce_nombre", "Reconoce su nombre escrito"],
        ["escribe_nombre", "Escribe su nombre", "c", [["con_soporte", "C/Soporte"], ["sin_soporte", "S/Soporte"]]],
        ["espontanea", "Produce escritura espontánea"],
        ["portadores", "Reconoce distintos portadores de texto."]
      ] },
      { titulo: "LITERATURA", filas: [
        ["placer", "Manifiesta placer por escuchar diversos géneros literarios"],
        ["secuencias", "Organiza secuencias temporales con apoyo de imágenes"],
        ["participa", "Participa de actividades literarias y/o dramatizaciones"],
        ["renarra", "Es capaz de renarrar historias respetando secuencias temporales"],
        ["biblioteca", "Cuida y valora elementos de la biblioteca"]
      ] }
    ]
  };

  const MATEMATICA_4 = {
    id: "matematica", label: "Matemática",
    bloques: [
      { titulo: "NÚMERO", filas: [
        ["recita", "Recita la serie numérica hasta", N],
        ["reconoce_numeros", "Reconoce los números escritos hasta", N],
        ["concretos", "Utiliza elementos concretos para contar"],
        ["seriaciones", "Realiza seriaciones hasta ...elementos", N]
      ] },
      { titulo: "ESPACIO", filas: [
        ["nociones", "Utiliza nociones espaciales"],
        ["adelante", "Adelante/Atrás"],
        ["arriba", "Arriba/Abajo"],
        ["adentro", "Adentro/Afuera"]
      ] },
      { titulo: "GEOMETRÍA", filas: [
        ["figuras", "Reconoce figuras geométricas", "c", [["circulo", "Círculo"], ["cuadrado", "Cuadrado"], ["triangulo", "Triángulo"]]]
      ] }
    ]
  };

  const MATEMATICA_5 = {
    id: "matematica", label: "Matemática",
    bloques: [
      { titulo: "NÚMERO", filas: [
        ["recita", "Recita la serie numérica hasta", N],
        ["reconoce_numeros", "Reconoce los números escritos hasta", N],
        ["concretos", "Utiliza elementos concretos para contar"],
        ["seriaciones", "Realiza seriaciones hasta ...elementos", N],
        ["asocia", "Asocia conteo con cantidad"],
        ["relaciones", "Establece relaciones término a término"]
      ] },
      { titulo: "ESPACIO", filas: [
        ["nociones", "Utiliza nociones espaciales"],
        ["adelante", "Adelante/Atrás"],
        ["arriba", "Arriba/Abajo"],
        ["adentro", "Adentro/Afuera"],
        ["lleno", "Lleno/Vacío"]
      ] },
      { titulo: "GEOMETRÍA", filas: [
        ["figuras", "Reconoce figuras geométricas", "c", [["circulo", "Círculo"], ["cuadrado", "Cuadrado"], ["triangulo", "Triángulo"], ["rectangulo", "Rectángulo"]]],
        ["cuerpos", "Reconoce cuerpos geométricos", "c", [["esfera", "Esfera"], ["cubo", "Cubo"], ["piramide", "Pirámide"]]]
      ] }
    ]
  };

  const SOCIALES = {
    id: "sociales", label: "Ciencias Sociales",
    bloques: [{ filas: [
      ["hechos", "Reconoce hechos y personajes de nuestra historia."],
      ["simbolos", "Respeta símbolos patrios."],
      ["temporales", "Reconoce nociones temporales ANTES/DESPUÉS"],
      ["roles", "Reconoce roles familiares cercanos."]
    ] }]
  };

  const NATURALES = {
    id: "naturales", label: "Ciencias Naturales",
    bloques: [{ filas: [
      ["cuerpo", "Reconoce partes de su cuerpo, crecimiento"],
      ["alimentacion", "Comprende la importancia de mantener una alimentación equilibrada para tener una mejor salud"],
      ["explora", "Explora el ambiente que lo rodea."],
      ["conservacion", "Comprende normas para la conservación del ambiente que lo rodea."],
      ["vivos_inertes", "Identifica características de seres vivos e inertes."],
      ["caracteristicas", "Se inicia en el reconocimiento de las características de los seres vivos."],
      ["materiales", "Se inicia en el reconocimiento de las propiedades de los materiales."],
      ["experiencias", "Realiza experiencias científicas."]
    ] }]
  };

  const PLASTICA_4 = {
    id: "plastica", label: "Plástica",
    bloques: [{ filas: [
      ["etapa", "Etapa gráfica en la que se encuentra", "c", [["renacuajo", "Renacuajo"], ["monigote", "Monigote"], ["preesquematica", "Pre-esquemática"]]],
      ["consigna", "Adecua sus trabajos a la consigna dada."],
      ["expresion", "Desarrolla formas de expresión:", "c", [["bidimensional", "Bidimensional"], ["tridimensional", "Tridimensional"]]],
      ["tijera", "Utiliza correctamente la tijera."],
      ["colores", "Reconoce colores primarios y secundarios."],
      ["lapiz", "Toma correctamente el lápiz"]
    ] }]
  };

  const PLASTICA_5 = {
    id: "plastica", label: "Plástica",
    bloques: [{ filas: [
      ["etapa", "Etapa gráfica en la que se encuentra", "c", [["renacuajo", "Renacuajo"], ["monigote", "Monigote"], ["preesquematica", "Pre-esquemática"]]],
      ["consigna", "Adecua sus trabajos a la consigna dada."],
      ["expresion", "Desarrolla formas de expresión:", "c", [["bidimensional", "Bidimensional"], ["tridimensional", "Tridimensional"]]],
      ["lapiz", "Toma correctamente el lápiz"],
      ["tijera", "Utiliza correctamente la tijera."],
      ["colores", "Reconoce colores primarios y secundarios."]
    ] }]
  };

  const MUSICA = {
    id: "musica", label: "Música",
    bloques: [{ filas: [
      ["actividades", "Participa de actividades musicales", "c", [["canta", "Canta"], ["baila", "Baila"], ["escucha", "Escucha"]]],
      ["gestos", "Imita gestos"],
      ["sonidos", "Reconoce e imita sonidos del entorno", "c", [["natural", "Natural"], ["social", "Social"], ["onomatopeyico", "Onomatopéyicos"]]],
      ["fuentes", "Reconoce fuentes sonoras."],
      ["ritmos", "Adecua sus movimientos corporales a los diferentes ritmos musicales"],
      ["convivencia", "Respeta las normas de convivencia grupalmente constituidas"]
    ] }]
  };

  const INGLES = {
    id: "ingles", label: "Inglés",
    bloques: [{ filas: [
      ["colores", "Nombra colores básicos."],
      ["vestimentas", "Vestimentas (a través de dibujos)"],
      ["saludos", "Participa en los saludos, presentación personal"],
      ["familia", "Nombra los miembros de la familia"],
      ["juguetes", "Nombra los juguetes"],
      ["transporte", "Nombra los medios de transporte"],
      ["numeros", "Reconoce y nombra los números del 1 al 10"],
      ["animo", "Reconoce y nombra los estados de ánimo"],
      ["cuerpo", "Nombra las partes del cuerpo"],
      ["escuela", "Reconoce y nombra los objetos de la escuela"]
    ] }]
  };

  const FISICA_4 = {
    id: "fisica", label: "Educación Física",
    bloques: [{ filas: [
      ["partes", "Reconoce las partes de su cuerpo y el de sus compañeros"],
      ["cuidado", "Emplea pautas básicas de cuidado de sí mismo y de otros"],
      ["orientarse", "Desarrolla la capacidad de orientarse"],
      ["situarse", "Desarrolla la capacidad dirigirse y situarse en el espacio"],
      ["empuja", "Empuja y tracciona"],
      ["habilidades", "Desarrolla habilidades motrices básicas:", "c", [["apoyo", "Apoyo"], ["rodar", "Rodar"], ["rol", "Rol"], ["desplazamiento", "Desplazamiento"]]],
      ["saltos", "Saltos"],
      ["lanzamiento", "Lanzamiento"],
      ["recepcion", "Recepción"],
      ["disfruta", "Disfruta de la actividad física"],
      ["normas", "Respeta normas de convivencia"],
      ["yoga", "Yoga"]
    ] }]
  };

  const FISICA_5 = {
    id: "fisica", label: "Educación Física",
    bloques: [{ filas: [
      ["partes", "Reconoce las partes de su cuerpo y el de sus compañeros"],
      ["cuidado", "Emplea pautas básicas de cuidado de sí mismo y de otros"],
      ["grupos", "Se integra en grupos masivos."],
      ["orientarse", "Desarrolla la capacidad de orientarse"],
      ["situarse", "Desarrolla la capacidad dirigirse y situarse en el espacio"],
      ["empuja", "Empuja y tracciona"],
      ["habilidades", "Desarrolla habilidades motrices básicas:", "c", [["apoyo", "Apoyo"], ["rodar", "Rodar"], ["rol", "Rol"], ["desplazamiento", "Desplazamiento"]]],
      ["saltos", "Saltos", "c", [["bipodales", "Bipodales"], ["unipodales", "Unipodales"]]],
      ["lanzamiento", "Lanzamiento"],
      ["recepcion", "Recepción"],
      ["disfruta", "Disfruta de la actividad física"],
      ["normas", "Respeta normas de convivencia"],
      ["yoga", "Yoga"]
    ] }]
  };

  const ACTITUDINAL_AREA = {
    id: "actitudinal", label: "Actitudinal (PROCON)",
    bloques: [{ filas: [
      ["relaciones", "Establece relaciones afectivas positivas con sus:", S, [["pares", "Pares"], ["docentes", "Docentes"]]],
      ["normas", "Acepta y cumple las normas de convivencia.", S],
      ["pertenencias", "Reconoce sus pertenencias.", S],
      ["confia", "Confía en sus posibilidades", S],
      ["termina", "Termina sus actividades", S, [["solo", "Solo"], ["ayuda", "Con ayuda"]]],
      ["independiente", "Es independiente en su accionar", S],
      ["juegos", "Participa en juegos grupales", S]
    ] }]
  };

  const AREAS = {
    4: [LENGUA_4, MATEMATICA_4, SOCIALES, NATURALES, PLASTICA_4, MUSICA, INGLES, FISICA_4, ACTITUDINAL_AREA],
    5: [LENGUA_5, MATEMATICA_5, SOCIALES, NATURALES, PLASTICA_5, MUSICA, INGLES, FISICA_5, ACTITUDINAL_AREA]
  };

  // Páginas de la libreta: cada una agrupa hasta dos áreas.
  const PAGINAS = [["lengua", "matematica"], ["sociales", "naturales"], ["plastica", "musica"], ["ingles", "fisica"], ["actitudinal"]];

  const CURSOS_DEFECTO = {
    "4S": {
      docentes1: "Marianella Sasso - Romina Pallero",
      docentes2: "Marianella Sasso - Romina Pallero",
      firmas1: ["firma-sasso.png", "firma-pallero.png"],
      firmas2: ["firma-sasso.png", "firma-pallero.png"],
      firmasDirector: ["firma-matilde.png"]
    }
  };

  function cursoInfo(cursoId) {
    return CURSOS.find((c) => c.id === cursoId);
  }

  function areasDe(cursoId) {
    const c = cursoInfo(cursoId);
    return c && AREAS[c.sala] ? AREAS[c.sala] : [];
  }

  function filasPlanas(area) {
    const out = [];
    area.bloques.forEach((b) => b.filas.forEach((f) => {
      const [id, label, tipo, subs] = f;
      if (subs && subs.length) subs.forEach(([sid, slabel]) => out.push({ id: `${id}_${sid}`, label: `${label} ${slabel}`, tipo: tipo || "c" }));
      else out.push({ id, label, tipo: tipo || "c" });
    }));
    return out;
  }

  /* ---------- Columnas ---------- */

  const COLUMNAS = {
    "ini-asis": [
      { key: "h1", label: "Días hábiles", grupo: "1ª Etapa", tipo: "entero" },
      { key: "a1", label: "Asistencias", grupo: "1ª Etapa", tipo: "entero" },
      { key: "i1", label: "Inasistencias", grupo: "1ª Etapa", tipo: "derivado", decimales: null },
      { key: "h2", label: "Días hábiles", grupo: "2ª Etapa", tipo: "entero" },
      { key: "a2", label: "Asistencias", grupo: "2ª Etapa", tipo: "entero" },
      { key: "i2", label: "Inasistencias", grupo: "2ª Etapa", tipo: "derivado", decimales: null }
    ],
    "ini-obs": [
      { key: "diag", label: "Período diagnóstico - Inicio", grupo: "Observaciones", tipo: "texto" },
      { key: "o1", label: "1ª Etapa", grupo: "Observaciones", tipo: "texto" },
      { key: "o2", label: "2ª Etapa", grupo: "Observaciones", tipo: "texto" }
    ],
    "ini-fotos": [
      { key: "diag", label: "Período diagnóstico - Inicio", grupo: "Así soy yo", tipo: "foto" },
      { key: "e1", label: "1ª Etapa", grupo: "Así soy yo", tipo: "foto" },
      { key: "e2", label: "2ª Etapa", grupo: "Así soy yo", tipo: "foto" }
    ],
    "ini-libre": [
      { key: "t1", label: "Informe 1ª etapa", grupo: "Informe", tipo: "texto", max: 4000 },
      { key: "t2", label: "Informe 2ª etapa", grupo: "Informe", tipo: "texto", max: 4000 }
    ]
  };

  [4, 5].forEach((sala) => {
    AREAS[sala].forEach((area) => {
      const cols = [];
      filasPlanas(area).forEach((f) => {
        const opciones = f.tipo === S ? ACTITUDINAL : CONCEPTOS;
        const tipoCol = f.tipo === N ? "texto" : "concepto";
        ["1", "2"].forEach((e) => {
          const col = { key: `${f.id}_${e}`, label: f.label, grupo: `${e}ª Etapa`, tipo: tipoCol };
          if (tipoCol === "concepto") col.opciones = opciones;
          else col.max = 12;
          cols.push(col);
        });
      });
      COLUMNAS[`ini${sala}-${area.id}`] = cols;
    });
  });

  function tipoDeClave(clave, cursoId) {
    if (clave === "is") return "ini-asis";
    if (clave === "io") return "ini-obs";
    if (clave === "if") return "ini-fotos";
    if (clave === "il") return "ini-libre";
    if (clave.startsWith("ia:")) {
      const c = cursoInfo(cursoId);
      if (!c) return null;
      const t = `ini${c.sala}-${clave.slice(3)}`;
      return COLUMNAS[t] ? t : null;
    }
    return null;
  }

  function clavesValidas(cursoId) {
    const c = cursoInfo(cursoId);
    const set = new Set();
    if (!c) return set;
    if (c.sala >= 4) {
      set.add("is");
      set.add("io");
      set.add("if");
      areasDe(cursoId).forEach((a) => set.add("ia:" + a.id));
    } else {
      set.add("il");
    }
    return set;
  }

  function planillas(cursoId) {
    const c = cursoInfo(cursoId);
    if (c.sala < 4) {
      return [{ id: "informe", label: "Informe", hojas: [{ clave: "il", label: "Informe de la sala", tipo: "ini-libre" }] }];
    }
    return [
      {
        id: "areas",
        label: "Áreas",
        hojas: areasDe(cursoId).map((a) => ({ clave: "ia:" + a.id, label: a.label, tipo: `ini${c.sala}-${a.id}`, formulario: true, area: a }))
      },
      { id: "asistencia", label: "Asistencia", hojas: [{ clave: "is", label: "Asistencia por etapa", tipo: "ini-asis" }] },
      {
        id: "observaciones",
        label: "Observaciones y fotos",
        hojas: [
          { clave: "io", label: "Observaciones de las etapas", tipo: "ini-obs" },
          { clave: "if", label: "Fotos “Así soy yo”", tipo: "ini-fotos" }
        ]
      }
    ];
  }

  function calcular(clave, datos) {
    const d = datos || {};
    if (clave === "is") {
      const dif = (h, a) => {
        const hh = num(h), aa = num(a);
        return hh === null || aa === null ? null : Math.max(0, hh - aa);
      };
      return { i1: dif(d.h1, d.a1), i2: dif(d.h2, d.a2) };
    }
    return {};
  }

  /* ---------- Modelo de la libreta ---------- */

  function armarLibreta(cursoId, alumno, mapa, anio, config) {
    const c = cursoInfo(cursoId);
    const get = (k) => mapa[k] || {};
    const defecto = CURSOS_DEFECTO[cursoId] || {};
    const cfg = {
      docentes1: config.docentes1 !== undefined ? config.docentes1 : defecto.docentes1 || "",
      docentes2: config.docentes2 !== undefined ? config.docentes2 : defecto.docentes2 || "",
      firmas1: config.firmas1 || defecto.firmas1 || [],
      firmas2: config.firmas2 || defecto.firmas2 || [],
      firmasDirector: config.firmasDirector || defecto.firmasDirector || []
    };

    const base = {
      tipo: "inicial",
      sala: c.sala,
      anio,
      alumno: { id: alumno.id, nombreCompleto: core.nombreCompleto(alumno), dni: texto(alumno.dni) },
      curso: { id: cursoId, titulo: c.titulo, seccion: c.seccion },
      config: cfg
    };

    if (c.sala < 4) {
      const d = get("il");
      return Object.assign(base, { texto1: texto(d.t1), texto2: texto(d.t2) });
    }

    const areas = areasDe(cursoId).map((area) => {
      const d = get("ia:" + area.id);
      return {
        id: area.id,
        label: area.label,
        bloques: area.bloques.map((b) => ({
          titulo: b.titulo || "",
          filas: b.filas.map(([id, label, tipo, subs]) => {
            const v = (k) => ({ e1: texto(d[`${k}_1`]), e2: texto(d[`${k}_2`]) });
            return {
              label,
              tipo: tipo || "c",
              valores: subs && subs.length ? null : v(id),
              subs: subs && subs.length ? subs.map(([sid, slabel]) => Object.assign({ label: slabel }, v(`${id}_${sid}`))) : null
            };
          })
        }))
      };
    });

    const da = get("is");
    const ca = calcular("is", da);
    const asistencia = [
      { h: texto(da.h1), a: texto(da.a1), i: ca.i1 === null ? "" : String(ca.i1) },
      { h: texto(da.h2), a: texto(da.a2), i: ca.i2 === null ? "" : String(ca.i2) }
    ];
    const suma = (k) => {
      const v = asistencia.map((x) => num(x[k]));
      return v.some((x) => x === null) ? "" : String(v.reduce((p, q) => p + q, 0));
    };
    const total = { h: suma("h"), a: suma("a"), i: suma("i") };

    const dobs = get("io");
    return Object.assign(base, {
      areas,
      paginas: PAGINAS.map((p) => p.filter((id) => areas.some((a) => a.id === id))).filter((p) => p.length),
      asistencia,
      total,
      observaciones: { diag: texto(dobs.diag), o1: texto(dobs.o1), o2: texto(dobs.o2) },
      fotos: { diag: texto(get("if").diag), e1: texto(get("if").e1), e2: texto(get("if").e2) }
    });
  }

  function progreso(cursoId, mapa) {
    const c = cursoInfo(cursoId);
    if (c.sala < 4) {
      return { completas: Object.keys(mapa.il || {}).length ? 1 : 0, total: 1 };
    }
    const claves = areasDe(cursoId).map((a) => "ia:" + a.id);
    return { completas: claves.filter((k) => Object.keys(mapa[k] || {}).length > 0).length, total: claves.length };
  }

  core.registrar({
    id: "Inicial",
    label: "Nivel Inicial",
    disponible: true,
    cursos: CURSOS,
    columnas: COLUMNAS,
    tipoDeClave,
    clavesValidas,
    planillas,
    calcular,
    armarLibreta,
    progreso,
    resumen: (cursoId) => (cursoInfo(cursoId) && cursoInfo(cursoId).sala < 4 ? "Informe descriptivo por etapa" : "Se evalúa con ML, L, EP y NR"),
    CURSOS_DEFECTO,
    filasPlanas
  });
});
