/* FILE: /hu/shared/customer-chat-halfsheet.js
   Customer chat logic for the half-sheet UI already present in /hu/app/index.html
   (Only JS here, so later you can update chat without touching app index.)
*/
export function initCustomerChatHalfSheet(opts){
  const { db, fs, escapeHtml, uid, profile, openInfo } = opts || {};
  if(!db || !fs || !uid) throw new Error("customer-chat-halfsheet: missing db/fs/uid");

  const $ = (sel, root=document) => root.querySelector(sel);

  // DOM (already in app/index.html)
  const chatFab = $("#chatFab");
  const chatBadge = $("#chatBadge");
  const chatOverlay = $("#chatOverlay");
  const chatClose = $("#chatClose");
  const chatBody = $("#chatBody");
  const chatEmpty = $("#chatEmpty");
  const chatInput = $("#chatInput");
  const chatSend = $("#chatSend");
  const chatAvatar = $("#chatAvatar");
  const chatName = $("#chatName");

  if(!chatFab || !chatOverlay || !chatBody || !chatInput || !chatSend){
    console.warn("Chat UI elements missing in DOM. (chat disabled)");
    return { updateProfile(){} };
  }

  function isChatAllowed(p){
    if(!p) return false;
    if(p.paid === true) return true;
    if(p.chatEnabled === true) return true;

    // chatTrialUntil can be Firestore Timestamp or ms or ISO
    const t = p.chatTrialUntil;
    let ms = 0;
    if(t?.toDate) ms = t.toDate().getTime();
    else if(typeof t === "number") ms = t;
    else if(typeof t === "string") {
      const d = new Date(t);
      ms = isNaN(d.getTime()) ? 0 : d.getTime();
    } else if(t instanceof Date) ms = t.getTime();

    return !!ms && ms > Date.now();
  }

  let P = profile || {};
  let chatUnsub = null;
  let chatOpen = false;
  let lastSeenCount = 0;

  // Gate UI
  const canUseChat = isChatAllowed(P);
  if(!canUseChat){
    chatFab.setAttribute("disabled","disabled");
    chatSend.setAttribute("disabled","disabled");
    chatInput.setAttribute("disabled","disabled");
    chatFab.title = "Chat csak fizetett/engedélyezett vevőknek.";
  }

  function initials(name){
    const n = String(name || "").trim();
    if(!n) return "FL";
    const parts = n.split(" ").filter(Boolean);
    const a = (parts[0] || "F").slice(0,1);
    const b = (parts[1] || "L").slice(0,1);
    return (a + b).toUpperCase();
  }

  function renderChatHeader(){
    const n = (P?.name || "").trim();
    const url = String(P?.photoURL || "").trim();
    chatAvatar.innerHTML = "";
    if(url){
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Profilkép";
      img.referrerPolicy = "no-referrer";
      img.onerror = ()=>{ chatAvatar.textContent = initials(n); };
      chatAvatar.appendChild(img);
    }else{
      chatAvatar.textContent = initials(n);
    }
    chatName.textContent = n ? `Chat • ${n}` : "Chat • FitnessLady";
  }

  function openChat(){
    if(!canUseChat){
      if(typeof openInfo === "function"){
        openInfo("Chat", "A chat jelenleg csak fizetett vagy admin által engedélyezett ügyfeleknek elérhető.");
      }
      return;
    }
    chatOpen = true;
    chatOverlay.classList.add("is-open");
    chatOverlay.setAttribute("aria-hidden","false");
    chatBadge.classList.remove("is-on");
    chatInput.focus({ preventScroll:true });
    ensureChatListener();
    markUserRead().catch(()=>{});
  }
  function closeChat(){
    chatOpen = false;
    chatOverlay.classList.remove("is-open");
    chatOverlay.setAttribute("aria-hidden","true");
  }

  chatFab.addEventListener("click", openChat);
  chatClose?.addEventListener("click", closeChat);
  chatOverlay.addEventListener("click", (e)=>{ if(e.target === chatOverlay) closeChat(); });

  function msgTime(ts){
    try{
      const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
      if(!d) return "";
      return d.toLocaleTimeString("hu-CH", { hour:"2-digit", minute:"2-digit" });
    }catch{ return ""; }
  }

  function renderMessages(items){
    chatBody.innerHTML = "";
    if(!items || items.length === 0){
      if(chatEmpty){
        chatEmpty.style.display = "block";
        chatBody.appendChild(chatEmpty);
      }
      return;
    }
    if(chatEmpty) chatEmpty.style.display = "none";

    items.forEach(m=>{
      const sender = String(m.sender || "").toLowerCase(); // "user" | "admin"
      const isMe = sender === "user";

      const row = document.createElement("div");
      row.className = "msgRow " + (isMe ? "me" : "other");

      const bub = document.createElement("div");
      bub.className = "bubble " + (isMe ? "me" : "other");
      bub.textContent = String(m.text || "");

      const t = document.createElement("div");
      t.className = "metaTime " + (isMe ? "me" : "other");
      t.textContent = msgTime(m.createdAt);

      const wrap = document.createElement("div");
      wrap.style.display = "grid";
      wrap.style.gap = "6px";
      wrap.style.maxWidth = "100%";
      wrap.appendChild(bub);
      wrap.appendChild(t);

      row.appendChild(wrap);
      chatBody.appendChild(row);
    });

    chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function ensureThreadDoc(){
    const ref = fs.doc(db, "chats", uid);
    const snap = await fs.getDoc(ref);
    if(!snap.exists()){
      await fs.setDoc(ref, {
        uid,
        createdAt: fs.serverTimestamp(),
        lastMessageAt: null,
        lastMessageSender: null,
        lastMessageText: "",
        lastAdminReadAt: null,
        lastUserReadAt: fs.serverTimestamp()
      }, { merge:true });
    }
  }

  async function markUserRead(){
    await fs.setDoc(fs.doc(db, "chats", uid), { lastUserReadAt: fs.serverTimestamp() }, { merge:true }).catch(()=>{});
  }

  function ensureChatListener(){
    if(chatUnsub) return;
    const q = fs.query(
      fs.collection(db, "chats", uid, "messages"),
      fs.orderBy("createdAt","asc"),
      fs.limit(200)
    );
    chatUnsub = fs.onSnapshot(q, (snap)=>{
      const items = snap.docs.map(d => ({ id:d.id, ...(d.data()||{}) }));
      renderMessages(items);

      if(!chatOpen){
        if(lastSeenCount > 0 && items.length > lastSeenCount){
          const delta = items.length - lastSeenCount;
          chatBadge.textContent = String(delta);
          chatBadge.classList.add("is-on");
        }
        lastSeenCount = items.length;
      }else{
        lastSeenCount = items.length;
        chatBadge.classList.remove("is-on");
        markUserRead().catch(()=>{});
      }
    }, (err)=>{
      console.error(err);
      if(typeof openInfo === "function"){
        openInfo("Chat hiba", escapeHtml ? escapeHtml(err?.message || String(err)) : (err?.message || String(err)));
      }
    });
  }

  async function sendChat(){
    try{
      if(!canUseChat) return;
      const text = String(chatInput.value || "").trim();
      if(!text) return;
      chatInput.value = "";

      await ensureThreadDoc();

      await fs.addDoc(fs.collection(db, "chats", uid, "messages"), {
        sender: "user",
        type: "text",
        text,
        createdAt: fs.serverTimestamp()
      });

      await fs.setDoc(fs.doc(db, "chats", uid), {
        lastMessageAt: fs.serverTimestamp(),
        lastMessageSender: "user",
        lastMessageText: text.slice(0, 180),
        lastUserReadAt: fs.serverTimestamp()
      }, { merge:true });
    }catch(e){
      console.error(e);
      if(typeof openInfo === "function"){
        openInfo("Chat hiba", escapeHtml ? escapeHtml(e.message || String(e)) : (e.message || String(e)));
      }
    }
  }

  chatSend.addEventListener("click", sendChat);
  chatInput.addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); sendChat(); } });

  renderChatHeader();
  // Listener: csak ha engedett (különben ne fusson rá rules errorra)
  if(canUseChat) ensureChatListener();

  return {
    updateProfile(nextProfile){
      P = nextProfile || P;
      renderChatHeader();
    },
    destroy(){
      if(chatUnsub) chatUnsub();
      chatUnsub = null;
    }
  };
}
```0
