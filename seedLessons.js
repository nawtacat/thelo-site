import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// ⚠️ Use the SAME firebase config your project already uses
import firebaseConfig from "./firebaseConfig.js"; // or wherever yours is

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  for (let i = 2; i <= 9; i++) {
    await setDoc(
      doc(
        db,
        "courses",
        "grade6en",
        "units",
        "unit1arithmatic",
        "topics",
        `lesson${i}`
      ),
      {
        lessonFileUrl: `E${i}.json`,
        order: i + 1,
        topicName: `Test ${i}`
      }
    );
  }

  console.log("🔥 Lessons created");
}

seed();
