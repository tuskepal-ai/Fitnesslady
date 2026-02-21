/* FILE: /hu/shared/chat-widget.js */
/**
 * App-only popup chat widget (OP2).
 * Uses /hu/shared/firebase.js exports to keep PRO app intact.
 */
import {
  db, fs,
  onAuth,
  ensureUserDoc,
  getUserDoc,
  isChatAllowed,
  ensureChatThread,
  listenChatMessages,
  sendChatText,
  sendChatImage,
  createJitsiRoomName,
  sendCallInvite,
  markUserRead,
  escapeHtml
} from "./firebase.js";

(function injectStyles(){
  if(document.getElementById("flChatWidgetStyles")) return;

  const css = `
:root{
  --chat-pink:#ff4fd8;
  --chat-pink2:#b14cff;
  --chat-bg: rgba(10,8,14,.74);
  --chat-stroke: rgba(255,255,255,.12);
  --chat-text: rgba(255,255,255,.92);
  --chat-muted: rgba(255,255,255,.70);
  --chat-radius: 18px;
  --chat-shadow: 0 22px 70px rgba(0,0,0,.55);
}
.fl-chat-fab{
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 9999;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.14);
  background: linear-gradient(135deg, var(--chat-pink), var(--chat-pink2));
  color: #140813;
  font-weight: 950;
  cursor:pointer;
  box-shadow: 0 18px 46px rgba(255,79,216,.22);
  display:flex;
  align-items:center;
  justify-content:center;
  user-select:none;
}
.fl-chat-badge{
  position:absolute;
  top:-6px;
  right:-6px;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  display:none;
  align-items:center;
  justify-content:center;
  background: rgba(255,215,140,.18);
  border: 1px solid rgba(255,215,140,.22);
  color: rgba(255,255,255,.92);
  font-size: 12px;
  font-weight: 950;
}
.fl-chat-badge.show{ display:inline-flex; }

.fl-chat-panel{
  position: fixed;
  right: 16px;
  bottom: 84px;
  z-index: 9999;
  width: min(420px, calc(100vw - 32px));
  height: min(620px, calc(100vh - 120px));
  border-radius: var(--chat-radius);
  border: 1px solid var(--chat-stroke);
  background: var(--chat-bg);
  box-shadow: var(--chat-shadow);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  overflow:hidden;
  display:none;
  grid-template-rows: auto 1fr auto;
}
.fl-chat-panel.open{ display:grid; }

.fl-chat-head{
  padding: 12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  border-bottom: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.12);
}
.fl-chat-head .t{ display:grid; gap:2px; min-width:0; }
.fl-chat-head .t b{
  color: var(--chat-text);
  font-weight: 950;
  overflow:hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fl-chat-head .t span{
  color: rgba(255,255,255,.60);
  font-size: 12.5px;
  overflow:hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fl-chat-head .x{
  width: 40px; height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.92);
  cursor:pointer;
  font-weight: 950;
}

.fl-chat-msgs{
  padding: 12px;
  overflow:auto;
  background: rgba(0,0,0,.08);
}
.fl-chat-msg{
  max-width: 82%;
  margin: 10px 0;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: var(--chat-text);
  box-shadow: 0 10px 30px rgba(0,0,0,.25);
  white-space: pre-wrap;
  word-break: break-word;
}
.fl-chat-msg.me{
  margin-left:auto;
  background: linear-gradient(135deg, rgba(255,79,216,.22), rgba(177,76,255,.14));
  border-color: rgba(255,79,216,.22);
}
.fl-chat-meta{
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  margin-bottom: 6px;
  color: rgba(255,255,255,.60);
  font-size: 12px;
}
.fl-chat-msg img{
  max-width: 100%;
  border-radius: 14px;
  display:block;
  border: 1px solid rgba(255,255,255,.10);
}

.fl-chat-foot{
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.12);
  display:grid;
  gap: 10px;
}
.fl-chat-actions{
  display:flex;
  gap: 10px;
  flex-wrap:wrap;
}
.fl-chat-lock{
  display:none;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.86);
  line-height: 1.45;
  font-size: 13px;
}
.fl-chat-lock.show{ display:block; }
.fl-chat-row{
  display:flex;
  gap: 10px;
  align-items:flex-end;
}
.fl-chat-row textarea{
  flex: 1;
  min-height: 42px;
  max-height: 120px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.92);
  outline:none;
  resize:none;
}
.fl-chat-btn{
  height: 42px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.92);
  cursor:pointer;
  font-weight: 900;
  white-space: nowrap;
}
.fl-chat-btn.primary{
  background: linear-gradient(135deg, var(--chat-pink), var(--chat-pink2));
  color:#140813;
  border-color: rgba(255,255,255,.16);
}
.fl-chat-btn:disabled{ opacity:.5; cursor:not-allowed; }

@media (max-width: 520px){
  .fl-chat-panel{ right: 12px; bottom: 78px; width: calc(100vw - 24px); }
  .fl-chat-fab{ right: 12px; bottom: 12px; }
}`;

  const style = document.createElement("style");
  style.id = "flChatWidgetStyles";
  style.textContent = css;
  document.head.appendChild(style);
})();

