const express = require("express");
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "200kb" }));

/* REDIRECCIONES — URLs viejas de WordPress indexadas en Google */

app.get("/contacto/", (req, res) => res.redirect(301, "/contacto.html"));
app.get("/usuariosanvi/", (req, res) => res.redirect(301, "/login.html"));

app.use(express.static(__dirname));

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function limpiarTexto(valor) {
  if (!valor) return "";
  return String(valor).trim().replace(/[<>]/g, "").slice(0, 2500);
}

function validarUrlDrive(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function detectarRolPorEmail(email) {
  const correo = String(email || "").toLowerCase().trim();

  if (correo.endsWith("@admin.com")) return "admin";
  if (correo.endsWith("@directivos.com")) return "directivo";
  if (correo.endsWith("@docentes.com")) return "docente";

  return null;
}

async function obtenerUsuarioDesdeToken(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return { user: null, profile: null, error: "No hay token de sesión" };
  }

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);

  if (userError || !userData.user) {
    return { user: null, profile: null, error: "Sesión inválida" };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    return {
      user: userData.user,
      profile: null,
      error: "Perfil no encontrado"
    };
  }

  return {
    user: userData.user,
    profile,
    error: null
  };
}

async function soloAdmin(req, res, next) {
  const { user, profile, error } = await obtenerUsuarioDesdeToken(req);

  if (error) {
    return res.status(401).json({ error });
  }

  if (profile.rol !== "admin") {
    return res.status(403).json({
      error: "Acceso denegado. Solo administradores."
    });
  }

  req.user = user;
  req.profile = profile;
  next();
}

async function usuarioLogueado(req, res, next) {
  const { user, profile, error } = await obtenerUsuarioDesdeToken(req);

  if (error) {
    return res.status(401).json({ error });
  }

  req.user = user;
  req.profile = profile;
  next();
}

/* CONTACTO */

app.post("/api/contacto", async (req, res) => {
  try {
    const nombre = limpiarTexto(req.body.nombre);
    const apellido = limpiarTexto(req.body.apellido);
    const correo = limpiarTexto(req.body.correo);
    const telefono = limpiarTexto(req.body.telefono);
    const asunto = limpiarTexto(req.body.asunto);
    const mensaje = limpiarTexto(req.body.mensaje);

    if (!nombre || !apellido || !correo || !mensaje) {
      return res.status(400).json({
        error: "Faltan campos obligatorios"
      });
    }

    const { error } = await resend.emails.send({
      from: "Instituto San Vicente <onboarding@resend.dev>",
      to: [process.env.CONTACT_EMAIL || "lucianoduca123@gmail.com"],
      subject: asunto || "Nueva consulta desde la web",
      reply_to: correo,
      html: `
        <h2>Nueva consulta institucional</h2>
        <p><strong>Nombre:</strong> ${nombre} ${apellido}</p>
        <p><strong>Correo:</strong> ${correo}</p>
        <p><strong>Teléfono:</strong> ${telefono || "No indicado"}</p>
        <p><strong>Asunto:</strong> ${asunto || "Sin asunto"}</p>
        <hr>
        <p>${mensaje}</p>
      `
    });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({ ok: true });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

/* PERFIL */

app.get("/api/me", usuarioLogueado, async (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email
    },
    profile: req.profile
  });
});

/* BOOTSTRAP ADMIN */

