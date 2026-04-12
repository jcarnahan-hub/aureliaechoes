// ── AURELIA ECHOES: Firebase Configuration ──

firebase.initializeApp({
  apiKey: "AIzaSyC3JQRjMKaG5AIHO_oOVa2MfyytrjLjITo",
  authDomain: "aureliaechoes-audiobooks.firebaseapp.com",
  projectId: "aureliaechoes-audiobooks",
  storageBucket: "aureliaechoes-audiobooks.firebasestorage.app",
  messagingSenderId: "819551747823",
  appId: "1:819551747823:web:8f2200434ba0b97e08e51a"
});

const db = firebase.firestore();
const auth = firebase.auth();

console.log("✅ Firebase connected to Aurelia Echoes");