function injectUI(){
  if(document.getElementById("flChatFab")) return;

  const fab = document.createElement("button");
  fab.className = "fl-chat-fab";
  fab.id = "flChatFab";
  fab.type = "button";
  fab.setAttribute("aria-label","Chat");
  fab.innerHTML = `💬<span class="fl-chat-badge" id="flChatBadge">0</span>`;

  const panel = document.createElement("div");
  panel.className = "fl-chat-panel";
  panel.id = "flChatPanel";
  panel.setAttribute("role","dialog");
  panel.setAttribute("aria-modal","true");
  panel.setAttribute("aria-hidden","true");

  panel.innerHTML = `
    <div class="fl-chat-head">
      <div class="t">
        <b>Chat — FitnessLady</b>
        <span id="flChatSub">Csak fizetett vevőknek</span>
      </div>
      <button class="x" id="flChatClose" type="button" aria-label="Bezárás">✕</button>
    </div>

    <div class="fl-chat-msgs" id="flChatMsgs"></div>

    <div class="fl-chat-foot">
      <div class="fl-chat-actions">
        <button class="fl-chat-btn" id="flChatImageBtn" type="button">📷 Kép</button>
        <button class="fl-chat-btn" id="flChatCallBtn" type="button">🎥 Hívás</button>
      </div>

      <div class="fl-chat-lock" id="flChatLock">
        A chat csak fizetett vevőknek aktív (vagy admin engedéllyel).
      </div>

      <div class="fl-chat-row">
        <textarea id="flChatText" placeholder="Írj üzenetet…" rows="1"></textarea>
        <button class="fl-chat-btn primary" id="flChatSend" type="button">Küldés</button>
      </div>
    </div>
  `;

  const file = document.createElement("input");
  file.id = "flChatFile";
  file.type = "file";
  file.accept = "image/*";
  file.style.display = "none";

  document.body.appendChild(fab);
  document.body.appendChild(panel);
  document.body.appendChild(file);
}

function fmtTime(ts){
  try{
    const d = ts?.toDate ? ts.toDate() : null;
    if(!d) return "";
    return d.toLocaleString("hu-CH", { hour:"2-digit", minute:"2-digit", day:"2-digit", month:"2-digit" });
  }catch(_){ return ""; }
}

function setBadge(n){
  const badge = document.getElementById("flChatBadge");
  const num = Number(n||0);
  if(num > 0){
    badge.textContent = String(num);
    badge.classList.add("show");
  }else{
    badge.classList.remove("show");
  }
}

function setAllowed(on){
  const allowed = !!on;
  document.getElementById("flChatLock").classList.toggle("show", !allowed);
  ["flChatText","flChatSend","flChatImageBtn","flChatCallBtn"].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.disabled = !allowed;
  });
  document.getElementById("flChatSub").textContent = allowed ? "Admin válaszolni fog" : "Csak fizetett vevőknek";
}

function openPanel(){
  const panel = document.getElementById("flChatPanel");
  panel.classList.add("open");
  panel.setAttribute("aria-hidden","false");
  requestAnimationFrame(()=>{
    const msgs = document.getElementById("flChatMsgs");
    msgs.scrollTop = msgs.scrollHeight;
  });
}
function closePanel(){
  const panel = document.getElementById("flChatPanel");
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden","true");
}

