const core = require("../js/libretas-core.js");
require("../js/libretas-secundaria.js");
require("../js/libretas-primaria.js");
require("../js/libretas-inicial.js");

const multer = require("multer");
const sharp = require("sharp");
const crypto = require("crypto");

const NIVELES = ["Inicial", "Primario", "Secundario"];
const BUCKET = "libretas";
const CAMPOS_TEXTO = ["docentes", "docentes1", "docentes2"];
const CAMPOS_FIRMAS = ["firmasDocentes", "firmasDirector", "firmas1", "firmas2"];
const ARCHIVO_FIRMA = /^[\w.-]+\.(png|jpg|jpeg|webp)$/i;

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => (file.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Solo se aceptan imágenes")))
});
const MAX_ALUMNOS_POR_CARGA = 200;
const MAX_ITEMS_NOTAS = 600;

function nivelesPermitidos(profile) {
  if (profile.rol === "admin" || profile.rol === "directivo") return NIVELES;
  if (profile.rol === "docente" && NIVELES.includes(profile.nivel)) return [profile.nivel];
  return [];
}

function limpiar(valor, max) {
  return String(valor || "").replace(/[<>\u0000-\u001F]/g, "").trim().slice(0, max);
}

function anioValido(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 2000 && n <= 2100 ? n : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ordenarAlumnos(lista) {
  return lista.sort((a, b) =>
    `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es", { sensitivity: "base" })
  );
}

function registrarLibretas(app, { supabaseAdmin, usuarioLogueado, soloAdmin, nombreCompleto }) {
  /* ---------- Permisos: la dirección ve todo; cada docente solo lo que le asignaron ---------- */

  async function permisosDe(req) {
    if (req.permisosLib) return req.permisosLib;
    if (req.profile.rol === "admin" || req.profile.rol === "directivo") {
      req.permisosLib = { total: true };
      return req.permisosLib;
    }
    const { data, error } = await supabaseAdmin.from("lib_asignaciones").select("nivel, curso, clave").eq("user_id", req.user.id);
    const filas = error ? [] : (data || []).filter((f) => f.nivel === req.profile.nivel);
    req.permisosLib = {
      total: false,
      error: error ? error.message : null,
      filas,
      claves: new Set(filas.map((f) => `${f.nivel}|${f.curso}|${f.clave}`)),
      cursos: new Set(filas.map((f) => `${f.nivel}|${f.curso}`))
    };
    return req.permisosLib;
  }

  const puedeCurso = (p, nivel, curso) => p.total || p.cursos.has(`${nivel}|${curso}`);
  const puedeClave = (p, nivel, curso, clave) => p.total || p.claves.has(`${nivel}|${curso}|${clave}`);

  async function exigirCurso(req, res, nivel, curso) {
    const p = await permisosDe(req);
    if (p.error) {
      res.status(500).json({ error: p.error });
      return null;
    }
    if (!puedeCurso(p, nivel, curso)) {
      res.status(403).json({ error: "No tenés materias asignadas en este curso." });
      return null;
    }
    return p;
  }

  function verificarNivel(req, res, nivel) {
    if (!NIVELES.includes(nivel)) {
      res.status(400).json({ error: "Nivel inválido" });
      return false;
    }
    if (!nivelesPermitidos(req.profile).includes(nivel)) {
      res.status(403).json({ error: "No tenés permiso para gestionar libretas de este nivel." });
      return false;
    }
    if (!core.nivelDe(nivel).disponible) {
      res.status(400).json({ error: "Este nivel todavía no está disponible en el nuevo sistema." });
      return false;
    }
    return true;
  }

  function leerContexto(req, res) {
    const anio = anioValido(req.query.anio);
    const nivel = String(req.query.nivel || "");
    const curso = String(req.query.curso || "");
    if (!anio) {
      res.status(400).json({ error: "Año lectivo inválido" });
      return null;
    }
    if (!verificarNivel(req, res, nivel)) return null;
    if (!core.cursoDe(nivel, curso)) {
      res.status(400).json({ error: "Curso inválido" });
      return null;
    }
    return { anio, nivel, curso };
  }

  app.get("/api/libretas/alumnos", usuarioLogueado, async (req, res) => {
    try {
      const ctx = leerContexto(req, res);
      if (!ctx) return;
      if (!(await exigirCurso(req, res, ctx.nivel, ctx.curso))) return;

      const { data, error } = await supabaseAdmin
        .from("lib_alumnos")
        .select("id, apellido, nombre, dni, curso, nivel, anio_lectivo")
        .eq("anio_lectivo", ctx.anio)
        .eq("nivel", ctx.nivel)
        .eq("curso", ctx.curso);

      if (error) return res.status(500).json({ error: error.message });
      return res.json(ordenarAlumnos(data));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/libretas/alumnos", usuarioLogueado, async (req, res) => {
    try {
      const anio = anioValido(req.body.anio);
      const nivel = String(req.body.nivel || "");
      const curso = String(req.body.curso || "");
      if (!anio) return res.status(400).json({ error: "Año lectivo inválido" });
      if (!verificarNivel(req, res, nivel)) return;
      if (!core.cursoDe(nivel, curso)) return res.status(400).json({ error: "Curso inválido" });
      if (!(await exigirCurso(req, res, nivel, curso))) return;

      const lista = Array.isArray(req.body.alumnos) ? req.body.alumnos : [];
      if (!lista.length) return res.status(400).json({ error: "No hay estudiantes para cargar" });
      if (lista.length > MAX_ALUMNOS_POR_CARGA) {
        return res.status(400).json({ error: `Máximo ${MAX_ALUMNOS_POR_CARGA} estudiantes por carga` });
      }

      const filas = [];
      for (const item of lista) {
        const apellido = limpiar(item.apellido, 80);
        const nombre = limpiar(item.nombre, 80);
        if (!apellido || !nombre) {
          return res.status(400).json({ error: "Cada estudiante necesita apellido y nombre" });
        }
        filas.push({
          anio_lectivo: anio,
          nivel,
          curso,
          apellido,
          nombre,
          dni: limpiar(item.dni, 20) || null,
          created_by: req.user.id,
          created_by_name: nombreCompleto(req.profile)
        });
      }

      const { data, error } = await supabaseAdmin
        .from("lib_alumnos")
        .insert(filas)
        .select("id, apellido, nombre, dni, curso, nivel, anio_lectivo");

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(ordenarAlumnos(data));
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  async function cargarAlumnoPermitido(req, res) {
    if (!UUID.test(req.params.id)) {
      res.status(400).json({ error: "Identificador de estudiante inválido" });
      return null;
    }
    const { data, error } = await supabaseAdmin
      .from("lib_alumnos")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return null;
    }
    if (!data) {
      res.status(404).json({ error: "Estudiante no encontrado" });
      return null;
    }
    if (!nivelesPermitidos(req.profile).includes(data.nivel)) {
      res.status(403).json({ error: "No tenés permiso sobre este estudiante." });
      return null;
    }
    if (!(await exigirCurso(req, res, data.nivel, data.curso))) return null;
    return data;
  }

  app.patch("/api/libretas/alumnos/:id", usuarioLogueado, async (req, res) => {
    try {
      const alumno = await cargarAlumnoPermitido(req, res);
      if (!alumno) return;

      const cambios = { updated_at: new Date().toISOString(), updated_by: req.user.id, updated_by_name: nombreCompleto(req.profile) };
      if (req.body.apellido !== undefined) {
        cambios.apellido = limpiar(req.body.apellido, 80);
        if (!cambios.apellido) return res.status(400).json({ error: "El apellido no puede quedar vacío" });
      }
      if (req.body.nombre !== undefined) {
        cambios.nombre = limpiar(req.body.nombre, 80);
        if (!cambios.nombre) return res.status(400).json({ error: "El nombre no puede quedar vacío" });
      }
      if (req.body.dni !== undefined) cambios.dni = limpiar(req.body.dni, 20) || null;
      if (req.body.curso !== undefined) {
        if (!core.cursoDe(alumno.nivel, req.body.curso)) return res.status(400).json({ error: "Curso inválido" });
        if (!(await exigirCurso(req, res, alumno.nivel, String(req.body.curso)))) return;
        cambios.curso = String(req.body.curso);
      }

      const { data, error } = await supabaseAdmin
        .from("lib_alumnos")
        .update(cambios)
        .eq("id", alumno.id)
        .select("id, apellido, nombre, dni, curso, nivel, anio_lectivo")
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/libretas/alumnos/:id", usuarioLogueado, async (req, res) => {
    try {
      const alumno = await cargarAlumnoPermitido(req, res);
      if (!alumno) return;

      const { error } = await supabaseAdmin.from("lib_alumnos").delete().eq("id", alumno.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/libretas/notas", usuarioLogueado, async (req, res) => {
    try {
      const ctx = leerContexto(req, res);
      if (!ctx) return;
      const permisos = await exigirCurso(req, res, ctx.nivel, ctx.curso);
      if (!permisos) return;

      const { data: alumnos, error } = await supabaseAdmin
        .from("lib_alumnos")
        .select("id, apellido, nombre, dni, curso, nivel, anio_lectivo")
        .eq("anio_lectivo", ctx.anio)
        .eq("nivel", ctx.nivel)
        .eq("curso", ctx.curso);

      if (error) return res.status(500).json({ error: error.message });

      const notas = {};
      if (alumnos.length) {
        const { data: filas, error: notasError } = await supabaseAdmin
          .from("lib_notas")
          .select("alumno_id, clave, datos, updated_at, updated_by_name")
          .in("alumno_id", alumnos.map((a) => a.id));

        if (notasError) return res.status(500).json({ error: notasError.message });

        filas.forEach((f) => {
          if (!puedeClave(permisos, ctx.nivel, ctx.curso, f.clave)) return;
          (notas[f.alumno_id] = notas[f.alumno_id] || {})[f.clave] = {
            datos: f.datos,
            updated_at: f.updated_at,
            updated_by_name: f.updated_by_name
          };
        });
      }

      return res.json({ alumnos: ordenarAlumnos(alumnos), notas });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/libretas/notas", usuarioLogueado, async (req, res) => {
    try {
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (!items.length) return res.status(400).json({ error: "No hay cambios para guardar" });
      if (items.length > MAX_ITEMS_NOTAS) {
        return res.status(400).json({ error: `Máximo ${MAX_ITEMS_NOTAS} cambios por guardado` });
      }

      const ids = [...new Set(items.map((i) => String(i.alumno_id || "")))];
      if (ids.some((id) => !UUID.test(id))) return res.status(400).json({ error: "Identificador de estudiante inválido" });
      const { data: alumnos, error: alumnosError } = await supabaseAdmin
        .from("lib_alumnos")
        .select("id, nivel, curso")
        .in("id", ids);

      if (alumnosError) return res.status(500).json({ error: alumnosError.message });

      const porId = new Map(alumnos.map((a) => [a.id, a]));
      const permitidos = nivelesPermitidos(req.profile);
      const permisos = await permisosDe(req);
      if (permisos.error) return res.status(500).json({ error: permisos.error });
      const guardar = [];
      const vaciar = [];
      const errores = [];

      for (const item of items) {
        const alumno = porId.get(String(item.alumno_id));
        const clave = String(item.clave || "");
        if (!alumno) {
          errores.push({ alumno_id: item.alumno_id, clave, errores: ["Estudiante no encontrado"] });
          continue;
        }
        if (!permitidos.includes(alumno.nivel) || !core.nivelDe(alumno.nivel).disponible) {
          errores.push({ alumno_id: alumno.id, clave, errores: ["Sin permiso sobre este estudiante"] });
          continue;
        }
        if (!core.clavesValidas(alumno.nivel, alumno.curso).has(clave)) {
          errores.push({ alumno_id: alumno.id, clave, errores: ["Planilla no válida para este curso"] });
          continue;
        }
        if (!puedeClave(permisos, alumno.nivel, alumno.curso, clave)) {
          errores.push({ alumno_id: alumno.id, clave, errores: ["Esta materia no está asignada a tu usuario"] });
          continue;
        }

        const resultado = core.normalizarDatos(clave, item.datos, alumno.nivel, alumno.curso);
        if (!resultado.ok) {
          errores.push({ alumno_id: alumno.id, clave, errores: resultado.errores });
          continue;
        }

        if (!Object.keys(resultado.datos).length) {
          vaciar.push({ alumno_id: alumno.id, clave });
          continue;
        }

        guardar.push({
          alumno_id: alumno.id,
          clave,
          datos: resultado.datos,
          calculado: core.calcularClave(clave, resultado.datos, null, alumno.nivel, alumno.curso),
          updated_at: new Date().toISOString(),
          updated_by: req.user.id,
          updated_by_name: nombreCompleto(req.profile)
        });
      }

      if (errores.length) return res.status(400).json({ error: "Hay datos inválidos", detalle: errores });

      if (guardar.length) {
        const { error } = await supabaseAdmin.from("lib_notas").upsert(guardar, { onConflict: "alumno_id,clave" });
        if (error) return res.status(500).json({ error: error.message });
      }

      for (const v of vaciar) {
        const { error } = await supabaseAdmin.from("lib_notas").delete().eq("alumno_id", v.alumno_id).eq("clave", v.clave);
        if (error) return res.status(500).json({ error: error.message });
      }

      return res.json({ ok: true, guardados: guardar.length, vaciados: vaciar.length });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
  supabaseAdmin.storage.listBuckets().then(async ({ data }) => {
    if (!data || !data.some((b) => b.name === BUCKET)) {
      await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
    }
  }).catch((error) => console.error("No se pudo verificar el bucket de libretas:", error.message));

  function soloAdminODirectivo(req, res) {
    if (req.profile.rol !== "admin" && req.profile.rol !== "directivo") {
      res.status(403).json({ error: "Solo administradores o directivos pueden hacer esto." });
      return false;
    }
    return true;
  }

  function limpiarConfig(datos) {
    const out = {};
    const origen = datos && typeof datos === "object" ? datos : {};
    CAMPOS_TEXTO.forEach((k) => {
      if (typeof origen[k] === "string" && origen[k].trim()) out[k] = limpiar(origen[k], 200);
    });
    CAMPOS_FIRMAS.forEach((k) => {
      if (!Array.isArray(origen[k])) return;
      const lista = origen[k]
        .map((v) => String(v || "").trim())
        .filter((v) => v.length <= 500 && (/^https:\/\//.test(v) || ARCHIVO_FIRMA.test(v)))
        .slice(0, 6);
      out[k] = lista;
    });
    return out;
  }

  app.get("/api/libretas/config", usuarioLogueado, async (req, res) => {
    try {
      const ctx = leerContexto(req, res);
      if (!ctx) return;
      if (!(await exigirCurso(req, res, ctx.nivel, ctx.curso))) return;
      const { data, error } = await supabaseAdmin
        .from("lib_cursos_config")
        .select("datos")
        .eq("anio_lectivo", ctx.anio)
        .eq("nivel", ctx.nivel)
        .eq("curso", ctx.curso)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ datos: data ? data.datos : {} });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/libretas/config", usuarioLogueado, async (req, res) => {
    try {
      if (!soloAdminODirectivo(req, res)) return;
      const anio = anioValido(req.body.anio);
      const nivel = String(req.body.nivel || "");
      const curso = String(req.body.curso || "");
      if (!anio) return res.status(400).json({ error: "Año lectivo inválido" });
      if (!verificarNivel(req, res, nivel)) return;
      if (!core.cursoDe(nivel, curso)) return res.status(400).json({ error: "Curso inválido" });

      const datos = limpiarConfig(req.body.datos);
      const { error } = await supabaseAdmin.from("lib_cursos_config").upsert(
        {
          anio_lectivo: anio,
          nivel,
          curso,
          datos,
          updated_at: new Date().toISOString(),
          updated_by: req.user.id,
          updated_by_name: nombreCompleto(req.profile)
        },
        { onConflict: "anio_lectivo,nivel,curso" }
      );
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true, datos });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post(
    "/api/libretas/imagen",
    usuarioLogueado,
    (req, res, next) => subida.single("archivo")(req, res, (err) => (err ? res.status(400).json({ error: err.message }) : next())),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ error: "No se recibió ninguna imagen" });
        const tipo = String(req.body.tipo || "");
        let ruta;
        let buffer;
        let contentType;

        if (tipo === "firma") {
          if (!soloAdminODirectivo(req, res)) return;
          buffer = await sharp(req.file.buffer).resize({ width: 600, withoutEnlargement: true }).png().toBuffer();
          contentType = "image/png";
          ruta = `firmas/${crypto.randomUUID()}.png`;
        } else if (tipo === "foto") {
          const id = String(req.body.alumno_id || "");
          if (!UUID.test(id)) return res.status(400).json({ error: "Estudiante inválido" });
          const { data: alumno, error } = await supabaseAdmin.from("lib_alumnos").select("id, nivel, curso").eq("id", id).maybeSingle();
          if (error) return res.status(500).json({ error: error.message });
          if (!alumno) return res.status(404).json({ error: "Estudiante no encontrado" });
          if (!nivelesPermitidos(req.profile).includes(alumno.nivel)) return res.status(403).json({ error: "Sin permiso sobre este estudiante" });
          const permisos = await permisosDe(req);
          if (!puedeClave(permisos, alumno.nivel, alumno.curso, "if")) return res.status(403).json({ error: "Sin permiso para cargar fotos en este curso" });
          buffer = await sharp(req.file.buffer).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
          contentType = "image/jpeg";
          ruta = `fotos/${id}/${crypto.randomUUID()}.jpg`;
        } else {
          return res.status(400).json({ error: "Tipo de imagen inválido" });
        }

        const { error: errorSubida } = await supabaseAdmin.storage.from(BUCKET).upload(ruta, buffer, { contentType, upsert: false });
        if (errorSubida) return res.status(500).json({ error: errorSubida.message });
        const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(ruta);
        return res.status(201).json({ url: data.publicUrl });
      } catch (error) {
        return res.status(500).json({ error: error.message });
      }
    }
  );

  /* ---------- Materias asignadas a cada docente ---------- */

  app.get("/api/libretas/mis-asignaciones", usuarioLogueado, async (req, res) => {
    try {
      const p = await permisosDe(req);
      if (p.error) return res.status(500).json({ error: p.error });
      if (p.total) return res.json({ total: true, asignaciones: [] });
      return res.json({ total: false, asignaciones: p.filas });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  async function cargarDocente(req, res) {
    if (!UUID.test(req.params.id)) {
      res.status(400).json({ error: "Usuario inválido" });
      return null;
    }
    const { data, error } = await supabaseAdmin.from("profiles").select("id, rol, nivel, nombre, apellido").eq("id", req.params.id).maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return null;
    }
    if (!data) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return null;
    }
    if (data.rol !== "docente") {
      res.status(400).json({ error: "Solo los docentes tienen materias asignadas." });
      return null;
    }
    return data;
  }

  app.get("/api/admin/libretas/asignaciones/:id", soloAdmin, async (req, res) => {
    try {
      const docente = await cargarDocente(req, res);
      if (!docente) return;
      const { data, error } = await supabaseAdmin.from("lib_asignaciones").select("nivel, curso, clave").eq("user_id", docente.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ nivel: docente.nivel, asignaciones: data });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/libretas/asignaciones/:id", soloAdmin, async (req, res) => {
    try {
      const docente = await cargarDocente(req, res);
      if (!docente) return;
      if (!NIVELES.includes(docente.nivel)) return res.status(400).json({ error: "El docente no tiene un nivel asignado." });

      const items = Array.isArray(req.body.asignaciones) ? req.body.asignaciones : [];
      if (items.length > 2000) return res.status(400).json({ error: "Demasiadas asignaciones" });

      const nuevas = new Map();
      for (const it of items) {
        const curso = String(it.curso || "");
        const clave = String(it.clave || "");
        if (!core.cursoDe(docente.nivel, curso) || !core.clavesValidas(docente.nivel, curso).has(clave)) {
          return res.status(400).json({ error: `Materia inválida para el curso ${curso}` });
        }
        nuevas.set(`${curso}|${clave}`, { user_id: docente.id, nivel: docente.nivel, curso, clave });
      }

      const { data: actuales, error: errorLeer } = await supabaseAdmin.from("lib_asignaciones").select("id, nivel, curso, clave").eq("user_id", docente.id);
      if (errorLeer) return res.status(500).json({ error: errorLeer.message });

      const sobran = actuales.filter((f) => f.nivel !== docente.nivel || !nuevas.has(`${f.curso}|${f.clave}`)).map((f) => f.id);
      if (sobran.length) {
        const { error } = await supabaseAdmin.from("lib_asignaciones").delete().in("id", sobran);
        if (error) return res.status(500).json({ error: error.message });
      }
      if (nuevas.size) {
        const { error } = await supabaseAdmin.from("lib_asignaciones").upsert([...nuevas.values()], { onConflict: "user_id,nivel,curso,clave" });
        if (error) return res.status(500).json({ error: error.message });
      }
      return res.json({ ok: true, total: nuevas.size });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  /* ---------- Alta masiva de usuarios ---------- */

  const DOMINIO_INTERNO = "sanvicente.interno";
  const LETRAS_CLAVE = "abcdefghjkmnpqrstuvwxyz23456789";

  function usuarioDesdeNombre(nombre, apellido) {
    const normalizar = (t) => String(t || "").normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "");
    return [normalizar(nombre), normalizar(apellido)].filter(Boolean).join(".");
  }

  function claveTemporal() {
    let out = "";
    for (let i = 0; i < 8; i++) out += LETRAS_CLAVE[crypto.randomInt(LETRAS_CLAVE.length)];
    return out;
  }

  app.post("/api/admin/create-users-bulk", soloAdmin, async (req, res) => {
    try {
      const lista = Array.isArray(req.body.usuarios) ? req.body.usuarios : [];
      if (!lista.length) return res.status(400).json({ error: "No hay usuarios para crear" });
      if (lista.length > 120) return res.status(400).json({ error: "Máximo 120 usuarios por carga" });

      const { data: existentes, error: errorExistentes } = await supabaseAdmin.from("profiles").select("email");
      if (errorExistentes) return res.status(500).json({ error: errorExistentes.message });
      const usados = new Set(existentes.map((p) => String(p.email || "").toLowerCase()));

      const resultados = [];
      for (const item of lista) {
        const nombre = limpiar(item.nombre, 80);
        const apellido = limpiar(item.apellido, 80);
        const rol = String(item.rol || "").trim().toLowerCase();
        const nivel = limpiar(item.nivel, 20);
        const base = { nombre, apellido, rol, nivel };

        if (!nombre || !apellido) { resultados.push({ ...base, ok: false, error: "Falta nombre o apellido" }); continue; }
        if (rol !== "docente" && rol !== "directivo") { resultados.push({ ...base, ok: false, error: "El rol debe ser docente o directivo" }); continue; }
        if (rol === "docente" && !NIVELES.includes(nivel)) { resultados.push({ ...base, ok: false, error: "El docente necesita nivel Inicial, Primario o Secundario" }); continue; }

        const usuario = usuarioDesdeNombre(nombre, apellido);
        let email = `${usuario}@${DOMINIO_INTERNO}`;
        for (let n = 2; usados.has(email); n++) email = `${usuario}${n}@${DOMINIO_INTERNO}`;

        const password = claveTemporal();
        const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) { resultados.push({ ...base, ok: false, error: error.message }); continue; }

        const { error: errorPerfil } = await supabaseAdmin.from("profiles").insert({
          id: data.user.id,
          nombre,
          apellido,
          email,
          rol,
          nivel: rol === "docente" ? nivel : "",
          area: "",
          cargo: "",
          observaciones: "",
          must_change_password: false
        });
        if (errorPerfil) {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id);
          resultados.push({ ...base, ok: false, error: errorPerfil.message });
          continue;
        }
        usados.add(email);
        resultados.push({ ...base, nivel: rol === "docente" ? nivel : "", ok: true, email, password, id: data.user.id });
      }
      return res.json({ resultados });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

}

module.exports = { registrarLibretas };
