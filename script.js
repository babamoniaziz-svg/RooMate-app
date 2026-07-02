/* ================= RooMate v5 — script.js =================
   NOW CONNECTED TO SUPABASE (real backend):
   • Real email signup + login (works on any device)
   • Real profiles stored in your database
   • Real likes → mutual like = real match
   • Real chat messages saved in database (refreshes every 3s)
   • Premium flag saved on your real profile
   Demo profiles (🤖 marked) are kept so browsing is never empty.
   Rules kept: women message first, women 2 free msgs, men need
   Premium, safety filter, report & block, all Bumble features.
============================================================ */

// ---------- YOUR SUPABASE PROJECT ----------
const SUPABASE_URL = "https://blycjlmgjrisbtxfzjai.supabase.co";
const SUPABASE_KEY = "sb_publishable_yHssaproKqdKBja1f2rG1A_-XVNzQdx";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- Demo profiles (🤖 bots so the app never feels empty) ----------
const DEMO = [
  { id: "demo-1", demo: true, name: "Sarah",  age: 26, gender: "F", emoji: "👩‍💻", job: "Software Engineer", city: "Guwahati", verified: true,
    bio: "Weekend trekker, weekday coder. Looking for someone genuine.", edu: "B.Tech, AEC Guwahati", rel: "Islam", ht: "5'4\"", intent: "Serious relationship", tags: ["Travel","Music","Guwahati"] },
  { id: "demo-2", demo: true, name: "Priya",  age: 24, gender: "F", emoji: "👩‍🎨", job: "Graphic Designer", city: "Delhi", verified: false,
    bio: "I design logos by day and dream of opening a café by night ☕", edu: "BFA, Delhi", rel: "Hindu", ht: "5'2\"", intent: "RooMate", tags: ["Art","Foodie","Delhi"] },
  { id: "demo-3", demo: true, name: "Rahul",  age: 28, gender: "M", emoji: "👨‍⚕️", job: "Doctor", city: "Mumbai", verified: true,
    bio: "MBBS done, MD ongoing. Gym at 6, hospital at 8.", edu: "MBBS, GMCH", rel: "Hindu", ht: "5'10\"", intent: "Marriage-minded", tags: ["Fitness","Books","Mumbai"] },
  { id: "demo-4", demo: true, name: "Ananya", age: 25, gender: "F", emoji: "👩‍🏫", job: "Teacher", city: "Tezpur", verified: true,
    bio: "Teaching kids maths, learning life myself.", edu: "M.Sc, Tezpur University", rel: "Hindu", ht: "5'3\"", intent: "Marriage-minded", tags: ["Movies","Cooking","Tezpur"] },
  { id: "demo-5", demo: true, name: "Arjun",  age: 27, gender: "M", emoji: "👨‍💼", job: "Bank Officer", city: "Jorhat", verified: false,
    bio: "PO at a nationalised bank. Weekends = cricket + long drives.", edu: "B.Com, Jorhat", rel: "Hindu", ht: "5'8\"", intent: "Serious relationship", tags: ["Cricket","Trekking","Jorhat"] },
  { id: "demo-6", demo: true, name: "Meera",  age: 23, gender: "F", emoji: "👩‍🔬", job: "Research Scholar", city: "Shillong", verified: true,
    bio: "PhD in chemistry, poetry in free time. Chai > coffee.", edu: "PhD scholar, NEHU", rel: "Hindu", ht: "5'5\"", intent: "Friendship first", tags: ["Science","Poetry","Shillong"] }
];

const EVENTS = [
  { id: 1, emoji: "☕", title: "Coffee & Connect — Guwahati", meta: "Sat 6 PM • Café Hendrix, GS Road • 14 going" },
  { id: 2, emoji: "🥾", title: "Sunrise trek — Basistha hills", meta: "Sun 5 AM • Group of 20 • Beginner friendly" },
  { id: 3, emoji: "🎲", title: "Board-game night", meta: "Fri 7 PM • Maker's Space, Zoo Road • 9 going" },
  { id: 4, emoji: "📚", title: "Book swap meetup", meta: "Sat 4 PM • District Library lawn • 11 going" }
];

// ---------- Local state (demo interactions + settings only) ----------
let me = null;               // my profile row from Supabase
let deck = [];               // profiles to browse (real + demo)
let realMatches = [];        // [{matchId, profile}]
let local = {
  superSwipes: 1, compliments: 1,
  demoSeen: [], demoMatches: [], demoChats: {}, demoBlocked: [],
  joinedEvents: [], incognito: false, snooze: false, travelCity: "",
  filters: { gender: "All", ageMin: 18, ageMax: 40 }
};
function saveLocal(){ localStorage.setItem("roomate_local_v5", JSON.stringify(local)); }
function loadLocal(){
  const raw = localStorage.getItem("roomate_local_v5");
  if (raw) local = Object.assign(local, JSON.parse(raw));
}
const $ = id => document.getElementById(id);
const isDemo = id => typeof id === "string" && id.startsWith("demo-");
const avatarFor = p => p.emoji || (p.gender === "F" ? "🙋‍♀️" : "🙋‍♂️");
const photoOrEmoji = p => p.photo_url ? `<img src="${p.photo_url}" alt="${p.name}">` : avatarFor(p);