async function boot(){
  injectUI();

  const fab = document.getElementById("flChatFab");
  const close = document.getElementById("flChatClose");
  const panel = document.getElementById("flChatPanel");
  const msgs = document.getElementById("flChatMsgs");

  const ta = document.getElementById("flChatText");
  const sendBtn = document.getElementById("flChatSend");
  const imgBtn= document.getElementById("flChatImageBtn");
  const callBtn= document.getElementById("flChatCallBtn");
  const file = document.getElementById("flChatFile");

  let uid = null;
  let allowed = false;
  let unlisten = null;

  // simple unread badge counter (only counts admin messages while closed)
  let adminUnread = 0;
  let lastAdminMsgId = null;

  function render(items){
    msgs.innerHTML = items.map(m=>{
      const mine = m.sender === "user" ? "me" : "";
      const who = m.sender === "user" ? "Te" : "Admin";
      const when = fmtTime(m.createdAt);

      if(m.type === "image" && m.imageUrl){
        return `
          <div class="fl-chat-msg ${mine}">
            <div class="fl-chat-meta"><span>${who}</span><span>${when}</span></div>
            <a href="${m.imageUrl}" target="_blank" rel="noopener">
              <img src="${m.imageUrl}" alt="Kép" />
            </a>
          </div>
        `;
      }

      if(m.type === "call" && m.callRoom){
        const url = "https://meet.jit.si/" + encodeURIComponent(m.callRoom);
        return `
          <div class="fl-chat-msg ${mine}">
            <div class="fl-chat-meta"><span>${who}</span><span>${when}</span></div>
            <div>🎥 Videóhívás</div>
            <div style="margin-top:8px;">
              <a class="fl-chat-btn primary" href="${url}" target="_blank" rel="noopener">Csatlakozás</a>
            </div>
          </div>
        `;
      }

      return `
        <div class="fl-chat-msg ${mine}">
          <div class="fl-chat-meta"><span>${who}</span><span>${when}</span></div>
          ${escapeHtml(m.text || "")}
        </div>
      `;
    }).join("");

    requestAnimationFrame(()=> msgs.scrollTop = msgs.scrollHeight);
  }

  fab.addEventListener("click", async ()=>{
    const isOpen = panel.classList.contains("open");
    if(isOpen){
      closePanel();
      if(uid) await markUserRead(uid).catch(()=>{});
    }else{
      openPanel();
      adminUnread = 0;
      setBadge(0);
      if(uid) await markUserRead(uid).catch(()=>{});
    }
  });

  close.addEventListener("click", async ()=>{
    closePanel();
    if(uid) await markUserRead(uid).catch(()=>{});
  });

  onAuth(async (user)=>{
    if(!user) return; // app úgyis loginra dob
    uid = user.uid;

    // ensure user doc baseline fields
    await ensureUserDoc(uid, {
      email: user.email || "",
      displayName: user.displayName || ""
    });

    // OP2 allow logic
    const udoc = await getUserDoc(uid);
    allowed = isChatAllowed(udoc);
    setAllowed(allowed);

    await ensureChatThread(uid, {
      email: user.email || "",
      displayName: user.displayName || ""
    });

    if(unlisten) unlisten();
    unlisten = listenChatMessages(uid, (items)=>{
      // unread badge logic
      const last = items[items.length - 1];
      if(last && last.sender === "admin"){
        const id = last.id;
        if(lastAdminMsgId && id !== lastAdminMsgId && !panel.classList.contains("open")){
          adminUnread += 1;
          setBadge(adminUnread);
        }
        lastAdminMsgId = id;
      }
      render(items);
    });
  });

  async function doSend(){
    if(!allowed || !uid) return;
    const s = (ta.value || "").trim();
    if(!s) return;
    ta.value = "";
    await sendChatText(uid, "user", s);
  }

  sendBtn.addEventListener("click", doSend);
  ta.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      doSend();
    }
  });

  imgBtn.addEventListener("click", ()=>{
    if(!allowed) return;
    file.value = "";
    file.click();
  });

  file.addEventListener("change", async ()=>{
    if(!allowed || !uid) return;
    const f = file.files?.[0];
    if(!f) return;
    if(f.size > 8 * 1024 * 1024){
      alert("A kép túl nagy (max 8MB).");
      return;
    }
    await sendChatImage(uid, "user", f);
  });

  callBtn.addEventListener("click", async ()=>{
    if(!allowed || !uid) return;
    const room = createJitsiRoomName(uid);
    await sendCallInvite(uid, "user", room);
    const url = `https://meet.jit.si/${encodeURIComponent(room)}`;
    window.open(url, "_blank", "noopener");
  });
}

boot().catch((e)=>console.error("Chat widget error:", e));
