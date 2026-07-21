const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "200kb" }));

app.get("/club-sanvi/", (req, res) => res.redirect(301, "https://clubsanvi.institutosanvicente.com/"));

app.use(express.static(__dirname));

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_BIBLIOTECA = "biblioteca";
const EXTENSIONES_BLOQUEADAS = ["exe", "bat", "cmd", "sh", "msi", "com", "scr", "js", "vbs", "ps1", "jar", "app"];

const uploadBiblioteca = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = (file.originalname.split(".").pop() || "").toLowerCase();
    if (EXTENSIONES_BLOQUEADAS.includes(extension)) {
      return cb(new Error("Tipo de archivo no permitido"));
    }
    cb(null, true);
  }
});

const uploadImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Solo se aceptan archivos de imagen"));
    }
    cb(null, true);
  }
});

function limpiarCarpeta(valor) {
  return String(valor || "").replace(/\.\./g, "").replace(/[^a-zA-Z0-9/_-]/g, "");
}

supabaseAdmin.storage.listBuckets().then(async ({ data: buckets }) => {
  const existe = buckets?.some((b) => b.name === BUCKET_BIBLIOTECA);
  if (!existe) {
    await supabaseAdmin.storage.createBucket(BUCKET_BIBLIOTECA, { public: true });
  }
}).catch((error) => {
  console.error("No se pudo verificar/crear el bucket de biblioteca:", error.message);
});

function limpiarTexto(valor) {
  if (!valor) return "";
  return String(valor).trim().replace(/[<>]/g, "").slice(0, 2500);
}

/* ===== Plantillas de correo (estética Instituto San Vicente) ===== */

const MARCA = {
  nombre: "Instituto San Vicente",
  sitio: "https://institutosanvicente.com",
  sitioTexto: "institutosanvicente.com",
  banner: "https://institutosanvicente.com/assets/img/email/encabezado-correo.png",
  fuenteApricot: "https://institutosanvicente.com/assets/fonts/Apricot.ttf",
  whatsapp: "266 4214497",
  emisor: "Instituto San Vicente <noreply@institutosanvicente.com>",
  navy: "#083656",
  azul: "#0b4a78",
  rojo: "#e8342a",
  fondo: "#ebebeb",
  caja: "#f1f5f8",
  borde: "#e2e8ee",
  suave: "#5b7488",
  tituloFont: "'Apricot','Franklin Gothic Medium','Arial Narrow',Arial,sans-serif"
};

// Titulo a dos lineas estilo index: linea navy + linea roja (fuente Apricot con respaldo)
function tituloEmail(linea1, linea2) {
  return `<div style="text-transform:uppercase;line-height:1.05;margin:0 0 18px 0;">
    <div style="font-family:${MARCA.tituloFont};font-size:30px;color:${MARCA.azul};letter-spacing:.5px;">${linea1}</div>
    <div style="font-family:${MARCA.tituloFont};font-size:21px;color:${MARCA.rojo};letter-spacing:.5px;margin-top:2px;">${linea2}</div>
  </div>`;
}

// Fila etiqueta/valor para las tablas de datos del correo
function filaDato(label, valor) {
  return `<tr>
    <td style="padding:10px 16px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${MARCA.navy};vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${MARCA.azul};vertical-align:top;border-bottom:1px solid ${MARCA.borde};">${valor}</td>
  </tr>`;
}