// ---------- Navigation ----------
function show(screenId){
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(screenId).classList.add("active");
  const hideNav = ["screen-signup","screen-chat","screen-filters"].includes(screenId);
  $("bottomNav").classList.toggle("hidden", hideNav);
  document.querySelectorAll(".nav-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.screen === screenId));
  if (screenId !== "screen-chat") stopChatPolling();
}
document.querySelectorAll(".nav-btn").forEach(btn =>
  btn.addEventListener("click", () => {
    show(btn.dataset.screen);
    if (btn.dataset.screen === "screen-matches") renderMatches();
    if (btn.dataset.screen === "screen-events") renderEvents();
    if (btn.dataset.screen === "screen-profile") renderProfile();
  })
);
document.querySelectorAll(".go-browse").forEach(b =>
  b.addEventListener("click", () => show("screen-browse")));

// ---------- Auth: login / signup tabs ----------
let authMode = "signup";
function setAuthMode(mode){
  authMode = mode;
  $("tabLogin").classList.toggle("active", mode === "login");
  $("tabSignup").classList.toggle("active", mode === "signup");
  $("signupFields").style.display = mode === "signup" ? "flex" : "none";
  $("authBtn").textContent = mode === "signup" ? "Sign up" : "Log in";
  $("signupError").textContent = "";
}
$("tabLogin").addEventListener("click", () => setAuthMode("login"));
$("tabSignup").addEventListener("click", () => setAuthMode("signup"));

$("authBtn").addEventListener("click", async () => {
  const err = $("signupError");
  err.textContent = "";
  const email = $("email").value.trim(), pass = $("password").value;
  if (!/^\S+@\S+\.\S+$/.test(email)){ err.textContent = "Enter a valid email."; return; }
  if (pass.length < 6){ err.textContent = "Password must be at least 6 characters."; return; }
  $("authBtn").disabled = true;

  try {
    if (authMode === "signup"){
      const name = $("name").value.trim(), age = parseInt($("age").value),
            city = $("city").value.trim(), gender = $("gender").value,
            looking = $("lookingFor").value;
      if (!name || !age || !city || !gender || !looking){ err.textContent = "Please fill all fields."; return; }
      if (age < 18){ err.textContent = "RooMate is 18+ only."; return; }

      const { data, error } = await db.auth.signUp({ email, password: pass });
      if (error){ err.textContent = error.message; return; }
      if (!data.session){
        err.textContent = "Check your email to confirm, then Log in. (Tip: disable 'Confirm email' in Supabase for testing.)";
        setAuthMode("login"); return;
      }
      const { error: pErr } = await db.from("profiles").insert({
        id: data.user.id, name, age, city, gender, looking_for: looking
      });
      if (pErr){ err.textContent = "Profile save failed: " + pErr.message; return; }
      await enterApp();
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password: pass });
      if (error){ err.textContent = error.message; return; }
      await enterApp();
    }
  } catch(e){
    err.textContent = "Network problem — check internet and try again.";
  } finally {
    $("authBtn").disabled = false;
  }
});

async function enterApp(){
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).single();
  if (!profile){
    // account exists but profile missing (edge case) — send back to signup fields
    $("signupError").textContent = "Profile not found — please sign up again with details.";
    setAuthMode("signup"); return;
  }
  me = profile;
  if (local.filters.gender === "All")
    local.filters.gender = me.gender === "M" ? "F" : me.gender === "F" ? "M" : "All";
  saveLocal();
  refreshPlanBadge();
  await buildDeck();
  show("screen-browse");
}

// ---------- Premium (saved on real profile) ----------
function refreshPlanBadge(){
  const b = $("planBadge");
  b.textContent = me && me.premium ? "✨ Premium" : "Free";
  b.classList.toggle("premium", !!(me && me.premium));
}
async function buyPremium(){
  if (me.premium) return alert("You already have RooMate Premium ✨");
  if (confirm("Get RooMate Premium for ₹99/month? (demo payment — Razorpay comes next)\n\n✓ Unlimited messages\n✓ Unlimited SuperSwipes ⭐\n✓ Unlimited Compliments 💬\n✓ Incognito & Travel Mode")){
    const { error } = await db.from("profiles").update({ premium: true }).eq("id", me.id);
    if (error) return alert("Could not activate: " + error.message);
    me.premium = true;
    refreshPlanBadge(); renderProfile();
    if (activeChat) refreshChatGates();
    alert("Welcome to RooMate Premium ✨");
  }
}
$("premiumBtn").addEventListener("click", buyPremium);
$("paywallBtn").addEventListener("click", buyPremium);

