const form = document.getElementById("contactForm");
const statusText = document.getElementById("formStatus");
const submitButton = document.getElementById("contactBtn");

function mostrarEstado(mensaje, tipo) {
  statusText.textContent = mensaje;
  statusText.className = `form-status ${tipo}`;
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  mostrarEstado("", "");

  const datos = {
    nombre: form.nombre.value.trim(),
    apellido: form.apellido.value.trim(),
    correo: form.correo.value.trim(),
    telefono: form.telefono.value.trim(),
    asunto: form.asunto.value.trim(),
    mensaje: form.mensaje.value.trim()
  };

  if (!datos.nombre || !datos.apellido || !datos.correo || !datos.mensaje) {
    mostrarEstado("Por favor completá los campos obligatorios.", "error");
    return;
  }

  if (!validarEmail(datos.correo)) {
    mostrarEstado("Por favor ingresá un correo válido.", "error");
    return;
  }

  if (datos.mensaje.length < 10) {
    mostrarEstado("El mensaje debe tener al menos 10 caracteres.", "error");
    return;
  }

  try {
    submitButton.disabled = true;
    submitButton.textContent = "ENVIANDO...";

    const response = await fetch("/api/contacto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(datos)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Error al enviar el formulario.");
    }

    mostrarEstado("Mensaje enviado correctamente. Gracias por comunicarte.", "success");
    form.reset();

  } catch (error) {
    mostrarEstado("Hubo un problema al enviar el mensaje. Intentá nuevamente.", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "ENVIAR MENSAJE";
  }
});