// Envoltorio con banner decorativo, cuerpo y pie institucional. Pensado para clientes de correo (Gmail, etc.).
function plantillaEmail({ titulo, preheader = "", cuerpo, notaPie = "" }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${titulo}</title>
<style>
@font-face{font-family:'Apricot';src:url('${MARCA.fuenteApricot}') format('truetype');font-weight:normal;font-style:normal;font-display:swap;}
</style>
</head>
<body style="margin:0;padding:0;background-color:${MARCA.fondo};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${MARCA.fondo};">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${MARCA.fondo};padding:26px 12px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e0e0e0;">
  <tr><td style="padding:0;font-size:0;line-height:0;">
    <img src="${MARCA.banner}" alt="Instituto San Vicente" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
  </td></tr>
  <tr><td style="padding:24px 34px 32px 34px;">${cuerpo}</td></tr>
  <tr><td style="padding:26px 34px;background-color:${MARCA.navy};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="vertical-align:top;padding:0 12px 0 0;width:38%;">
        <div style="color:#ffffff;font-size:12px;font-weight:bold;margin-bottom:5px;">Dirección</div>
        <div style="color:#bcd0df;font-size:12px;line-height:1.6;">Av. del Viento Chorrillero 2570<br>Juana Koslay, San Luis</div>
      </td>
      <td style="vertical-align:top;padding:0 12px;width:28%;">
        <div style="color:#ffffff;font-size:12px;font-weight:bold;margin-bottom:5px;">Horario</div>
        <div style="color:#bcd0df;font-size:12px;line-height:1.6;">Lun a Vie<br>8:00 a 16:00 hs</div>
      </td>
      <td style="vertical-align:top;padding:0 0 0 12px;width:34%;">
        <div style="color:#ffffff;font-size:12px;font-weight:bold;margin-bottom:5px;">Contacto</div>
        <div style="color:#bcd0df;font-size:12px;line-height:1.6;">266 4214497<br><a href="${MARCA.sitio}" style="color:#bcd0df;text-decoration:none;">institutosanvicente.com</a></div>
      </td>
    </tr></table>
    <div style="border-top:1px solid rgba(255,255,255,.16);margin-top:16px;padding-top:12px;color:#8fabc0;font-size:11px;line-height:1.6;">© 2026 Instituto San Vicente. Todos los derechos reservados.${notaPie ? `<br>${notaPie}` : ""}</div>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function validarUrlDrive(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const ROLES_VALIDOS = ["admin", "directivo", "docente"];

function rolValido(rol) {
  return ROLES_VALIDOS.includes(String(rol || "").trim());
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

    const destinoConsultas = process.env.CONTACT_EMAIL || "Admsanvicentejk@gmail.com";

    const htmlAdmin = plantillaEmail({
      titulo: "Nueva consulta desde la web",
      preheader: `Nueva consulta de ${nombre} ${apellido}`,
      cuerpo: `
        ${tituloEmail("Nueva consulta", "desde la web")}
        <p style="margin:0 0 22px 0;font-family:Arial,Helvetica,sans-serif;color:${MARCA.suave};font-size:14px;line-height:1.6;">Recibiste una nueva consulta a través del formulario de contacto del sitio.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:22px;">
          ${filaDato("Nombre", `${nombre} ${apellido}`)}
          ${filaDato("Correo", correo)}
          ${filaDato("Teléfono", telefono || "No indicado")}
          ${filaDato("Asunto", asunto || "Sin asunto")}
        </table>
        <div style="background-color:${MARCA.caja};border-left:4px solid ${MARCA.rojo};padding:16px 18px;">
          <div style="font-family:${MARCA.tituloFont};font-size:13px;text-transform:uppercase;letter-spacing:1px;color:${MARCA.navy};margin-bottom:8px;">Mensaje</div>
          <div style="font-family:Arial,Helvetica,sans-serif;color:${MARCA.azul};font-size:15px;line-height:1.7;white-space:pre-line;">${mensaje}</div>
        </div>`
    });

    const { error } = await resend.emails.send({
      from: MARCA.emisor,
      to: [destinoConsultas],
      subject: asunto ? `Consulta web: ${asunto}` : "Nueva consulta desde la web",
      reply_to: correo,
      html: htmlAdmin
    });

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    // Correo automático de agradecimiento al visitante (no interrumpe la respuesta si falla)
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      const htmlGracias = plantillaEmail({
        titulo: "¡Gracias por escribirnos!",
        preheader: "Recibimos tu mensaje y te responderemos a la brevedad.",
        notaPie: "Este correo fue enviado automáticamente. Si respondés a este mensaje, tu respuesta llegará a nuestro equipo.",
        cuerpo: `
          ${tituloEmail(`¡Gracias, ${nombre}!`, "por escribirnos")}
          <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;color:${MARCA.azul};font-size:15px;line-height:1.7;">Recibimos tu mensaje y nuestro equipo se pondrá en contacto con vos a la brevedad. Nos alegra mucho tu interés en <strong>Instituto San Vicente</strong>.</p>
          <div style="background-color:${MARCA.caja};border-left:4px solid ${MARCA.rojo};padding:16px 18px;margin:0 0 24px 0;">
            <div style="font-family:${MARCA.tituloFont};font-size:13px;text-transform:uppercase;letter-spacing:1px;color:${MARCA.navy};margin-bottom:8px;">Tu mensaje</div>
            ${asunto ? `<div style="font-family:Arial,Helvetica,sans-serif;color:${MARCA.suave};font-size:13px;margin-bottom:8px;"><strong>Asunto:</strong> ${asunto}</div>` : ""}
            <div style="font-family:Arial,Helvetica,sans-serif;color:${MARCA.azul};font-size:15px;line-height:1.7;white-space:pre-line;">${mensaje}</div>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;"><tr><td style="border-radius:8px;background-color:${MARCA.azul};">
            <a href="${MARCA.sitio}" style="display:inline-block;padding:13px 30px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">Conocé nuestro sitio</a>
          </td></tr></table>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;color:${MARCA.suave};font-size:14px;line-height:1.6;">Un cálido saludo,<br><strong style="color:${MARCA.navy};">Equipo de Instituto San Vicente</strong></p>`
      });

      try {
        await resend.emails.send({
          from: MARCA.emisor,
          to: [correo],
          subject: "¡Gracias por contactarte con Instituto San Vicente!",
          reply_to: destinoConsultas,
          html: htmlGracias
        });
      } catch (e) {
        console.error("No se pudo enviar el correo de agradecimiento:", e?.message || e);
      }
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
    const rol = String(req.body.rol || "").trim();

    if (!email || !password) {
      return res.status(400).json({
        error: "Email y contraseña son obligatorios"
      });
    }

    if (!rolValido(rol)) {
      return res.status(400).json({
        error: "El rol debe ser admin, directivo o docente"
      });
    }

    const perfil = {
      nombre: limpiarTexto(req.body.nombre),
      apellido: limpiarTexto(req.body.apellido),
      email,
      rol,
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
    const rol = String(req.body.rol || "").trim();

    if (!email) {
      return res.status(400).json({
        error: "El email es obligatorio"
      });
    }

    if (!rolValido(rol)) {
      return res.status(400).json({
        error: "El rol debe ser admin, directivo o docente"
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
      rol,
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

    if (!password || password.length < 5) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 5 caracteres"
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

const LIMITE_STORAGE_BYTES = 1024 * 1024 * 1024; // Plan Free de Supabase: 1 GB compartido entre todos los buckets

async function calcularTamanioBucket(bucket, carpeta = "") {
  const { data, error } = await supabaseAdmin.storage.from(bucket).list(carpeta, { limit: 1000 });
  if (error || !data) return 0;

  let total = 0;
  for (const item of data) {
    if (item.metadata && typeof item.metadata.size === "number") {
      total += item.metadata.size;
    } else {
      const subcarpeta = carpeta ? `${carpeta}/${item.name}` : item.name;
      total += await calcularTamanioBucket(bucket, subcarpeta);
    }
  }
  return total;
}

app.get("/api/admin/storage-usage", soloAdmin, async (req, res) => {
  try {
    const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const detalle = [];
    let usedBytes = 0;

    for (const bucket of buckets || []) {
      const tamanio = await calcularTamanioBucket(bucket.name);
      detalle.push({ bucket: bucket.name, usedBytes: tamanio });
      usedBytes += tamanio;
    }

    return res.json({
      usedBytes,
      limitBytes: LIMITE_STORAGE_BYTES,
      buckets: detalle
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/library/upload", soloAdmin, (req, res, next) => {
  uploadBiblioteca.single("file")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo" });
    }

    const extension = (req.file.originalname.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `documentos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET_BIBLIOTECA)
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data } = supabaseAdmin.storage.from(BUCKET_BIBLIOTECA).getPublicUrl(path);

    return res.json({ ok: true, url: data.publicUrl });

  } catch (error) {
    return res.status(500).json({ error: error.message });
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

    const { data: documento } = await supabaseAdmin
      .from("documents_library")
      .select("drive_url")
      .eq("id", id)
      .single();

    const { error } = await supabaseAdmin
      .from("documents_library")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    if (documento?.drive_url) {
      const marker = `/object/public/${BUCKET_BIBLIOTECA}/`;
      const idx = documento.drive_url.indexOf(marker);
      if (idx !== -1) {
        const path = documento.drive_url.slice(idx + marker.length);
        await supabaseAdmin.storage.from(BUCKET_BIBLIOTECA).remove([path]);
      }
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
   CLUB SANVI — SUBIDA DE IMÁGENES (convierte a WebP)
============================================= */

app.post("/api/admin/club-sanvi/upload-imagen", soloAdmin, (req, res, next) => {
  uploadImagen.single("file")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ninguna imagen" });
    }

    const carpeta = limpiarCarpeta(req.body.carpeta) || "otros";

    let webpBuffer;
    try {
      webpBuffer = await sharp(req.file.buffer).webp({ quality: 82 }).toBuffer();
    } catch (conversionError) {
      return res.status(400).json({
        error: "No se pudo procesar la imagen. Probá con otro archivo (JPG o PNG)."
      });
    }

    const path = `${carpeta}/${Date.now()}.webp`;

    const { error } = await supabaseAdmin.storage
      .from("club-sanvi")
      .upload(path, webpBuffer, { contentType: "image/webp", upsert: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data } = supabaseAdmin.storage.from("club-sanvi").getPublicUrl(path);

    return res.json({ ok: true, url: data.publicUrl });

  } catch (error) {
    return res.status(500).json({ error: error.message });
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