// ---------- Filters ----------
$("filterBtn").addEventListener("click", () => {
  $("fltGender").value = local.filters.gender;
  $("fltAgeMin").value = local.filters.ageMin;
  $("fltAgeMax").value = local.filters.ageMax;
  updateFilterLabels(); show("screen-filters");
});
function updateFilterLabels(){
  $("ageLabel").textContent = `${$("fltAgeMin").value} – ${$("fltAgeMax").value}`;
}
["fltAgeMin","fltAgeMax"].forEach(id => $(id).addEventListener("input", updateFilterLabels));
$("applyFilters").addEventListener("click", async () => {
  let min = parseInt($("fltAgeMin").value) || 18, max = parseInt($("fltAgeMax").value) || 40;
  if (min > max) [min, max] = [max, min];
  local.filters = { gender: $("fltGender").value, ageMin: min, ageMax: max };
  saveLocal(); await buildDeck(); show("screen-browse");
});

// ---------- Build browse deck: REAL profiles + demo bots ----------
async function buildDeck(){
  $("cardStack").innerHTML = `<p class="loading-note">Loading profiles…</p>`;
  let real = [];
  try {
    const [{ data: profiles }, { data: myLikes }, { data: myBlocks }] = await Promise.all([
      db.from("profiles").select("*").neq("id", me.id),
      db.from("likes").select("liked").eq("liker", me.id),
      db.from("blocks").select("blocked").eq("blocker", me.id)
    ]);
    const likedIds = (myLikes || []).map(r => r.liked);
    const blockedIds = (myBlocks || []).map(r => r.blocked);
    real = (profiles || []).filter(p => !likedIds.includes(p.id) && !blockedIds.includes(p.id));
  } catch(e){ /* offline → demo only */ }

  const all = [...real, ...DEMO.filter(d => !local.demoSeen.includes(d.id) && !local.demoBlocked.includes(d.id))];
  const f = local.filters;
  deck = all.filter(p => {
    if (f.gender !== "All" && p.gender !== f.gender) return false;
    if (p.age < f.ageMin || p.age > f.ageMax) return false;
    return true;
  });
  renderStack();
}

function cardHTML(p, behind){
  return `
  <div class="profile-card ${behind ? "behind" : ""}" data-id="${p.id}">
    <div class="profile-photo">${photoOrEmoji(p)}
      ${p.demo ? `<span class="demo-flag">🤖 Demo profile</span>` : ""}
      <span class="stamp like-stamp">CONNECT</span>
      <span class="stamp pass-stamp">NOPE</span>
      ${p.verified ? `<span class="verify-tick">✔ Verified</span>` : ""}
    </div>
    <div class="profile-body">
      <h2>${p.name}, ${p.age}</h2>
      <p class="job">${p.job || (p.looking_for ? "Looking for: " + p.looking_for : "")}</p>
      <p class="dist">📍 ${local.travelCity || p.city || "India"}</p>
      <div class="tag-row">${(p.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</div>
      <p class="tap-hint">Tap for full profile • Drag to swipe • Swipe up = ⭐</p>
    </div>
  </div>`;
}

function renderStack(){
  const stack = $("cardStack");
  const tb = $("travelBanner");
  tb.classList.toggle("hidden", !local.travelCity);
  if (local.travelCity) tb.textContent = `✈️ Travel Mode — browsing in ${local.travelCity}`;
  if (local.snooze){
    stack.innerHTML = `<p class="empty-note">😴 Snooze Mode is ON.<br>Turn it off in <strong>You → Modes</strong>.</p>`;
    return;
  }
  if (!deck.length){
    stack.innerHTML = `<p class="empty-note">Aaj ke liye bas itna hi! 🌙<br>Invite friends to join RooMate, or adjust <strong>filters ⚙</strong>.</p>`;
    return;
  }
  stack.innerHTML = (deck[1] ? cardHTML(deck[1], true) : "") + cardHTML(deck[0], false);
  attachSwipe(stack.querySelector(".profile-card:not(.behind)"));
}

