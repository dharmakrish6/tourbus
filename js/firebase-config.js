/*
  Firebase configuration.
  Replace the placeholder values with your Firebase project settings.
  Firestore collection names used by this app:
    - buses
    - analytics
*/

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBYbKk49M5nCC9NueVgeU2GES9odDJVMuc",
  authDomain: "tourzin-b6323.firebaseapp.com",
  projectId: "tourzin-b6323",
  storageBucket: "tourzin-b6323.firebasestorage.app",
  messagingSenderId: "694981061174",
  appId: "1:694981061174:web:53028d366b8e278202c697",
  measurementId: "G-DTY8PDQTEP"
};

function initFirebaseApp() {
  if (!window.firebase) {
    console.warn('Firebase SDK is not loaded. Firestore features will remain disabled.');
    return;
  }

  if (!FIREBASE_CONFIG.projectId || FIREBASE_CONFIG.projectId === 'YOUR_PROJECT_ID') {
    console.warn('Firebase config is not configured. Please update js/firebase-config.js with your Firebase project values.');
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    window.firebaseApp = firebase.app();

    // Firestore is optional: lightweight pages (e.g. the public marketing
    // pages) load only firebase-auth to reflect sign-in state in the nav,
    // without pulling in the heavier Firestore SDK.
    if (firebase.firestore) {
      window.firestore = firebase.firestore();
      window.fbFieldValue = firebase.firestore.FieldValue;
      window.fbTimestamp = firebase.firestore.Timestamp;
    }

    if (firebase.auth) {
      window.firebaseAuth = firebase.auth();
      window.firebaseAuth.onAuthStateChanged((user) => {
        window.firebaseUser = user;
      });
    }

    window.isFirebaseConfigured = function() {
      return !!window.firestore && !!window.firebase && !!window.fbFieldValue && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID';
    };

    console.log('Firebase initialized:', window.firebaseApp.name);
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

initFirebaseApp();
