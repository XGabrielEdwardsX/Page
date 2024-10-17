// js/reactions.js

import { fetchWithRetry } from './utils.js';

const firebase = window.firebase;

export function setupReactions(auth, db) {
    const reaccionButtons = document.querySelectorAll('.reaccion-button');
    const reaccionesUsuariosContainer = document.getElementById('reacciones-usuarios');

    // Objeto para rastrear las reacciones del usuario
    window.userReactions = {
        caballo: false,
        libertad: false,
        filosofico: false,
        fitness: false
    };

    // Función para cargar las reacciones del usuario
    window.loadUserReactions = async function() {
        if (!auth.currentUser) return;

        try {
            const userId = auth.currentUser.uid;
            const startAt = `${userId}_`;
            const endAt = `${userId}_\uf8ff`;

            const userReactionsSnapshot = await db.collection('reaccionesUsuarios')
                .where(firebase.firestore.FieldPath.documentId(), '>=', startAt)
                .where(firebase.firestore.FieldPath.documentId(), '<=', endAt)
                .get();

            // Resetear las reacciones del usuario
            window.userReactions = {
                caballo: false,
                libertad: false,
                filosofico: false,
                fitness: false
            };

            userReactionsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.reacted) {
                    window.userReactions[data.reaction] = true;
                }
            });

            // Actualizar el estado de los botones
            reaccionButtons.forEach(button => {
                const reaction = button.getAttribute('data-reaction');
                if (window.userReactions[reaction]) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });

        } catch (error) {
            console.error('Error al cargar reacciones del usuario:', error);
        }
    };

    // Función para resetear las reacciones del usuario
    window.resetUserReactions = function() {
        window.userReactions = {
            caballo: false,
            libertad: false,
            filosofico: false,
            fitness: false
        };

        reaccionButtons.forEach(button => {
            const reaction = button.getAttribute('data-reaction');
            button.classList.remove('active');
        });
    };

    // Función para cargar y mostrar las últimas 2 reacciones de usuarios
    async function cargarReaccionesUsuarios() {
        if (!reaccionesUsuariosContainer) {
            console.error('El contenedor de reacciones de usuarios no existe.');
            return;
        }

        try {
            // Obtener los últimos 2 documentos de reaccionesUsuarios ordenados por timestamp descendente
            const snapshot = await db.collection('reaccionesUsuarios')
                .orderBy('timestamp', 'desc')
                .limit(2)
                .get();

            reaccionesUsuariosContainer.innerHTML = ''; // Limpiar contenedor

            if (snapshot.empty) {
                reaccionesUsuariosContainer.innerHTML = '<p>No hay reacciones de usuarios.</p>';
            } else {
                snapshot.forEach(doc => {
                    const reaccionUsuario = doc.data();
                    const reaccionElement = document.createElement('p');
                    reaccionElement.innerHTML = `
                        <img src="${reaccionUsuario.usuarioFoto}" alt="${reaccionUsuario.usuarioNombre}" width="30" height="30" class="rounded-circle me-2">
                        <strong>${reaccionUsuario.usuarioNombre}</strong> reaccionó con <em>${reaccionUsuario.reaction}</em>
                    `;
                    reaccionesUsuariosContainer.appendChild(reaccionElement);
                });
            }
        } catch (error) {
            console.error('Error al cargar reacciones de usuarios:', error);
            reaccionesUsuariosContainer.innerHTML = '<p>Error al cargar reacciones de usuarios.</p>';
        }
    }

    // Función para cargar las reacciones desde Firestore
    async function cargarReacciones() {
        const reactionsRef = db.collection('reacciones').doc('current_reactions');
        
        try {
            const doc = await reactionsRef.get();
            if (doc.exists) {
                const reactions = doc.data();
                
                // Actualizar los contadores en la interfaz
                document.getElementById('caballo-count').textContent = reactions.caballo || 0;
                document.getElementById('libertad-count').textContent = reactions.libertad || 0;
                document.getElementById('filosofico-count').textContent = reactions.filosofico || 0;
                document.getElementById('fitness-count').textContent = reactions.fitness || 0;
            } else {
                console.log("No se encontró el documento de reacciones.");
            }
        } catch (error) {
            console.error("Error al cargar las reacciones:", error);
        }
    }

    // Llamar a la función cuando la página cargue
    window.addEventListener('load', () => {
        cargarReacciones();
        window.loadUserReactions();
    });

    // Manejo de Reacciones con Optimistic UI
    reaccionButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const reaction = button.getAttribute('data-reaction');
            const isActive = button.classList.contains('active');
            const action = isActive ? 'remove' : 'add';

            // Obtener el usuario actual
            const user = auth.currentUser;
            if (!user) {
                alert('Debes iniciar sesión para reaccionar.');
                return;
            }

            // Prevenir múltiples reacciones del mismo tipo
            if (action === 'add' && window.userReactions[reaction]) {
                alert('Ya has reaccionado con esta reacción.');
                return;
            }

            // Optimistic UI Update: Actualizar la UI inmediatamente
            const countElement = document.getElementById(`${reaction}-count`);
            const previousCount = parseInt(countElement.innerText, 10);
            const newCount = action === 'add' ? previousCount + 1 : previousCount - 1;

            // Actualizar el contador y el estado del botón
            countElement.innerText = newCount;
            button.classList.toggle('active');
            window.userReactions[reaction] = action === 'add';

            try {
                const token = await user.getIdToken();

                // Enviar solicitud POST con fetchWithRetry
                const response = await fetchWithRetry('/.netlify/functions/manejarReaccion', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ reaction, action })
                }, 3, 500); // 3 reintentos, 500ms inicial

                const data = await response.json();

                if (response.ok) {
                    // Actualizar los conteos de reacciones desde la respuesta del servidor
                    countElement.innerText = data.reactions[reaction];
                    cargarReaccionesUsuarios();
                } else {
                    throw new Error(data.message || 'Error desconocido');
                }
            } catch (error) {
                console.error('Error al enviar reacción:', error);
                alert('Hubo un error al enviar tu reacción. Se revertirán los cambios.');

                // Revertir los cambios en la UI
                countElement.innerText = previousCount;
                button.classList.toggle('active');
                window.userReactions[reaction] = isActive;
            }
        });
    });

    // Cargar y mostrar las últimas 2 reacciones de usuarios
    cargarReaccionesUsuarios();

    // Escuchar cambios en tiempo real para reacciones de usuarios
    db.collection('reaccionesUsuarios').orderBy('timestamp', 'desc')
        .limit(2)
        .onSnapshot(snapshot => {
            cargarReaccionesUsuarios();
        });
}