// ---------- Swipe gestures ----------
function attachSwipe(card){
  if (!card) return;
  let sx=0, sy=0, dx=0, dy=0, dragging=false, moved=false;
  const likeStamp = card.querySelector(".like-stamp");
  const passStamp = card.querySelector(".pass-stamp");
  card.addEventListener("pointerdown", e => {
    dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
    card.classList.add("dragging"); card.setPointerCapture(e.pointerId);
  });
  card.addEventListener("pointermove", e => {
    if (!dragging) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
    card.style.transform = `translate(${dx}px, ${dy * 0.4}px) rotate(${dx / 14}deg)`;
    likeStamp.style.opacity = dx > 0 ? Math.min(dx / 90, 1) : 0;
    passStamp.style.opacity = dx < 0 ? Math.min(-dx / 90, 1) : 0;
  });
  card.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false; card.classList.remove("dragging");
    if (dy < -120 && Math.abs(dx) < 90){ trySuperSwipe(card); }
    else if (dx > 100){ flyAway(card, "right"); }
    else if (dx < -100){ flyAway(card, "left"); }
    else {
      card.style.transform = ""; likeStamp.style.opacity = 0; passStamp.style.opacity = 0;
      if (!moved) openDetail(card.dataset.id);
    }
    dx = 0; dy = 0;
  });
}
function flyAway(card, dir){
  card.style.transform = "";
  card.classList.add(dir === "right" ? "fly-right" : dir === "left" ? "fly-left" : "fly-up");
  setTimeout(() => handleSwipe(dir), 260);
}
function topCard(){ return document.querySelector(".profile-card:not(.behind)"); }
$("passBtn").addEventListener("click", () => { const c = topCard(); if (c) flyAway(c, "left"); });
$("likeBtn").addEventListener("click", () => { const c = topCard(); if (c) flyAway(c, "right"); });
$("superBtn").addEventListener("click", () => { const c = topCard(); if (c) trySuperSwipe(c); });

function trySuperSwipe(card){
  if (!me.premium && local.superSwipes <= 0){
    card.style.transform = "";
    if (confirm("No SuperSwipes left ⭐\nPremium gives unlimited SuperSwipes. Get Premium?")) buyPremium();
    return;
  }
  if (!me.premium){ local.superSwipes--; saveLocal(); }
  flyAway(card, "up");
}

async function handleSwipe(dir){
  const p = deck[0];
  if (!p) return;
  deck.shift();

  if (isDemo(p.id)){
    local.demoSeen.push(p.id);
    let matched = dir === "up" || (dir === "right" && Math.random() < 0.6);
    if (matched){
      local.demoMatches.push(p.id);
      local.demoChats[p.id] = { msgs: [], myCount: 0, theirMoveDone: false };
      seedDemoFirstMove(p);
    }
    saveLocal(); renderStack();
    if (matched) showMatchOverlay(p, dir === "up");
    return;
  }

  // REAL profile → save like to Supabase, check for mutual like
  renderStack();
  if (dir === "left") { // record pass silently? keep simple: passes not stored (they'll reappear next session)
    return;
  }
  try {
    await db.from("likes").insert({ liker: me.id, liked: p.id, is_super: dir === "up" });
    const { data: reciprocal } = await db.from("likes")
      .select("id").eq("liker", p.id).eq("liked", me.id).maybeSingle();
    if (reciprocal){
      const { data: m, error } = await db.from("matches")
        .insert({ user1: me.id, user2: p.id }).select().single();
      if (!error && m){
        realMatches.push({ matchId: m.id, profile: p });
        showMatchOverlay(p, dir === "up");
      }
    }
  } catch(e){ /* like may already exist — fine */ }
}

// ---------- Women-message-first helpers ----------
function womanMovesFirst(p){ return me.gender === "M" && p.gender === "F"; }
function iMoveFirst(p){ return me.gender === "F"; }

function seedDemoFirstMove(p){
  if (womanMovesFirst(p)){
    setTimeout(() => {
      const chat = local.demoChats[p.id];
      if (chat && !chat.theirMoveDone){
        chat.msgs.push({ from: "them", text: `Hi ${me.name}! I liked your profile 😊` });
        chat.theirMoveDone = true;
        saveLocal();
        if (activeChat === p.id){ renderDemoChat(); refreshChatGates(); }
      }
    }, 6000);
  }
}

// ---------- Match overlay ----------
let lastMatch = null;
function showMatchOverlay(p, wasSuper){
  lastMatch = p.id;
  $("matchThem").innerHTML = photoOrEmoji(p);
  $("matchMe").innerHTML = me.photo_url ? `<img src="${me.photo_url}" alt="me">` : (me.gender === "F" ? "🙋‍♀️" : "🙋‍♂️");
  $("matchText").textContent = (wasSuper ? "⭐ SuperSwipe worked! " : "") + `You and ${p.name} connected`;
  $("matchRule").textContent =
    womanMovesFirst(p) ? `Ladies first — ${p.name} sends the first message.` :
    iMoveFirst(p) ? "You make the first move! Your first 2 messages are free." : "";
  $("matchOverlay").classList.remove("hidden");
}
$("matchKeepBtn").addEventListener("click", () => $("matchOverlay").classList.add("hidden"));
$("matchChatBtn").addEventListener("click", () => {
  $("matchOverlay").classList.add("hidden"); openChat(lastMatch);
});

