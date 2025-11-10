// Fix: Use Firebase v9 compat imports. This allows the app to use the older v8
// namespaced syntax (like `firebase.firestore()`) with the newer v9 SDK,
// resolving the "property does not exist" errors.
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmIFOtN2fLmCAFAlusvm4pQjzqb_vSSFI",
  authDomain: "rifafacil-app-a6001.firebaseapp.com",
  projectId: "rifafacil-app-a6001",
  storageBucket: "rifafacil-app-a6001.appspot.com",
  messagingSenderId: "530067923915",
  appId: "1:530067923915:web:7cc2428e4e8a79a7b80c4e"
};


// Inicializa o Firebase
// Fix: Check if Firebase is already initialized to prevent errors during hot reloads.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Exporta as instâncias dos serviços para serem usadas em outros lugares da aplicação
export const db = firebase.firestore();
export const storage = firebase.storage();
