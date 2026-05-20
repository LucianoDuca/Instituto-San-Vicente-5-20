const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const loginBtn = document.getElementById("loginBtn");
const togglePassword = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");

function mostrarLoginEstado(mensaje, tipo) {
  loginStatus.textContent = mensaje;
  loginStatus.className = `login-status ${tipo}`;
}

togglePassword.addEventListener("click", function () {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePassword.textContent = isPassword ? "Ocultar" : "Ver";
});

async function obtenerPerfil() {
  const { data } = await window.supabaseClient.auth.getSession();

  if (!data.session) {
    throw new Error("No hay sesión activa");
  }

  const response = await fetch("/api/me", {
    headers: {
      Authorization: `Bearer ${data.session.access_token}`
    }
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "No se pudo obtener el perfil");
  }

  return result.profile;
}

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const email = loginForm.email.value.trim();
  const password = loginForm.password.value.trim();

  if (!email || !password) {
    mostrarLoginEstado("Completá correo y contraseña.", "error");
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = "INGRESANDO...";
    mostrarLoginEstado("Validando datos...", "");

    const { data, error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      mostrarLoginEstado("Correo o contraseña incorrectos.", "error");
      return;
    }

    if (!data.session) {
      mostrarLoginEstado("No se pudo iniciar sesión.", "error");
      return;
    }

    const profile = await obtenerPerfil();

    if (profile.must_change_password) {
      window.location.href = "change-password.html";
      return;
    }

    mostrarLoginEstado("Ingreso correcto. Redirigiendo...", "success");

    setTimeout(() => {
      if (profile.rol === "admin") {
        window.location.href = "panel-administradores.html";
        return;
      }

      if (profile.rol === "directivo") {
        window.location.href = "panel-directivos.html";
        return;
      }

      if (profile.rol === "docente") {
        window.location.href = "panel-docentes.html";
        return;
      }

      window.location.href = "index.html";
    }, 700);

  } catch (error) {
    mostrarLoginEstado(error.message, "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "INGRESAR";
  }
});