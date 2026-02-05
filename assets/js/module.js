import { auth, db } from "./firebase.js";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

let lessons = [];
let currentIndex = 0;
let moduleId = new URLSearchParams(window.location.search).get("m");

const moduleTitleEl = document.getElementById("moduleTitle");
const lessonTitleEl = document.getElementById("lessonTitle");
const lessonImageEl = document.getElementById("lessonImage");
const lessonWordEl = document.getElementById("lessonWord");
const lessonAudioEl = document.getElementById("lessonAudio");
const progressBar = document.getElementById("lessonProgress");

document.getElementById("playAudio").addEventListener("click", () => {
    lessonAudioEl.play();
});

document.getElementById("nextLesson").addEventListener("click", () => {
    if (currentIndex < lessons.length - 1) {
        currentIndex++;
        renderLesson();
    }
});

document.getElementById("prevLesson").addEventListener("click", () => {
    if (currentIndex > 0) {
        currentIndex--;
        renderLesson();
    }
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "learning-hub.html";
        return;
    }

    await loadModule();
});

async function loadModule() {
    if (!moduleId) {
        alert("No module selected");
        return;
    }

    const moduleRef = doc(db, "modules", moduleId);
    const moduleSnap = await getDoc(moduleRef);
    moduleTitleEl.textContent = moduleSnap.data().title;

    const lessonsSnap = await getDocs(
        collection(db, "modules", moduleId, "lessons")
    );

    lessons = [];
    lessonsSnap.forEach((doc) => {
        lessons.push({ id: doc.id, ...doc.data() });
    });

    lessons.sort((a, b) => a.order - b.order);

    renderLesson();
}

function renderLesson() {
    const lesson = lessons[currentIndex];

    lessonTitleEl.textContent = lesson.title;
    lessonImageEl.src = `assets/images/${lesson.content.image}`;
    lessonWordEl.textContent = lesson.content.word;
    lessonAudioEl.src = `assets/audio/${lesson.content.audio}`;

    const percent = ((currentIndex + 1) / lessons.length) * 100;
    progressBar.style.width = percent + "%";

    saveProgress(percent / 100);
}

async function saveProgress(value) {
    const user = auth.currentUser;
    if (!user) return;

    const progressRef = doc(db, "users", user.uid, "progress", "default");

    await setDoc(progressRef, {
        modules: {
            [moduleId]: value
        },
        updatedAt: serverTimestamp()
    }, { merge: true });
}
