const core = require("../js/libretas-core.js");

const NIVELES = ["Inicial", "Primario", "Secundario"];
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

function registrarLibretas(app, { supabaseAdmin, usuarioLogueado, nombreCompleto }) {
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

      const lista = Array.isArray(req.body.alumnos) ? req.body.alumnos : [];
      if (!lista.length) return res.status(400).json({ error: "No hay alumnos para cargar" });
      if (lista.length > MAX_ALUMNOS_POR_CARGA) {
        return res.status(400).json({ error: `Máximo ${MAX_ALUMNOS_POR_CARGA} alumnos por carga` });
      }

      const filas = [];
      for (const item of lista) {
        const apellido = limpiar(item.apellido, 80);
        const nombre = limpiar(item.nombre, 80);
        if (!apellido || !nombre) {
          return res.status(400).json({ error: "Cada alumno necesita apellido y nombre" });
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
      res.status(400).json({ error: "Identificador de alumno inválido" });
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
      res.status(404).json({ error: "Alumno no encontrado" });
      return null;
    }
    if (!nivelesPermitidos(req.profile).includes(data.nivel)) {
      res.status(403).json({ error: "No tenés permiso sobre este alumno." });
      return null;
    }
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
      if (req.profile.rol !== "admin" && req.profile.rol !== "directivo") {
        return res.status(403).json({ error: "Solo administradores o directivos pueden eliminar alumnos." });
      }
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
      if (ids.some((id) => !UUID.test(id))) return res.status(400).json({ error: "Identificador de alumno inválido" });
      const { data: alumnos, error: alumnosError } = await supabaseAdmin
        .from("lib_alumnos")
        .select("id, nivel, curso")
        .in("id", ids);

      if (alumnosError) return res.status(500).json({ error: alumnosError.message });

      const porId = new Map(alumnos.map((a) => [a.id, a]));
      const permitidos = nivelesPermitidos(req.profile);
      const guardar = [];
      const vaciar = [];
      const errores = [];

      for (const item of items) {
        const alumno = porId.get(String(item.alumno_id));
        const clave = String(item.clave || "");
        if (!alumno) {
          errores.push({ alumno_id: item.alumno_id, clave, errores: ["Alumno no encontrado"] });
          continue;
        }
        if (!permitidos.includes(alumno.nivel) || !core.nivelDe(alumno.nivel).disponible) {
          errores.push({ alumno_id: alumno.id, clave, errores: ["Sin permiso sobre este alumno"] });
          continue;
        }
        if (!core.clavesValidas(alumno.nivel, alumno.curso).has(clave)) {
          errores.push({ alumno_id: alumno.id, clave, errores: ["Planilla no válida para este curso"] });
          continue;
        }

        const resultado = core.normalizarDatos(clave, item.datos);
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
          calculado: core.calcularClave(clave, resultado.datos, null),
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
}

module.exports = { registrarLibretas };
