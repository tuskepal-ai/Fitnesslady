(function () {
  const form = document.getElementById("regForm");
  const msg = document.getElementById("msg");
  const submitBtn = document.getElementById("submitBtn");

  function setMsg(text, type) {
    msg.textContent = text || "";
    msg.className = "msg" + (type ? " " + type : "");
  }

  function normalizeEmail(e) {
    return (e || "").trim().toLowerCase();
  }

  // Ha már van "bejelentkezés", dobjuk az appra
  try {
    const session = localStorage.getItem("fl_session");
    if (session) {
      location.replace("../app/");
      return;
    }
  } catch {}

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    setMsg("");

    const email = normalizeEmail(document.getElementById("email").value);
    const name = (document.getElementById("name").value || "").trim();
    const plan = document.getElementById("plan").value;
    const pass = document.getElementById("pass").value || "";
    const pass2 = document.getElementById("pass2").value || "";

    if (!email || !email.includes("@")) return setMsg("Adj meg érvényes email címet.", "err");
    if (!name) return setMsg("Add meg a neved.", "err");
    if (pass.length < 8) return setMsg("A jelszó legalább 8 karakter legyen.", "err");
    if (pass !== pass2) return setMsg("A két jelszó nem egyezik.", "err");

    submitBtn.disabled = true;
    submitBtn.textContent = "Mentés...";

    // Sheets nélkül: helyben tároljuk (később ezt cseréljük Apps Scriptre/Sheetsre)
    const user = {
      email,
      name,
      plan,
      // FIGYELEM: ez csak ideiglenes (Sheets előtt). Élesben később hash lesz.
      password: pass,
      createdAt: Date.now()
    };

    try {
      localStorage.setItem("fl_user", JSON.stringify(user));
      // “session token”
      const sess = {
        email,
        token: "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36),
        expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000
      };
      localStorage.setItem("fl_session", JSON.stringify(sess));
    } catch (e) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Fiók létrehozása";
      return setMsg("Nem sikerült menteni (localStorage tiltva?). Próbáld másik böngészőben.", "err");
    }

    setMsg("Kész! Átirányítás a saját oldaladra…", "ok");

    setTimeout(() => {
      location.href = "../app/";
    }, 600);
  });
})();
