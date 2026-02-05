const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

async function seed() {

  const modules = [
    { id: "greetings", title: "Greetings", order: 1, isPremium: false },
    { id: "animals", title: "Animals (Oduma)", order: 2, isPremium: false },
    { id: "numbers", title: "Numbers", order: 3, isPremium: true }
  ];

  for (const mod of modules) {
    await db.collection("modules").doc(mod.id).set(mod);

    if (mod.id === "animals") {
      await db.collection("modules").doc("animals")
        .collection("lessons").doc("lion")
        .set({
          title: "Lion",
          order: 1,
          type: "flashcard",
          content: {
            word: "oduma",
            image: "lion.png",
            audio: "oduma.mp3"
          }
        });
    }

    if (mod.id === "greetings") {
      await db.collection("modules").doc("greetings")
        .collection("lessons").doc("hello")
        .set({
          title: "Hello",
          order: 1,
          type: "flashcard",
          content: {
            word: "kóyo",
            image: "hello.png",
            audio: "koyo.mp3"
          }
        });
    }

    if (mod.id === "numbers") {
      await db.collection("modules").doc("numbers")
        .collection("lessons").doc("one")
        .set({
          title: "One",
          order: 1,
          type: "flashcard",
          content: {
            word: "ọ́kpọ",
            image: "one.png",
            audio: "one.mp3"
          }
        });
    }
  }

  console.log("Seed complete");
  process.exit();
}

seed();
