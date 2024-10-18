// js/main.js

import { initializeAuth, setupAuthUI } from './auth.js';
import { setupReactions } from './reactions.js';
import { setupComments } from './comments.js'; 

const firebaseConfig = {
    apiKey: "AIzaSyCI6qEjysMXJ5SLjvDk3KtVLORIZ1V8FAA",
    authDomain: "gabriel-edwards.firebaseapp.com",
    projectId: "gabriel-edwards",
    storageBucket: "gabriel-edwards.appspot.com",
    messagingSenderId: "176739261816",
    appId: "1:176739261816:web:00ba8da3488ed721f8bc8d",
    measurementId: "G-WH2TYNC56J"
};

// Inicializar Firebase y configurar la UI de autenticación
const { auth, db } = initializeAuth(firebaseConfig);
setupAuthUI(auth, db);

// Configurar manejo de reacciones y comentarios
setupReactions(auth, db);
setupComments(auth, db);