// ---------- Profile detail + Compliments ----------
let detailId = null;
function findProfile(id){
  return deck.find(x => x.id === id) || DEMO.find(x => x.id === id) ||
         realMatches.map(m => m.profile).find(x => x.id === id) || null;
}
function openDetail(id){
  const p = findProfile(id); if (!p) return;
  detailId = id;
  $("detailPhoto").innerHTML = photoOrEmoji(p);
  $("detailName").textContent = `${p.name}, ${p.age}` + (p.verified ? " ✔" : "");
  $("detailJob").textContent = p.job || "";
  $("detailDist").textContent = `📍 ${local.travelCity || p.city || "India"}`;
  $("detailBio").textContent = p.bio || "";
  $("detailEdu").textContent = p.edu || "—";
  $("detailRel").textContent = p.rel || "—";
  $("detailHt").textContent = p.ht || "—";
  $("detailIntent").textContent = p.intent || p.looking_for || "—";
  $("detailTags").innerHTML = (p.tags || []).map(t => `<span class="tag">${t}</span>`).join("");
  $("detailOverlay").classList.remove("hidden");
}
$("closeDetail").addEventListener("click", () => $("detailOverlay").classList.add("hidden"));
$("detailOverlay").addEventListener("click", e => {
  if (e.target.id === "detailOverlay") $("detailOverlay").classList.add("hidden");
});
$("complimentBtn").addEventListener("click", async () => {
  const p = findProfile(detailId); if (!p) return;
  if (!me.premium && local.compliments <= 0){
    if (confirm("No Compliments left 💬\nPremium gives unlimited Compliments. Get Premium?")) buyPremium();
    return;
  }
  const text = prompt(`Send ${p.name} a Compliment (about their profile):`, "");
  if (!text || !text.trim()) return;
  if (violatesSafety(text)){ alert("Compliments cannot contain contact details. 🔒"); return; }
  if (!me.premium){ local.compliments--; saveLocal(); }
  $("detailOverlay").classList.add("hidden");

  if (isDemo(p.id)){
    local.demoSeen.push(p.id);
    deck = deck.filter(x => x.id !== p.id);
    if (Math.random() < 0.8){
      local.demoMatches.push(p.id);
      local.demoChats[p.id] = { msgs: [{ from: "me", text: `💬 Compliment: ${text.trim()}` }], myCount: 0, theirMoveDone: true };
      saveLocal(); renderStack(); showMatchOverlay(p, false);
    } else {
      alert(`Compliment sent to ${p.name} 💬`);
      saveLocal(); renderStack();
    }
  } else {
    // Real profile: compliment = a super-like (message delivery comes with match)
    try { await db.from("likes").insert({ liker: me.id, liked: p.id, is_super: true }); } catch(e){}
    deck = deck.filter(x => x.id !== p.id);
    alert(`Compliment sent to ${p.name} 💬 — if they connect back, it's a match!`);
    renderStack();
  }
});

// ---------- Matches list (real + demo) ----------
async function loadRealMatches(){
  try {
    const { data: rows } = await db.from("matches")
      .select("id, user1, user2").or(`user1.eq.${me.id},user2.eq.${me.id}`);
    if (!rows) { realMatches = []; return; }
    const otherIds = rows.map(r => r.user1 === me.id ? r.user2 : r.user1);
    const { data: people } = otherIds.length
      ? await db.from("profiles").select("*").in("id", otherIds)
      : { data: [] };
    const { data: blocks } = await db.from("blocks").select("blocked").eq("blocker", me.id);
    const blockedIds = (blocks || []).map(b => b.blocked);
    realMatches = rows.map(r => {
      const otherId = r.user1 === me.id ? r.user2 : r.user1;
      return { matchId: r.id, profile: (people || []).find(p => p.id === otherId) };
    }).filter(m => m.profile && !blockedIds.includes(m.profile.id));
  } catch(e){ /* keep old list */ }
}

async function renderMatches(){
  const list = $("matchList");
  list.innerHTML = `<p class="empty-note">Loading…</p>`;
  await loadRealMatches();
  const demoIds = local.demoMatches.filter(id => !local.demoBlocked.includes(id));
  if (!realMatches.length && !demoIds.length){
    list.innerHTML = `<p class="empty-note">No connects yet. Keep browsing — koi na koi milega! 💫</p>`;
    return;
  }
  const realHTML = realMatches.map(m => `
    <button class="match-item" data-id="${m.profile.id}">
      <span class="match-emoji">${photoOrEmoji(m.profile)}</span>
      <div><h3>${m.profile.name}, ${m.profile.age}${m.profile.verified ? " ✔" : ""}</h3><p>Real member • tap to chat</p></div>
    </button>`).join("");
  const demoHTML = demoIds.map(id => {
    const p = DEMO.find(x => x.id === id);
    const chat = local.demoChats[id];
    const last = chat && chat.msgs.length ? chat.msgs[chat.msgs.length - 1].text : "Say hi!";
    return `<button class="match-item" data-id="${id}">
      <span class="match-emoji">${p.emoji}</span>
      <div><h3>${p.name}, ${p.age}${p.verified ? " ✔" : ""} 🤖</h3><p>${last}</p></div>
    </button>`;
  }).join("");
  list.innerHTML = realHTML + demoHTML;
  list.querySelectorAll(".match-item").forEach(el =>
    el.addEventListener("click", () => openChat(el.dataset.id)));
}

