/* ===========================
   FILE: /hu/shared/chat-widget.js
   =========================== */

/**
 * Customer floating chat widget + Admin embedded chat panel
 *
 * Firestore:
 *  - chats/{uid}            (thread meta)
 *  - chats/{uid}/messages/* (messages)
 *
 * NOTE:
 *  - Ez a fájl külön van → frissítéskor csak ezt cseréled.
 *  - Fix: "Sz / ia" jellegű betűnkénti tördelés (min-width + wrap szabályok)
 *  - Fix: mobilon a chat ne legyen óriási → top-sheet jelleg + max-height
 *  - Extra: 3D hatású buborék + smooth open animáció
 */

/* ===========================
   CUSTOMER CHAT WIDGET
   =========================== */
export function initCustomerChatWidget(opts){
  const {
    db, fs, escapeHtml,
    uid, email,
    canUseChat,
    mountTo = document.body,
    brand = "Fitness Lady",
    theme = {
      pink: "#ff4fd8",
      pink2: "#b14cff",
      bg: "rgba(10,8,14,.78)"
    }
  } = opts || {};

  if(!db || !fs || !uid) throw new Error("chat-widget: missing db/fs/uid");

  // ----- styles (once) -----
  if(!document.getElementById("fl_chat_widget_styles")){
    const st = document.createElement("style");
    st.id = "fl_chat_widget_styles";
    st.textContent = `
      :root{
        --fl-chat-pink: ${theme.pink};
        --fl-chat-pink2: ${theme.pink2};
        --fl-chat-bg: ${theme.bg};
      }

      /* ✅ 3D floating bubble */
      .fl-chat-fab{
        position: fixed; right: 16px; bottom: 16px; z-index: 9999;
        width: 60px; height: 60px; border-radius: 999px;
        border: 1px solid rgba(255,255,255,.18);
        background:
          radial-gradient(circle at 35% 28%, rgba(255,255,255,.55), transparent 35%),
          radial-gradient(circle at 55% 65%, rgba(255,79,216,.35), transparent 55%),
          linear-gradient(135deg, var(--fl-chat-pink), var(--fl-chat-pink2));
        color:#140813; font-weight: 950; cursor: pointer;
        box-shadow:
          0 18px 40px rgba(0,0,0,.55),
          inset 0 1px 0 rgba(255,255,255,.28);
        display:flex; align-items:center; justify-content:center;
        user-select:none;
        transform: translateZ(0);
        transition: transform .18s ease, filter .18s ease;
      }
      .fl-chat-fab:active{ transform: scale(.97); }
      .fl-chat-fab:hover{ filter: brightness(1.05); transform: translateY(-1px); }

      .fl-chat-fab[disabled]{
        opacity:.55; cursor:not-allowed; filter:saturate(.6);
      }

      /* ✅ Panel: desktop bottom-right; mobile top-sheet */
      .fl-chat-panel{
        position: fixed; z-index: 10000;
        right: 16px; bottom: 90px;
        width: min(420px, calc(100vw - 32px));
        height: min(520px, calc(100vh - 160px));
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,.12);
        background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.02));
        box-shadow: 0 24px 85px rgba(0,0,0,.55);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        overflow:hidden;

        display:flex;
        flex-direction:column;

        /* ✅ animáció */
        opacity: 0;
        transform: translateY(10px) scale(.98);
        pointer-events: none;
        transition: opacity .18s ease, transform .22s cubic-bezier(.2,.9,.2,1);
      }
      .fl-chat-panel.is-open{
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      @media (max-width: 520px){
        .fl-chat-panel{
          left: 12px;
          right: 12px;
          top: 10px;
          bottom: auto;

          width: auto;
          height: min(58vh, 520px);

          transform: translateY(-12px) scale(.98);
        }
        .fl-chat-panel.is-open{
          transform: translateY(0) scale(1);
        }
      }

      .fl-chat-head{
        padding: 12px 14px;
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        border-bottom: 1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.18);
      }
      .fl-chat-title{
        display:flex; flex-direction:column; gap:2px;
        min-width: 0;
      }
      .fl-chat-title b{
        font-weight: 950; letter-spacing:.2px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 70vw;
      }
      .fl-chat-title span{
        font-size: 12.5px; color: rgba(255,255,255,.72);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 70vw;
      }
      .fl-chat-close{
        width: 38px; height: 38px; border-radius: 999px;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.06);
        color:#fff; cursor:pointer;
        flex: 0 0 auto;
      }

      .fl-chat-body{
        flex:1;
        padding: 14px;
        overflow:auto;
        display:flex;
        flex-direction:column;
        gap:10px;
        background: rgba(0,0,0,.10);
      }

      /* ✅ FIX: ne tördeljen betűnként (Sz / ia) */
      .fl-msg{
        display:inline-block;
        max-width: min(86%, 520px);
        min-width: 62px;         /* <<< EZ A KULCS, hogy ne legyen túl keskeny */
        border-radius: 16px;
        padding: 10px 12px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.22);
        color: rgba(255,255,255,.92);
        line-height: 1.45;
        font-size: 13.5px;

        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .fl-msg.me{
        margin-left:auto;
        background: linear-gradient(135deg, rgba(255,79,216,.90), rgba(177,76,255,.90));
        color:#160813;
        border-color: rgba(255,255,255,.18);
      }
      .fl-msg .meta{
        margin-top:6px;
        font-size: 11.5px;
        color: rgba(255,255,255,.60);
      }

      .fl-chat-foot{
        padding: 12px 12px;
        border-top: 1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.18);
        display:flex; gap:8px; align-items:center;
      }
      .fl-chat-input{
        flex:1;
        height: 44px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.06);
        color:#fff;
        padding: 0 12px;
        outline:none;
      }
      .fl-chat-btn{
        height: 44px;
        padding: 0 12px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.06);
        color:#fff; cursor:pointer;
        font-weight: 900;
        user-select:none;
      }
      .fl-chat-btn.primary{
        background: linear-gradient(135deg, var(--fl-chat-pink), var(--fl-chat-pink2));
        color:#140813; border-color: transparent;
        box-shadow: 0 18px 46px rgba(255,79,216,.18);
      }
      .fl-chat-btn[disabled]{ opacity:.55; cursor:not-allowed; }

      .fl-chat-hint{
        padding: 10px 12px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(0,0,0,.20);
        color: rgba(255,255,255,.78);
        font-size: 13px;
      }
      .fl-img{
        width: 100%;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.12);
        display:block;
      }
      .fl-link{
        color: rgba(255,211,138,.95);
        text-decoration: underline;
        font-weight: 900;
      }
    `;
    document.head.appendChild(st);
  }

  // ----- DOM -----
  const fab = document.createElement("button");
  fab.className = "fl-chat-fab";
  fab.type = "button";
  fab.textContent = "💬";
  if(!canUseChat) fab.setAttribute("disabled", "disabled");
  fab.title = canUseChat
    ? "Chat megnyitása"
    : "Chat csak fizetett vevőknek (admin engedélyezheti)";

  const panel = document.createElement("div");
  panel.className = "fl-chat-panel";
  panel.innerHTML = `
    <div class="fl-chat-head">
      <div class="fl-chat-title">
        <b>${escapeHtml(brand)} Chat</b>
        <span>${escapeHtml(email || "Vevő")}</span>
      </div>
      <button class="fl-chat-close" type="button" aria-label="Bezárás">✕</button>
    </div>
    <div class="fl-chat-body" id="fl_chat_body"></div>
    <div class="fl-chat-foot">
      <input class="fl-chat-input" id="fl_chat_text" type="text" placeholder="Írj üzenetet…" ${canUseChat ? "" : "disabled"} />
      <input id="fl_chat_file" type="file" accept="image/*" style="display:none" ${canUseChat ? "" : "disabled"} />
      <button class="fl-chat-btn" id="fl_chat_img" type="button" ${canUseChat ? "" : "disabled"} title="Kép küldése">🖼</button>
      <button class="fl-chat-btn" id="fl_chat_call" type="button" ${canUseChat ? "" : "disabled"} title="Videóhívás link">🎥</button>
      <button class="fl-chat-btn primary" id="fl_chat_send" type="button" ${canUseChat ? "" : "disabled"}>Küld</button>
    </div>
  `;

  mountTo.appendChild(panel);
  mountTo.appendChild(fab);

  const body = panel.querySelector("#fl_chat_body");
  const btnClose = panel.querySelector(".fl-chat-close");
  const inp = panel.querySelector("#fl_chat_text");
  const btnSend = panel.querySelector("#fl_chat_send");
  const fileInp = panel.querySelector("#fl_chat_file");
  const btnImg = panel.querySelector("#fl_chat_img");
  const btnCall = panel.querySelector("#fl_chat_call");

  function open(){
    panel.classList.add("is-open");
    scrollDown();
    setTimeout(()=>{ try{ inp?.focus({ preventScroll:true }); }catch{} }, 160);
  }
  function close(){ panel.classList.remove("is-open"); }
  function toggle(){ panel.classList.contains("is-open") ? close() : open(); }
  function scrollDown(){ setTimeout(()=>{ body.scrollTop = body.scrollHeight; }, 60); }

  fab.addEventListener("click", ()=>{ toggle(); });
  btnClose.addEventListener("click", close);

  // ----- Firestore refs -----
  const chatRef = fs.doc(db, "chats", uid);
  const msgCol = fs.collection(db, "chats", uid, "messages");

  async function ensureChatDoc(){
    const snap = await fs.getDoc(chatRef);
    if(snap.exists()) return;
    await fs.setDoc(chatRef, {
      chatId: uid,
      userUid: uid,
      userEmail: email || "",
      status: "open",
      createdAt: fs.serverTimestamp(),
      lastMessageAt: fs.serverTimestamp(),
      lastMessageText: "",
      unreadAdmin: 0,
      unreadUser: 0
    }, { merge:true });
  }

  function fmtTime(ts){
    try{
      const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
      if(!d) return "";
      return d.toLocaleString(undefined, { hour:"2-digit", minute:"2-digit" });
    }catch{ return ""; }
  }

  function renderMessage(m){
    const me = (m.senderUid === uid);
    const wrap = document.createElement("div");
    wrap.className = "fl-msg" + (me ? " me" : "");

    if(m.type === "image" && m.imageDataUrl){
      wrap.innerHTML = `
        <img class="fl-img" src="${m.imageDataUrl}" alt="Kép" />
        ${m.text ? `<div style="margin-top:8px;">${escapeHtml(m.text)}</div>` : ""}
        <div class="meta">${escapeHtml(fmtTime(m.createdAt))}</div>
      `;
      return wrap;
    }

    if(m.type === "call" && m.callUrl){
      wrap.innerHTML = `
        <div><b>Videóhívás</b></div>
        <div style="margin-top:6px;">
          <a class="fl-link" href="${m.callUrl}" target="_blank" rel="noopener">Megnyitás</a>
        </div>
        <div class="meta">${escapeHtml(fmtTime(m.createdAt))}</div>
      `;
      return wrap;
    }

    wrap.innerHTML = `
      <div>${escapeHtml(m.text || "")}</div>
      <div class="meta">${escapeHtml(fmtTime(m.createdAt))}</div>
    `;
    return wrap;
  }

  function renderHint(text){
    const h = document.createElement("div");
    h.className = "fl-chat-hint";
    h.innerHTML = text || `<b>Info:</b> itt tudsz írni. Képet is küldhetsz, és videóhívás linket indíthatsz.`;
    body.appendChild(h);
  }

  let unsub = null;
  async function startRealtime(){
    await ensureChatDoc();

    if(unsub) unsub();
    const q = fs.query(msgCol, fs.orderBy("createdAt","asc"), fs.limit(200));
    unsub = fs.onSnapshot(q, (snap)=>{
      body.innerHTML = "";
      if(snap.empty) renderHint();
      snap.forEach(docSnap=>{
        body.appendChild(renderMessage(docSnap.data() || {}));
      });
      scrollDown();
    }, (err)=>{
      body.innerHTML = "";
      renderHint(`<b>Chat hiba:</b> ${escapeHtml(err?.message || String(err))}`);
    });
  }

  async function sendText(text){
    const t = String(text || "").trim();
    if(!t) return;

    await ensureChatDoc();
    const now = new Date().toISOString();

    await fs.addDoc(msgCol, {
      type: "text",
      text: t,
      senderUid: uid,
      senderRole: "user",
      createdAt: fs.serverTimestamp(),
      createdAtIso: now
    });

    await fs.setDoc(chatRef, {
      lastMessageAt: fs.serverTimestamp(),
      lastMessageText: t,
      unreadAdmin: fs.increment(1),
      userEmail: email || ""
    }, { merge:true });
  }

  async function compressImageToDataUrl(file, maxW=1280, quality=0.78, maxBytes=650_000){
    const dataUrl = await new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = ()=>res(fr.result);
      fr.onerror = ()=>rej(new Error("Nem sikerült beolvasni a képet."));
      fr.readAsDataURL(file);
    });

    const img = await new Promise((res, rej)=>{
      const i = new Image();
      i.onload = ()=>res(i);
      i.onerror = ()=>rej(new Error("Hibás kép."));
      i.src = dataUrl;
    });

    let w = img.width, h = img.height;
    const scale = Math.min(1, maxW / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    let out = canvas.toDataURL("image/jpeg", quality);
    let q = quality;
    while(out.length > maxBytes * 1.37 && q > 0.45){
      q -= 0.08;
      out = canvas.toDataURL("image/jpeg", q);
    }
    return out;
  }

  async function sendImage(file, caption=""){
    if(!file) return;
    await ensureChatDoc();
    const imgData = await compressImageToDataUrl(file);

    await fs.addDoc(msgCol, {
      type: "image",
      text: String(caption || "").trim(),
      imageDataUrl: imgData,
      senderUid: uid,
      senderRole: "user",
      createdAt: fs.serverTimestamp(),
      createdAtIso: new Date().toISOString()
    });

    await fs.setDoc(chatRef, {
      lastMessageAt: fs.serverTimestamp(),
      lastMessageText: "[Kép]",
      unreadAdmin: fs.increment(1),
      userEmail: email || ""
    }, { merge:true });
  }

  async function sendCallLink(){
    await ensureChatDoc();
    const callUrl = `https://meet.jit.si/fitnesslady-${encodeURIComponent(uid)}`;

    await fs.addDoc(msgCol, {
      type: "call",
      callUrl,
      senderUid: uid,
      senderRole: "user",
      createdAt: fs.serverTimestamp(),
      createdAtIso: new Date().toISOString()
    });

    await fs.setDoc(chatRef, {
      lastMessageAt: fs.serverTimestamp(),
      lastMessageText: "[Videóhívás]",
      unreadAdmin: fs.increment(1),
      userEmail: email || ""
    }, { merge:true });
  }

  function wire(){
    if(!canUseChat){
      // ha nem fizetett, nyíljon meg info panel
      fab.addEventListener("click", ()=>{
        panel.classList.add("is-open");
        body.innerHTML = "";
        renderHint(`<b>Chat:</b> csak fizetett vevőknek elérhető. (Admin engedélyezheti.)`);
      });
      return;
    }

    btnSend.addEventListener("click", async ()=>{
      const v = inp.value;
      inp.value = "";
      await sendText(v);
    });

    inp.addEventListener("keydown", async (e)=>{
      if(e.key === "Enter"){
        e.preventDefault();
        btnSend.click();
      }
    });

    btnImg.addEventListener("click", ()=>fileInp.click());
    fileInp.addEventListener("change", async ()=>{
      const f = fileInp.files?.[0];
      fileInp.value = "";
      if(!f) return;
      await sendImage(f, "");
    });

    btnCall.addEventListener("click", async ()=>{
      await sendCallLink();
    });

    startRealtime();
  }

  wire();

  return {
    open,
    close,
    destroy(){
      if(unsub) unsub();
      fab.remove();
      panel.remove();
    }
  };
}

