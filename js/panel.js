const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");

async function protegerPanel() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data.session) {
    window.location.href = "login.html";
    return;
  }

  userEmail.textContent = `Sesión iniciada como: ${data.session.user.email}`;
}

logoutBtn.addEventListener("click", async function () {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

protegerPanel();