// ---------- Events ----------
function renderEvents(){
  $("eventList").innerHTML = EVENTS.map(e => {
    const joined = local.joinedEvents.includes(e.id);
    return `<div class="match-item">
      <span class="match-emoji">${e.emoji}</span>
      <div><h3>${e.title}</h3><p>${e.meta}</p></div>
      <button class="join" data-id="${e.id}">${joined ? "Joined ✔" : "Join"}</button>
    </div>`;
  }).join("");
  $("eventList").querySelectorAll(".join").forEach(btn =>
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      if (!local.joinedEvents.includes(id)) local.joinedEvents.push(id);
      saveLocal(); renderEvents();
    }));
}

// ---------- You / modes / safety ----------
function renderProfile(){
  $("myAvatar").innerHTML = me.photo_url
    ? `<img src="${me.photo_url}" alt="me">`
    : (me.gender === "F" ? "🙋‍♀️" : "🙋‍♂️");
  $("meName").textContent = me.name + (me.premium ? " ✨" : "");
  $("meMeta").textContent = `${me.gender === "F" ? "Woman" : "Man"}, ${me.age} • ${me.city} • Looking for: ${me.looking_for}`;
  $("premiumBtn").textContent = me.premium ? "✨ Premium active" : "✨ Get RooMate Premium — ₹99/month";
  $("premiumNote").textContent = me.premium ? "" :
    `Free plan: ${local.superSwipes} SuperSwipe ⭐ • ${local.compliments} Compliment 💬 left`;
  $("incognitoToggle").checked = local.incognito;
  $("snoozeToggle").checked = local.snooze;
  $("travelSelect").value = local.travelCity;
}
$("incognitoToggle").addEventListener("change", e => {
  if (e.target.checked && !me.premium){
    e.target.checked = false;
    if (confirm("🕶 Incognito Mode is a Premium feature. Get Premium?")) buyPremium();
    return;
  }
  local.incognito = e.target.checked; saveLocal();
  alert(local.incognito ? "🕶 Incognito ON — hidden from everyone except your connects." : "Incognito OFF — visible again.");
});
$("snoozeToggle").addEventListener("change", e => {
  local.snooze = e.target.checked; saveLocal(); renderStack();
});
$("travelSelect").addEventListener("change", e => {
  if (e.target.value && !me.premium){
    e.target.value = "";
    if (confirm("✈️ Travel Mode is a Premium feature. Get Premium?")) buyPremium();
    return;
  }
  local.travelCity = e.target.value; saveLocal(); renderStack();
});
// ---------- Photo upload (Supabase Storage) ----------
$("uploadPhotoBtn").addEventListener("click", () => $("photoInput").click());
$("photoInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  const status = $("photoStatus");
  if (!file) return;
  if (!file.type.startsWith("image/")){ status.textContent = "Please choose an image file."; return; }
  if (file.size > 5 * 1024 * 1024){ status.textContent = "Image too big — maximum 5 MB."; return; }
  status.textContent = "Uploading… ⏳";
  try {
    const ext = file.name.split(".").pop().toLowerCase();
    const path = `${me.id}/avatar_${Date.now()}.${ext}`;
    const { error: upErr } = await db.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr){ status.textContent = "Upload failed: " + upErr.message; return; }
    const { data: pub } = db.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: dbErr } = await db.from("profiles").update({ photo_url: url }).eq("id", me.id);
    if (dbErr){ status.textContent = "Save failed: " + dbErr.message; return; }
    me.photo_url = url;
    renderProfile();
    status.textContent = "Photo updated ✔";
  } catch(err){
    status.textContent = "Network problem — try again.";
  }
  e.target.value = "";
});

$("logoutBtn").addEventListener("click", async () => {
  if (confirm("Log out of RooMate?")){
    await db.auth.signOut();
    location.reload();
  }
});

function infoSheet(html){ $("infoBody").innerHTML = html; $("infoOverlay").classList.remove("hidden"); }
$("closeInfo").addEventListener("click", () => $("infoOverlay").classList.add("hidden"));
$("infoOverlay").addEventListener("click", e => {
  if (e.target.id === "infoOverlay") $("infoOverlay").classList.add("hidden");
});
$("safetyTipsBtn").addEventListener("click", () => infoSheet(`
  <h2>🛡 Safety tips</h2>
  <h3>Before meeting</h3>
  <ul><li>Chat inside RooMate only — never share your phone number, address, or social media early. Our filter blocks these for your safety.</li>
  <li>Video call inside the app first to confirm the person is real.</li>
  <li>Look for the ✔ Verified badge.</li></ul>
  <h3>First meeting</h3>
  <ul><li>Meet in a public place, daytime is best — or join a group Plan 📅.</li>
  <li>Tell a friend or family member where you are going and with whom.</li>
  <li>Arrange your own travel — don't depend on the other person to drop you home.</li>
  <li>Keep your drink with you at all times.</li></ul>
  <h3>If something feels wrong</h3>
  <ul><li>Trust your instinct and leave. You owe nobody an explanation.</li>
  <li>Use ⋮ in chat to Report or Block instantly.</li>
  <li>Emergency: call <strong>112</strong>. Women's helpline: <strong>181</strong>. Cyber crime: <strong>1930</strong> / cybercrime.gov.in</li></ul>`));
