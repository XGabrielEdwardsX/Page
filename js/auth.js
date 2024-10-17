// js/auth.js

const firebase = window.firebase;

export function initializeAuth(firebaseConfig) {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();
    return { auth, db };
}

export function setupAuthUI(auth, db) {
    const googleSignInButton = document.getElementById('google-signin');
    const signOutButton = document.getElementById('signout');
    const userInfo = document.getElementById('user-info');
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name');

    // Función para iniciar sesión con Google
    googleSignInButton.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then((result) => {
                console.log('Usuario iniciado:', result.user);
            })
            .catch((error) => {
                console.error('Error al iniciar sesión:', error);
                alert('Error al iniciar sesión. Por favor, intenta de nuevo.');
            });
    });

    // Función para cerrar sesión
    signOutButton.addEventListener('click', () => {
        auth.signOut()
            .then(() => {
                console.log('Usuario cerrado sesión');
            })
            .catch((error) => {
                console.error('Error al cerrar sesión:', error);
                alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
            });
    });

    // Manejo del Estado de Autenticación
    auth.onAuthStateChanged((user) => {
        if (user) {
            // Ocultar botón de inicio y mostrar botón de cerrar sesión e información del usuario
            googleSignInButton.style.display = 'none';
            signOutButton.style.display = 'inline-block';
            userInfo.style.display = 'block';

            // Mostrar la información del usuario
            userPhoto.src = user.photoURL;
            userName.textContent = `Bienvenido, ${user.displayName}`;

            // Cargar las reacciones del usuario
            if (window.loadUserReactions) {
                window.loadUserReactions();
            }
        } else {
            // Mostrar botón de inicio y ocultar botón de cerrar sesión e información del usuario
            googleSignInButton.style.display = 'inline-block';
            signOutButton.style.display = 'none';
            userInfo.style.display = 'none';

            // Resetear las reacciones del usuario
            if (window.resetUserReactions) {
                window.resetUserReactions();
            }
        }
    });
}
