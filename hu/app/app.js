(function(){
  const content = document.getElementById("content");
  const logoutBtn = document.getElementById("logout");

  function safeParse(json) {
    try { return JSON.parse(json); } catch { return null; }
  }

  function renderNotLoggedIn() {
    content.innerHTML = `
      <div class="box">
        <div class="err"><b>Nincs aktív belépés.</b></div>
        <p class="small">Menj a regisztrációra, vagy később ide jön majd a belépés űrlap is.</p>
      </div>
    `;
  }

  function renderUser(user, session) {
    content.innerHTML = `
      <div class="box">
        <div class="kv">
          <div class="k">Email</div><div class="v">${user.email}</div>
          <div class="k">Név</div><div class="v">${user.name}</div>
          <div class="k">Csomag</div><div class="v">${user.plan}</div>
          <div class="k">Session</div><div class="v">${session.token}</div>
        </div>
      </div>

      <div class="box">
        <b>Tartalom</b>
        <p class="small">Itt lesznek a videók és a heti programok. (Sheets után töltjük fel dinamikusan.)</p>
      </div>
    `;
  }

  const session = safeParse(localStorage.getItem("fl_session"));
  const user = safeParse(localStorage.getItem("fl_user"));

  if (!session || !user || session.email !== user.email || Date.now() > (session.expiresAt || 0)) {
    renderNotLoggedIn();
  } else {
    renderUser(user, session);
  }

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("fl_session");
    // user-t bent hagyjuk, hogy “emlékezzen” – ha akarod, töröljük azt is
    location.href = "../register/";
  });
})();