$("helpBtn").addEventListener("click", () => infoSheet(`
  <h2>💬 Help & support</h2>
  <ul><li>Report a member: open the chat → ⋮ → Report</li>
  <li>Account & payment issues: support@roomate.app (demo)</li>
  <li>Grievance Officer (IT Rules 2021): to be appointed before launch</li>
  <li>Response time: within 24 hours (demo)</li></ul>`));
$("guidelinesBtn").addEventListener("click", () => infoSheet(`
  <h2>📜 Community guidelines</h2>
  <ul><li>18+ only. Zero tolerance for minors on the platform.</li>
  <li>Be respectful. No harassment, hate speech, or abusive language.</li>
  <li>No fake profiles, no impersonation, no misleading photos.</li>
  <li>No asking for money, gifts, or financial details — ever.</li>
  <li>No nudity or sexual content.</li>
  <li>Breaking the rules = warning, suspension, or permanent ban.</li></ul>`));

// ---------- Chat (real via Supabase, demo via local) ----------
let activeChat = null;      // profile id
let activeMatchId = null;   // real match row id (null for demo)
let realMsgs = [];
let pollTimer = null;

function chatPartner(){ return findProfile(activeChat) || DEMO.find(x => x.id === activeChat); }
function stopChatPolling(){ if (pollTimer){ clearInterval(pollTimer); pollTimer = null; } }

function myMsgCount(){
  if (isDemo(activeChat)) return (local.demoChats[activeChat] || { myCount: 0 }).myCount;
  return realMsgs.filter(m => m.sender === me.id).length;
}
function theirMoveDone(){
  if (isDemo(activeChat)) return (local.demoChats[activeChat] || {}).theirMoveDone;
  return realMsgs.some(m => m.sender !== me.id);
}

function canISend(){
  const p = chatPartner();
  if (!p) return { ok: false, why: "" };
  if (womanMovesFirst(p) && !theirMoveDone())
    return { ok: false, why: `Ladies first 🙋‍♀️ — ${p.name} sends the first message. You'll see it here.` };
  if (me.premium) return { ok: true, why: "" };
  if (me.gender === "F"){
    const used = myMsgCount();
    if (used < 2) return { ok: true, why: `Free messages left in this connect: ${2 - used}` };
    return { ok: false, why: "Your 2 free messages are used. Get Premium for unlimited chat ✨" };
  }
  return { ok: false, why: "Chatting needs RooMate Premium ✨ (women get 2 free messages; men chat with Premium)" };
}

function refreshChatGates(){
  const gate = canISend();
  $("chatInput").disabled = !gate.ok;
  $("sendBtn").disabled = !gate.ok;
  const p = chatPartner();
  const banner = $("firstMoveBanner");
  if (p && womanMovesFirst(p) && !theirMoveDone()){
    banner.textContent = `🙋‍♀️ Ladies first — waiting for ${p.name} to make the first move…`;
    banner.classList.remove("hidden");
  } else if (p && iMoveFirst(p) && myMsgCount() === 0){
    banner.textContent = "🙋‍♀️ You make the first move! Your first 2 messages are free.";
    banner.classList.remove("hidden");
  } else banner.classList.add("hidden");
  const waitingForHer = p && womanMovesFirst(p) && !theirMoveDone();
  $("paywall").classList.toggle("hidden", gate.ok || waitingForHer);
  $("paywallText").textContent = gate.why || "Upgrade to keep chatting";
}

async function openChat(id){
  activeChat = id;
  const p = chatPartner();
  $("chatWith").textContent = `${p.name} ${avatarFor(p)}${p.verified ? " ✔" : ""}${p.demo || isDemo(id) ? " 🤖" : ""}`;
  $("safetyWarn").textContent = "";
  if (isDemo(id)){
    activeMatchId = null;
    renderDemoChat(); refreshChatGates(); show("screen-chat");
    return;
  }
  const rm = realMatches.find(m => m.profile.id === id);
  activeMatchId = rm ? rm.matchId : null;
  await loadRealChat();
  show("screen-chat");
  stopChatPolling();
  pollTimer = setInterval(loadRealChat, 3000);   // refresh every 3 seconds
}

