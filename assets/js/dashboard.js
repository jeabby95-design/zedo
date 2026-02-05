import { watchAuth, logout } from "./auth.js";
import { db, functions } from "./firebase.js";
import {
  doc, getDoc, collection, getDocs, addDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-functions.js";

let currentUser = null;
let currentChildId = null;

const ui = {
  userEmail: document.getElementById("userEmail"),
  premiumBadge: document.getElementById("premiumBadge"),
  subscribeBtn: document.getElementById("subscribeBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  childSelect: document.getElementById("childSelect"),
  addChildBtn: document.getElementById("addChildBtn"),
  modulesGrid: document.getElementById("modulesGrid"),
  overallProgressBar: document.getElementById("overallProgressBar"),
  overallProgressText: document.getElementById("overallProgressText"),
  continueCard: document.getElementById("continueCard"),
};

watchAuth(
  async (user) => {
    currentUser = user;
    ui.userEmail.textContent = user.email;

    await loadUserStatus();
    await loadChildren();
    await loadModules(); // modules list
    await loadProgress(); // depends on child
  },
  () => {
    window.location.href = "learning-hub.html";
  }
);

ui.logoutBtn.addEventListener("click", async () => {
  await logout();
  window.location.href = "learning-hub.html";
});

ui.addChildBtn.addEventListener("click", async () => {
  const name = prompt("Child name?");
  if (!name) return;
  const age = Number(prompt("Age?") || 0);

  await addDoc(collection(db, "users", currentUser.uid, "children"), {
    name, age, createdAt: serverTimestamp(),
  });

  await loadChildren();
  await loadProgress();
});

ui.childSelect.addEventListener("change", async () => {
  currentChildId = ui.childSelect.value;
  await loadProgress();
});

ui.subscribeBtn.addEventListener("click", async () => {
  const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
  const { data } = await createCheckoutSession({ origin: window.location.origin });
  window.location.href = data.url;
});

async function loadUserStatus() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const profile = snap.data() || {};
  const isPremium = !!profile.isPremium;

  ui.premiumBadge.textContent = isPremium ? "Premium" : "Free";
  ui.premiumBadge.className = "pill " + (isPremium ? "bg-success text-white" : "bg-secondary text-white");
  ui.subscribeBtn.style.display = isPremium ? "none" : "inline-block";
}

async function loadChildren() {
  const kidsSnap = await getDocs(collection(db, "users", currentUser.uid, "children"));

  ui.childSelect.innerHTML = "";
  if (kidsSnap.empty) {
    // create a default child profile
    const ref = await addDoc(collection(db, "users", currentUser.uid, "children"), {
      name: "My Child",
      age: 0,
      createdAt: serverTimestamp(),
    });
    currentChildId = ref.id;
    await loadChildren();
    return;
  }

  kidsSnap.forEach((d) => {
    const kid = d.data();
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = `${kid.name}${kid.age ? ` (${kid.age})` : ""}`;
    ui.childSelect.appendChild(opt);
  });

  if (!currentChildId) currentChildId = ui.childSelect.options[0].value;
  ui.childSelect.value = currentChildId;
}

async function loadModules() {
  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const isPremium = !!(userSnap.data() || {}).isPremium;

  const modulesSnap = await getDocs(collection(db, "modules"));
  const modules = [];
  modulesSnap.forEach((d) => modules.push({ id: d.id, ...d.data() }));
  modules.sort((a, b) => (a.order || 0) - (b.order || 0));

  ui.modulesGrid.innerHTML = "";

  for (const m of modules) {
    const locked = m.isPremium && !isPremium;

    const col = document.createElement("div");
    col.className = "col-md-6 col-xl-4";

    col.innerHTML = `
      <div class="card p-3 shadow-sm h-100">
        <div class="d-flex justify-content-between align-items-start">
          <div class="fw-bold">${m.title}</div>
          ${m.isPremium ? `<span class="badge ${locked ? "bg-warning text-dark" : "bg-success"}">Premium</span>` : `<span class="badge bg-primary">Free</span>`}
        </div>
        <div class="text-muted small mt-2">${locked ? "Subscribe to unlock this module." : "Start learning now."}</div>
        <button class="btn ${locked ? "btn-outline-secondary" : "btn-outline-primary"} mt-3" ${locked ? "disabled" : ""} data-module="${m.id}">
          ${locked ? "Locked" : "Open"}
        </button>
      </div>
    `;

    col.querySelector("button")?.addEventListener("click", () => openModule(m.id));
    ui.modulesGrid.appendChild(col);
  }
}

async function openModule(moduleId) {
  alert(`Open module: ${moduleId}\nNext: load lessons and render a lesson player.`);
  // You can route to module.html?m=... or render in-place.
  // For now, just store "continue learning"
  await setDoc(doc(db, "users", currentUser.uid, "progress", currentChildId), {
    lastActiveModule: moduleId,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await loadProgress();
}

async function loadProgress() {
  if (!currentChildId) return;

  const ref = doc(db, "users", currentUser.uid, "progress", currentChildId);
  const snap = await getDoc(ref);
  const prog = snap.exists() ? snap.data() : { modules: {}, lastActiveModule: null };

  const modules = prog.modules || {};
  const vals = Object.values(modules);
  const overall = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

  const pct = Math.round(overall * 100);
  ui.overallProgressBar.style.width = pct + "%";
  ui.overallProgressText.textContent = `${pct}% complete`;

  ui.continueCard.innerHTML = prog.lastActiveModule
    ? `<span class="badge bg-dark">Continue</span> <span>Module: <strong>${prog.lastActiveModule}</strong></span>`
    : `<span class="text-muted">Pick a module to start.</span>`;
}