app.post("/api/bootstrap-admin", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "No hay token de sesión"
      });
    }

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({
        error: "Sesión inválida"
      });
    }

    const email = userData.user.email.toLowerCase();

    if (!email.endsWith("@admin.com")) {
      return res.status(403).json({
        error: "Solo un usuario @admin.com puede inicializarse como administrador"
      });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userData.user.id,
        nombre: "Administrador",
        apellido: "San Vicente",
        email,
        rol: "admin",
        area: "Administración",
        nivel: "General",
        cargo: "Administrador principal",
        observaciones: "Perfil admin generado automáticamente",
        must_change_password: false
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      ok: true,
      profile: data
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

/* ADMIN DASHBOARD */

app.get("/api/admin/stats", soloAdmin, async (req, res) => {
  try {
    const { data: users, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("rol");

    if (usersError) {
      return res.status(500).json({
        error: usersError.message
      });
    }

    const { data: docs, error: docsError } = await supabaseAdmin
      .from("documents_library")
      .select("id");

    if (docsError) {
      return res.status(500).json({
        error: docsError.message
      });
    }

    const { data: announcements, error: annError } = await supabaseAdmin
      .from("announcements")
      .select("id");

    if (annError) {
      return res.status(500).json({
        error: annError.message
      });
    }

    return res.json({
      usuarios: users.length,
      admins: users.filter((u) => u.rol === "admin").length,
      directivos: users.filter((u) => u.rol === "directivo").length,
      docentes: users.filter((u) => u.rol === "docente").length,
      documentos: docs.length,
      comunicados: announcements.length
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

/* ADMIN USUARIOS */

app.get("/api/admin/users", soloAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json(data);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.post("/api/admin/create-user", soloAdmin, async (req, res) => {
  try {
    const email = limpiarTexto(req.body.email).toLowerCase();
    const password = String(req.body.password || "").trim();
    const rolDetectado = detectarRolPorEmail(email);

    if (!email || !password) {
      return res.status(400).json({
        error: "Email y contraseña son obligatorios"
      });
    }

    if (!rolDetectado) {
      return res.status(400).json({
        error: "El email debe terminar en @admin.com, @directivos.com o @docentes.com"
      });
    }

    const perfil = {
      nombre: limpiarTexto(req.body.nombre),
      apellido: limpiarTexto(req.body.apellido),
      email,
      rol: rolDetectado,
      area: limpiarTexto(req.body.area),
      nivel: limpiarTexto(req.body.nivel),
      cargo: limpiarTexto(req.body.cargo),
      observaciones: limpiarTexto(req.body.observaciones),
      must_change_password: true
    };

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    const userId = data.user.id;

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        ...perfil
      });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return res.status(500).json({
        error: profileError.message
      });
    }

    return res.json({
      ok: true,
      user: data.user,
      profile: {
        id: userId,
        ...perfil
      }
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.patch("/api/admin/users/:id", soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const email = limpiarTexto(req.body.email).toLowerCase();
    const rolDetectado = detectarRolPorEmail(email);

    if (!email) {
      return res.status(400).json({
        error: "El email es obligatorio"
      });
    }

    if (!rolDetectado) {
      return res.status(400).json({
        error: "El email debe terminar en @admin.com, @directivos.com o @docentes.com"
      });
    }

    const { error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(id, {
        email
      });

    if (authError) {
      return res.status(500).json({
        error: authError.message
      });
    }

    const updates = {
      nombre: limpiarTexto(req.body.nombre),
      apellido: limpiarTexto(req.body.apellido),
      email,
      rol: rolDetectado,
      area: limpiarTexto(req.body.area),
      nivel: limpiarTexto(req.body.nivel),
      cargo: limpiarTexto(req.body.cargo),
      observaciones: limpiarTexto(req.body.observaciones)
    };

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", id);

    if (profileError) {
      return res.status(500).json({
        error: profileError.message
      });
    }

    return res.json({
      ok: true,
      updates
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.patch("/api/admin/users/:id/password", soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const password = String(req.body.password || "").trim();

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 6 caracteres"
      });
    }

    const { error } =
      await supabaseAdmin.auth.admin.updateUserById(id, {
        password
      });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        must_change_password: true
      })
      .eq("id", id);

    return res.json({
      ok: true
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.delete("/api/admin/users/:id", soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } =
      await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      ok: true
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

/* BIBLIOTECA */

app.get("/api/library", usuarioLogueado, async (req, res) => {
  try {
    const rol = req.profile.rol;

    let rolesPermitidos = ["todos"];

    if (rol === "admin") {
      rolesPermitidos = ["todos", "admin", "directivo", "docente"];
    }

    if (rol === "directivo") {
      rolesPermitidos = ["todos", "directivo"];
    }

    if (rol === "docente") {
      rolesPermitidos = ["todos", "docente"];
    }

    const { data, error } = await supabaseAdmin
      .from("documents_library")
      .select("*")
      .in("rol_visible", rolesPermitidos)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json(data);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.post("/api/admin/library", soloAdmin, async (req, res) => {
  try {
    const documento = {
      titulo: limpiarTexto(req.body.titulo),
      descripcion: limpiarTexto(req.body.descripcion),
      categoria: limpiarTexto(req.body.categoria),
      nivel: limpiarTexto(req.body.nivel),
      area: limpiarTexto(req.body.area),
      rol_visible: limpiarTexto(req.body.rol_visible),
      drive_url: limpiarTexto(req.body.drive_url)
    };

    if (
      !documento.titulo ||
      !documento.categoria ||
      !documento.nivel ||
      !documento.area ||
      !documento.rol_visible ||
      !documento.drive_url
    ) {
      return res.status(400).json({
        error: "Faltan campos obligatorios del documento"
      });
    }

    if (!["admin", "directivo", "docente", "todos"].includes(documento.rol_visible)) {
      return res.status(400).json({
        error: "Rol visible inválido"
      });
    }

    if (!validarUrlDrive(documento.drive_url)) {
      return res.status(400).json({
        error: "La URL del documento debe comenzar con https://"
      });
    }

    const { data, error } = await supabaseAdmin
      .from("documents_library")
      .insert(documento)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      ok: true,
      document: data
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.patch("/api/admin/library/:id", soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const updates = {
      titulo: limpiarTexto(req.body.titulo),
      descripcion: limpiarTexto(req.body.descripcion),
      categoria: limpiarTexto(req.body.categoria),
      nivel: limpiarTexto(req.body.nivel),
      area: limpiarTexto(req.body.area),
      rol_visible: limpiarTexto(req.body.rol_visible),
      drive_url: limpiarTexto(req.body.drive_url)
    };

    if (
      !updates.titulo ||
      !updates.categoria ||
      !updates.nivel ||
      !updates.area ||
      !updates.rol_visible ||
      !updates.drive_url
    ) {
      return res.status(400).json({
        error: "Faltan campos obligatorios del documento"
      });
    }

    if (!["admin", "directivo", "docente", "todos"].includes(updates.rol_visible)) {
      return res.status(400).json({
        error: "Rol visible inválido"
      });
    }

    if (!validarUrlDrive(updates.drive_url)) {
      return res.status(400).json({
        error: "La URL del documento debe comenzar con https://"
      });
    }

    const { data, error } = await supabaseAdmin
      .from("documents_library")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      ok: true,
      document: data
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.delete("/api/admin/library/:id", soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("documents_library")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      ok: true
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

/* COMUNICADOS */

app.get("/api/announcements", usuarioLogueado, async (req, res) => {
  try {
    const rol = req.profile.rol;

    let rolesPermitidos = ["todos"];

    if (rol === "admin") {
      rolesPermitidos = ["todos", "admin", "directivo", "docente"];
    }

    if (rol === "directivo") {
      rolesPermitidos = ["todos", "directivo"];
    }

    if (rol === "docente") {
      rolesPermitidos = ["todos", "docente"];
    }

    const { data, error } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .in("rol_visible", rolesPermitidos)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json(data);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.post("/api/admin/announcements", soloAdmin, async (req, res) => {
  try {
    const comunicado = {
      titulo: limpiarTexto(req.body.titulo),
      contenido: limpiarTexto(req.body.contenido),
      rol_visible: limpiarTexto(req.body.rol_visible)
    };

    if (
      !comunicado.titulo ||
      !comunicado.contenido ||
      !comunicado.rol_visible
    ) {
      return res.status(400).json({
        error: "Faltan campos obligatorios del comunicado"
      });
    }

    if (!["admin", "directivo", "docente", "todos"].includes(comunicado.rol_visible)) {
      return res.status(400).json({
        error: "Rol visible inválido"
      });
    }

    const { data, error } = await supabaseAdmin
      .from("announcements")
      .insert(comunicado)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      ok: true,
      announcement: data
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

app.delete("/api/admin/announcements/:id", soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.json({
      ok: true
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

/* CAMBIO OBLIGATORIO DE CONTRASEÑA */

app.patch("/api/change-password", usuarioLogueado, async (req, res) => {
  try {
    const password = String(req.body.password || "").trim();

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: "La contraseña debe tener mínimo 6 caracteres"
      });
    }

    const { error: authError } =
      await supabaseAdmin.auth.admin.updateUserById(
        req.user.id,
        { password }
      );

    if (authError) {
      return res.status(500).json({
        error: authError.message
      });
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        must_change_password: false
      })
      .eq("id", req.user.id);

    if (profileError) {
      return res.status(500).json({
        error: profileError.message
      });
    }

    return res.json({
      ok: true
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
});

/* =============================================
   CLUB SANVI — GALERÍA
============================================= */

app.get("/api/club-sanvi/galeria", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("club_galeria")
      .select("*")
      .order("orden", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/admin/club-sanvi/galeria", soloAdmin, async (req, res) => {
  try {
    const url       = limpiarTexto(req.body.url);
    const alt       = limpiarTexto(req.body.alt) || "Club Sanvi";
    const disciplina = limpiarTexto(req.body.disciplina);

    if (!url || !disciplina) {
      return res.status(400).json({ error: "url y disciplina son obligatorios" });
    }
    if (!url.toLowerCase().endsWith(".webp")) {
      return res.status(400).json({ error: "Solo se aceptan imágenes en formato .webp" });
    }

    const { data: existing } = await supabaseAdmin
      .from("club_galeria")
      .select("orden")
      .order("orden", { ascending: false })
      .limit(1);
    const orden = (existing?.[0]?.orden ?? 0) + 1;

    const { data, error } = await supabaseAdmin
      .from("club_galeria")
      .insert({ url, alt, disciplina, orden })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, item: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.delete("/api/admin/club-sanvi/galeria/:id", soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: foto } = await supabaseAdmin
      .from("club_galeria")
      .select("url")
      .eq("id", id)
      .single();

    const { error } = await supabaseAdmin
      .from("club_galeria")
      .delete()
      .eq("id", id);
    if (error) return res.status(500).json({ error: error.message });

    if (foto?.url) {
      const marker = "/object/public/club-sanvi/";
      const idx    = foto.url.indexOf(marker);
      if (idx !== -1) {
        const path = foto.url.slice(idx + marker.length);
        await supabaseAdmin.storage.from("club-sanvi").remove([path]);
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/* =============================================
   CLUB SANVI — DISCIPLINAS
============================================= */

app.get("/api/club-sanvi/disciplinas", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("club_disciplinas")
      .select("*")
      .order("orden", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/club-sanvi/disciplinas/:slug", soloAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const updates = {};
    if (req.body.nombre    !== undefined) updates.nombre    = limpiarTexto(req.body.nombre);
    if (req.body.descripcion !== undefined) updates.descripcion = limpiarTexto(req.body.descripcion);
    if (req.body.foto_url  !== undefined) updates.foto_url  = limpiarTexto(req.body.foto_url);

    const { data, error } = await supabaseAdmin
      .from("club_disciplinas")
      .update(updates)
      .eq("slug", slug)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, disciplina: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/* =============================================
   SAN VICENTE — IMÁGENES DINÁMICAS
============================================= */

app.get("/api/sv/imagenes/:seccion", async (req, res) => {
  try {
    const { seccion } = req.params;
    const { data, error } = await supabaseAdmin
      .from("sv_imagenes")
      .select("*")
      .eq("seccion", seccion)
      .order("slot", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.put("/api/admin/sv/imagenes/:seccion/:slot", soloAdmin, async (req, res) => {
  try {
    const { seccion } = req.params;
    const slot = parseInt(req.params.slot);
    const url = limpiarTexto(req.body.url);
    const alt = limpiarTexto(req.body.alt) || "";

    if (!url) return res.status(400).json({ error: "url es obligatorio" });

    const { data, error } = await supabaseAdmin
      .from("sv_imagenes")
      .upsert({ seccion, slot, url, alt }, { onConflict: "seccion,slot" })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, item: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});