async function loadRealChat(){
  if (!activeMatchId) return;
  try {
    const { data } = await db.from("messages")
      .select("*").eq("match_id", activeMatchId).order("created_at");
    realMsgs = data || [];
    renderRealChat(); refreshChatGates();
  } catch(e){}
}
function renderRealChat(){
  const win = $("chatWindow");
  win.innerHTML = realMsgs.map(m =>
    `<div class="bubble ${m.sender === me.id ? "me" : "them"}">${escapeHTML(m.body)}</div>`).join("");
  win.scrollTop = win.scrollHeight;
}
function renderDemoChat(){
  const win = $("chatWindow");
  const chat = local.demoChats[activeChat];
  win.innerHTML = (chat ? chat.msgs : []).map(m =>
    `<div class="bubble ${m.from}">${escapeHTML(m.text)}</div>`).join("");
  win.scrollTop = win.scrollHeight;
}
function escapeHTML(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

$("backToMatches").addEventListener("click", () => { show("screen-matches"); renderMatches(); });

function violatesSafety(text){
  const digits = text.replace(/\D/g, "");
  if (/(\d[\s\-.]?){10,}/.test(text) || digits.length >= 10) return "Phone numbers cannot be shared in chat. 🔒";
  const words = /\b(address|ghar ka pata|house no|flat no|whatsapp|insta(gram)?|telegram|call me|mera number)\b/i;
  if (words.test(text)) return "Personal contact details cannot be shared in chat. 🔒";
  return null;
}

$("sendBtn").addEventListener("click", sendMessage);
$("chatInput").addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });

async function sendMessage(){
  const input = $("chatInput"), warn = $("safetyWarn");
  const text = input.value.trim();
  warn.textContent = "";
  if (!text) return;
  const gate = canISend();
  if (!gate.ok){ warn.textContent = gate.why; refreshChatGates(); return; }
  const violation = violatesSafety(text);
  if (violation){ warn.textContent = violation; return; }

  if (isDemo(activeChat)){
    const chat = local.demoChats[activeChat];
    chat.msgs.push({ from: "me", text });
    chat.myCount++;
    input.value = "";
    saveLocal(); renderDemoChat(); refreshChatGates();
    setTimeout(() => {
      const replies = ["Achha! Tell me more 😄", "Haha, interesting!", "Same here yaar!", "Kya baat hai! ✨"];
      chat.msgs.push({ from: "them", text: replies[Math.floor(Math.random() * replies.length)] });
      chat.theirMoveDone = true;
      saveLocal(); renderDemoChat(); refreshChatGates();
    }, 900);
    return;
  }

  // Real message → Supabase
  if (!activeMatchId){ warn.textContent = "Chat not ready — go back and reopen."; return; }
  const { error } = await db.from("messages")
    .insert({ match_id: activeMatchId, sender: me.id, body: text });
  if (error){ warn.textContent = "Send failed — check internet."; return; }
  input.value = "";
  await loadRealChat();
}

// ---------- Video call (demo) ----------
$("videoBtn").addEventListener("click", () => {
  const p = chatPartner(); if (!p) return;
  $("videoAvatar").innerHTML = photoOrEmoji(p);
  $("videoName").textContent = `Calling ${p.name}…`;
  $("videoOverlay").classList.remove("hidden");
});
$("endCallBtn").addEventListener("click", () => $("videoOverlay").classList.add("hidden"));

// ---------- Report & Block ----------
$("chatMenuBtn").addEventListener("click", () => {
  const p = chatPartner(); if (!p) return;
  infoSheet(`
    <h2>${p.name} ${avatarFor(p)}</h2>
    <button class="list-btn" id="reportBtn" style="width:100%;margin:8px 0">🚩 Report ${p.name}</button>
    <button class="list-btn danger" id="blockBtn" style="width:100%;margin-bottom:8px">🚫 Block & disconnect</button>
    <button class="list-btn" id="tipsFromChat" style="width:100%">🛡 Safety tips</button>`);
  $("reportBtn").addEventListener("click", async () => {
    const reason = prompt("Why are you reporting?\n1 Fake profile\n2 Harassment / abusive\n3 Asked for money\n4 Inappropriate content\n5 Other\n\nType the number:");
    if (reason){
      if (!isDemo(p.id)){
        try { await db.from("blocks").insert({ blocker: me.id, blocked: p.id, reason: "REPORT: " + reason }); } catch(e){}
      }
      alert("Report submitted 🚩 Our safety team will review within 24 hours.");
      $("infoOverlay").classList.add("hidden");
    }
  });
  $("blockBtn").addEventListener("click", async () => {
    if (confirm(`Block ${p.name}? They will disappear from your connects.`)){
      if (isDemo(p.id)) local.demoBlocked.push(p.id);
      else { try { await db.from("blocks").insert({ blocker: me.id, blocked: p.id, reason: "block" }); } catch(e){} }
      saveLocal();
      $("infoOverlay").classList.add("hidden");
      stopChatPolling();
      show("screen-matches"); renderMatches();
    }
  });
  $("tipsFromChat").addEventListener("click", () => { $("safetyTipsBtn").click(); });
});

// ---------- Init ----------
loadLocal();
setAuthMode("signup");
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) await enterApp();
  else show("screen-signup");
})();
