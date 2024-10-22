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

    // Variable para almacenar el estado previo de las reacciones de usuarios
    let previousReaccionesUsuariosHTML = '';

    // Función para cargar las reacciones del usuario
    window.loadUserReactions = async function () {
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
    window.resetUserReactions = function () {
        window.userReactions = {
            caballo: false,
            libertad: false,
            filosofico: false,
            fitness: false
        };

        reaccionButtons.forEach(button => {
            button.classList.remove('active');
        });
    };

    // Función para cargar y mostrar las últimas reacciones de usuarios
    async function cargarReaccionesUsuarios() {
        if (!reaccionesUsuariosContainer) {
            console.error('El contenedor de reacciones de usuarios no existe.');
            return;
        }

        try {
            const user = auth.currentUser;

            // Obtener los últimos 5 documentos de reaccionesUsuarios ordenados por timestamp descendente
            const snapshot = await db.collection('reaccionesUsuarios')
                .orderBy('timestamp', 'desc')
                .limit(5)
                .get();

            // Crear un DocumentFragment para agregar los nuevos elementos
            const fragment = document.createDocumentFragment();

            if (snapshot.empty) {
                const mensaje = document.createElement('p');
                mensaje.textContent = 'No hay reacciones de usuarios.';
                fragment.appendChild(mensaje);
            } else {
                let reactionsAdded = 0;
                snapshot.forEach(doc => {
                    const reaccionUsuario = doc.data();

                    // Excluir la reacción del usuario actual
                    if (reaccionUsuario.usuarioId === user.uid) {
                        return; // Saltar esta reacción
                    }

                    // Agregar la reacción al fragmento
                    if (reactionsAdded < 2) {
                        const reaccionElement = crearElementoReaccionUsuario(reaccionUsuario);
                        fragment.appendChild(reaccionElement);
                        reactionsAdded++;
                    }
                });

                // Si no se llenan las 2 reacciones, mostrar menos
                if (reactionsAdded === 0) {
                    const mensaje = document.createElement('p');
                    mensaje.textContent = 'No hay más reacciones de usuarios.';
                    fragment.appendChild(mensaje);
                }
            }

            // Reemplazar el contenido del contenedor
            reaccionesUsuariosContainer.innerHTML = '';
            reaccionesUsuariosContainer.appendChild(fragment);

        } catch (error) {
            console.error('Error al cargar reacciones de usuarios:', error);
            reaccionesUsuariosContainer.innerHTML = '<p>Error al cargar reacciones de usuarios.</p>';
        }
    }

    // Función para crear un elemento de reacción de usuario
    function crearElementoReaccionUsuario(reaccionUsuario) {
        const reaccionElement = document.createElement('p');
        reaccionElement.innerHTML = `
            <img src="${reaccionUsuario.usuarioFoto}" alt="${reaccionUsuario.usuarioNombre}" width="30" height="30" class="rounded-circle me-2">
            <strong>${reaccionUsuario.usuarioNombre}</strong> reaccionó con <em>${reaccionUsuario.reaction}</em>
        `;
        // La animación de entrada se aplica automáticamente mediante CSS
        return reaccionElement;
    }

    // Función para cargar las reacciones iniciales desde Firestore
    async function cargarReaccionesIniciales() {
        try {
            // Referencia al documento que contiene las reacciones
            const reactionsDoc = await db.collection('reacciones').doc('current_reactions').get();

            if (reactionsDoc.exists) {
                const reactions = reactionsDoc.data();

                // Actualizar la UI con los valores de las reacciones desde Firestore
                document.getElementById('caballo-count').innerText = reactions.caballo || 0;
                document.getElementById('libertad-count').innerText = reactions.libertad || 0;
                document.getElementById('filosofico-count').innerText = reactions.filosofico || 0;
                document.getElementById('fitness-count').innerText = reactions.fitness || 0;
            } else {
                console.error("No se encontraron reacciones en Firestore.");
            }
        } catch (error) {
            console.error("Error al cargar las reacciones iniciales:", error);
        }
    }

    // Manejo de Reacciones con Actualización Optimista y Ajustes
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

            // Guardar el estado previo de las reacciones de usuarios
            previousReaccionesUsuariosHTML = reaccionesUsuariosContainer.innerHTML;

            if (action === 'add') {
                // ... código existente para agregar la reacción optimistamente ...
            } else {
                // Optimistic UI Update: Eliminar la reacción del usuario inmediatamente

                // Encontrar y eliminar el elemento de reacción del usuario
                const userReactionElements = Array.from(reaccionesUsuariosContainer.children);
                userReactionElements.forEach(element => {
                    const userName = element.querySelector('strong')?.textContent;
                    if (userName === user.displayName) {
                        element.classList.add('fade-out');
                        setTimeout(() => {
                            reaccionesUsuariosContainer.removeChild(element);
                        }, 500); // Duración de la animación de salida
                    }
                });

                // Después de eliminar, cargar más reacciones para llenar los espacios vacíos
                setTimeout(() => {
                    cargarReaccionesUsuarios();
                }, 500); // Esperamos a que termine la animación de salida
            }

            try {
                const token = await user.getIdToken();

                // Enviar solicitud POST con fetch con reintentos
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
                    // La interfaz se sincronizará automáticamente gracias al listener en tiempo real
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

                // Revertir el estado previo de las reacciones de usuarios
                reaccionesUsuariosContainer.innerHTML = previousReaccionesUsuariosHTML;
            }
        });
    });

    // Cargar las reacciones iniciales al iniciar la página
    cargarReaccionesIniciales();

    // Cargar y mostrar las últimas 2 reacciones de usuarios
    cargarReaccionesUsuarios();

    // Escuchar cambios en tiempo real para reacciones de usuarios
    db.collection('reaccionesUsuarios').orderBy('timestamp', 'desc')
        .limit(2)
        .onSnapshot(snapshot => {
            cargarReaccionesUsuarios();
        });
}