/* ===========================
   ADMIN CHAT (embedded panel)
   =========================== */
export function initAdminChatPanel(opts){
  const {
    db, fs, escapeHtml,
    mount,
    adminEmail = "",
    onPickUserUid = null
  } = opts || {};
  if(!db || !fs || !mount) throw new Error("admin chat: missing db/fs/mount");

  mount.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1.2fr; gap:12px;">
      <div style="min-width:0;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between;">
          <div style="font-weight:950; letter-spacing:.2px;">Chat inbox</div>
          <button class="pill ghost" id="admChatRefresh" type="button">↻ Frissítés</button>
        </div>
        <div class="field" style="margin-top:10px;">
          <label for="admChatSearch">Keresés (email)</label>
          <input id="admChatSearch" type="text" placeholder="pl. anna@gmail.com" />
        </div>
        <ul class="list" id="admChatList"></ul>
      </div>

      <div style="min-width:0;">
        <div class="sub">Kiválasztott chat:</div>
        <div class="pill ghost mono" id="admChatSel">—</div>

        <div style="margin-top:10px; height: 360px; overflow:auto; padding:12px; border-radius:18px; border:1px solid rgba(255,255,255,.10); background: rgba(0,0,0,.18);" id="admChatMsgs"></div>

        <div class="actions" style="margin-top:10px;">
          <input id="admChatText" type="text" placeholder="Válasz…" style="flex:1; min-width:220px;" />
          <input id="admChatFile" type="file" accept="image/*" style="display:none" />
          <button class="pill ghost" id="admChatImg" type="button">🖼 Kép</button>
          <button class="pill ghost" id="admChatCall" type="button">🎥 Videóhívás</button>
          <button class="pill primary" id="admChatSend" type="button">Küld</button>
        </div>

        <div class="sub" style="margin-top:10px;">
          Tipp: a videóhívás gomb Jitsi linket küld.
        </div>
      </div>
    </div>
  `;

  const $ = (s, r=mount) => r.querySelector(s);
  const $$ = (s, r=mount) => Array.from(r.querySelectorAll(s));

  const listEl = $("#admChatList");
  const msgsEl = $("#admChatMsgs");
  const selEl  = $("#admChatSel");
  const searchEl = $("#admChatSearch");
  const btnRefresh = $("#admChatRefresh");
  const inpText = $("#admChatText");
  const btnSend = $("#admChatSend");
  const fileInp = $("#admChatFile");
  const btnImg = $("#admChatImg");
  const btnCall = $("#admChatCall");

  let SEL_UID = null;
  let unsubList = null;
  let unsubMsgs = null;

  function fmtTime(ts){
    try{
      const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
      if(!d) return "";
      return d.toLocaleString(undefined, { month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    }catch{ return ""; }
  }

  function renderMsg(m){
    const isAdmin = (m.senderRole === "admin");
    const wrap = document.createElement("div");
    wrap.style.margin = "0 0 10px";
    wrap.style.display = "flex";
    wrap.style.justifyContent = isAdmin ? "flex-end" : "flex-start";

    const bubble = document.createElement("div");
    bubble.style.maxWidth = "86%";
    bubble.style.minWidth = "62px";               // ✅ ugyanaz a wrap-fix adminban is
    bubble.style.padding = "10px 12px";
    bubble.style.borderRadius = "16px";
    bubble.style.border = "1px solid rgba(255,255,255,.10)";
    bubble.style.background = isAdmin ? "rgba(255,79,216,.12)" : "rgba(0,0,0,.22)";
    bubble.style.color = "rgba(255,255,255,.92)";
    bubble.style.fontSize = "13.5px";
    bubble.style.lineHeight = "1.45";
    bubble.style.whiteSpace = "pre-wrap";
    bubble.style.wordBreak = "break-word";
    bubble.style.overflowWrap = "anywhere";

    if(m.type === "image" && m.imageDataUrl){
      bubble.innerHTML = `
        <img src="${m.imageDataUrl}" style="width:100%; border-radius:14px; border:1px solid rgba(255,255,255,.12); display:block;" />
        ${m.text ? `<div style="margin-top:8px;">${escapeHtml(m.text)}</div>` : ""}
        <div style="margin-top:6px; font-size:11.5px; color:rgba(255,255,255,.65);">${escapeHtml(fmtTime(m.createdAt))}</div>
      `;
    } else if(m.type === "call" && m.callUrl){
      bubble.innerHTML = `
        <div><b>Videóhívás</b></div>
        <div style="margin-top:6px;">
          <a href="${m.callUrl}" target="_blank" rel="noopener" style="color:rgba(255,211,138,.95); text-decoration:underline; font-weight:900;">Megnyitás</a>
        </div>
        <div style="margin-top:6px; font-size:11.5px; color:rgba(255,255,255,.65);">${escapeHtml(fmtTime(m.createdAt))}</div>
      `;
    } else {
      bubble.innerHTML = `
        <div>${escapeHtml(m.text || "")}</div>
        <div style="margin-top:6px; font-size:11.5px; color:rgba(255,255,255,.65);">${escapeHtml(fmtTime(m.createdAt))}</div>
      `;
    }

    wrap.appendChild(bubble);
    return wrap;
  }

  function scrollDown(){
    setTimeout(()=>{ msgsEl.scrollTop = msgsEl.scrollHeight; }, 60);
  }

  async function compressImageToDataUrl(file, maxW=1280, quality=0.78, maxBytes=650_000){
    const dataUrl = await new Promise((res, rej)=>{
      const fr = new FileReader();
      fr.onload = ()=>res(fr.result);
      fr.onerror = ()=>rej(new Error("Nem sikerült beolvasni a képet."));
      fr.readAsDataURL(file);
    });

    const img = await new Promise((res, rej)=>{
      const i = new Image();
      i.onload = ()=>res(i);
      i.onerror = ()=>rej(new Error("Hibás kép."));
      i.src = dataUrl;
    });

    let w = img.width, h = img.height;
    const scale = Math.min(1, maxW / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);

    let out = canvas.toDataURL("image/jpeg", quality);
    let q = quality;
    while(out.length > maxBytes * 1.37 && q > 0.45){
      q -= 0.08;
      out = canvas.toDataURL("image/jpeg", q);
    }
    return out;
  }

  async function pickChat(uid, chatData){
    SEL_UID = uid;

    // ✅ ne uid legyen a fő: email az első, uid csak másodlagos
    const mail = (chatData?.userEmail || "").trim();
    selEl.textContent = uid ? `${mail || "—"}${uid ? ` • uid=${uid}` : ""}` : "—";

    if(typeof onPickUserUid === "function") onPickUserUid(uid);

    // reset unread for admin
    if(uid){
      await fs.setDoc(fs.doc(db, "chats", uid), { unreadAdmin: 0 }, { merge:true });
    }

    if(unsubMsgs) unsubMsgs();
    msgsEl.innerHTML = "";

    if(!uid) return;

    const msgCol = fs.collection(db, "chats", uid, "messages");
    const q = fs.query(msgCol, fs.orderBy("createdAt","asc"), fs.limit(300));
    unsubMsgs = fs.onSnapshot(q, (snap)=>{
      msgsEl.innerHTML = "";
      if(snap.empty){
        msgsEl.innerHTML = `<div style="opacity:.75;">Még nincs üzenet.</div>`;
        return;
      }
      snap.forEach(d=>msgsEl.appendChild(renderMsg(d.data() || {})));
      scrollDown();
    });
  }

  function renderChatItem(uid, c){
    const li = document.createElement("li");
    li.className = "li";
    const unread = parseInt(c.unreadAdmin || 0, 10) || 0;

    li.innerHTML = `
      <div>
        <div class="title">${escapeHtml(c.userEmail || "Ismeretlen email")}</div>
        <div class="desc">
          utolsó: ${escapeHtml(c.lastMessageText || "—")}
          • ${escapeHtml(fmtTime(c.lastMessageAt))}
          ${unread ? ` • <b style="color:var(--gold);">unread: ${unread}</b>` : ""}
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
        <button class="pill ghost" type="button" data-open-chat="${escapeHtml(uid)}">Megnyit</button>
      </div>
    `;
    return li;
  }

  function applyFilter(items){
    const q = (searchEl.value || "").trim().toLowerCase();
    if(!q) return items;
    return items.filter(x => String(x.data.userEmail || "").toLowerCase().includes(q));
  }

  async function sendText(){
    const t = String(inpText.value || "").trim();
    if(!SEL_UID || !t) return;
    inpText.value = "";

    const msgCol = fs.collection(db, "chats", SEL_UID, "messages");
    const chatRef = fs.doc(db, "chats", SEL_UID);

    await fs.addDoc(msgCol, {
      type: "text",
      text: t,
      senderUid: "admin",
      senderRole: "admin",
      senderEmail: adminEmail || "",
      createdAt: fs.serverTimestamp(),
      createdAtIso: new Date().toISOString()
    });

    await fs.setDoc(chatRef, {
      lastMessageAt: fs.serverTimestamp(),
      lastMessageText: t,
      unreadUser: fs.increment(1)
    }, { merge:true });
  }

  async function sendImage(file){
    if(!SEL_UID || !file) return;
    const msgCol = fs.collection(db, "chats", SEL_UID, "messages");
    const chatRef = fs.doc(db, "chats", SEL_UID);

    const imgData = await compressImageToDataUrl(file);

    await fs.addDoc(msgCol, {
      type: "image",
      imageDataUrl: imgData,
      text: "",
      senderUid: "admin",
      senderRole: "admin",
      senderEmail: adminEmail || "",
      createdAt: fs.serverTimestamp(),
      createdAtIso: new Date().toISOString()
    });

    await fs.setDoc(chatRef, {
      lastMessageAt: fs.serverTimestamp(),
      lastMessageText: "[Kép]",
      unreadUser: fs.increment(1)
    }, { merge:true });
  }

  async function sendCall(){
    if(!SEL_UID) return;
    const msgCol = fs.collection(db, "chats", SEL_UID, "messages");
    const chatRef = fs.doc(db, "chats", SEL_UID);
    const callUrl = `https://meet.jit.si/fitnesslady-${encodeURIComponent(SEL_UID)}`;

    await fs.addDoc(msgCol, {
      type: "call",
      callUrl,
      senderUid: "admin",
      senderRole: "admin",
      senderEmail: adminEmail || "",
      createdAt: fs.serverTimestamp(),
      createdAtIso: new Date().toISOString()
    });

    await fs.setDoc(chatRef, {
      lastMessageAt: fs.serverTimestamp(),
      lastMessageText: "[Videóhívás]",
      unreadUser: fs.increment(1)
    }, { merge:true });
  }

  async function mountRealtimeList(){
    if(unsubList) unsubList();
    const col = fs.collection(db, "chats");
    const q = fs.query(col, fs.orderBy("lastMessageAt","desc"), fs.limit(80));
    unsubList = fs.onSnapshot(q, (snap)=>{
      const items = snap.docs.map(d=>({ uid:d.id, data:d.data() || {} }));
      const filtered = applyFilter(items);

      listEl.innerHTML = "";
      if(filtered.length === 0){
        listEl.innerHTML = `<li class="li"><div><div class="title">Nincs chat</div><div class="desc">Még senki nem írt (vagy a szűrés üres).</div></div></li>`;
        return;
      }

      filtered.forEach(x=>{
        listEl.appendChild(renderChatItem(x.uid, x.data));
      });

      $$("[data-open-chat]").forEach(b=>{
        b.addEventListener("click", ()=>{
          const id = b.getAttribute("data-open-chat");
          const found = filtered.find(x=>x.uid===id) || items.find(x=>x.uid===id);
          pickChat(id, found?.data || {});
        });
      });
    });
  }

  btnRefresh.addEventListener("click", mountRealtimeList);
  searchEl.addEventListener("input", ()=>mountRealtimeList());

  btnSend.addEventListener("click", sendText);
  inpText.addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){ e.preventDefault(); sendText(); }
  });

  btnImg.addEventListener("click", ()=>fileInp.click());
  fileInp.addEventListener("change", async ()=>{
    const f = fileInp.files?.[0];
    fileInp.value = "";
    if(!f) return;
    await sendImage(f);
  });

  btnCall.addEventListener("click", sendCall);

  mountRealtimeList();

  return {
    pickChat,
    destroy(){
      if(unsubList) unsubList();
      if(unsubMsgs) unsubMsgs();
    }
  };
}
```0
