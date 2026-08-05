const form = document.getElementById("passwordForm");
const statusText = document.getElementById("passwordStatus");
const passwordBtn = document.getElementById("passwordBtn");

function setStatus(message, type = "") {
  statusText.textContent = message;
  statusText.className = `change-password-status ${type}`;
}

async function obtenerSesion() {
  const { data, error } = await window.supabaseClient.auth.getSession();

  if (error || !data.session) {
    window.location.href = "login.html";
    return null;
  }

  return data.session;
}

async function obtenerPerfil(token) {
  const response = await fetch("/api/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudo obtener el perfil");
  }

  return result.profile;
}

function redirigirSegunRol(rol) {
  if (rol === "admin") {
    window.location.href = "panel-administradores.html";
    return;
  }

  if (rol === "directivo") {
    window.location.href = "panel-directivos.html";
    return;
  }

  if (rol === "docente") {
    window.location.href = "panel-docentes.html";
    return;
  }

  window.location.href = "index.html";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = Object.fromEntries(new FormData(form).entries());

  if (formData.password.length < 6) {
    setStatus("La contraseña debe tener mínimo 6 caracteres.", "error");
    return;
  }

  if (formData.password !== formData.confirmPassword) {
    setStatus("Las contraseñas no coinciden.", "error");
    return;
  }

  try {
    passwordBtn.disabled = true;
    passwordBtn.textContent = "Actualizando...";
    setStatus("");

    const sesion = await obtenerSesion();
    if (!sesion) return;

    const email = sesion.user.email;

    const response = await fetch("/api/change-password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sesion.access_token}`
      },
      body: JSON.stringify({
        password: formData.password
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "No se pudo actualizar la contraseña");
    }

    setStatus("Contraseña actualizada. Iniciando sesión...", "success");

    const { data: signInData, error: signInError } =
      await window.supabaseClient.auth.signInWithPassword({
        email,
        password: formData.password
      });

    if (signInError || !signInData.session) {
      throw new Error("La contraseña se actualizó, pero no se pudo iniciar sesión automáticamente. Ingresá con tu nueva contraseña.");
    }

    const profile = await obtenerPerfil(signInData.session.access_token);

    setTimeout(() => {
      redirigirSegunRol(profile.rol);
    }, 900);

  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    passwordBtn.disabled = false;
    passwordBtn.textContent = "Actualizar contraseña";
  }
});