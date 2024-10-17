// js/comments.js

import { fetchWithRetry } from './utils.js';

const firebase = window.firebase;

export function setupComments(auth, db) {
    const comentarioTexto = document.getElementById('comentario-texto');
    const enviarComentarioBtn = document.getElementById('enviar-comentario');
    const comentariosContainer = document.getElementById('comentarios-container'); // Asegúrate de tener este contenedor

    enviarComentarioBtn.addEventListener('click', async () => {
        const texto = comentarioTexto.value.trim();

        if (!texto) {
            alert('Por favor, escribe un comentario.');
            return;
        }

        // Obtener el usuario actual
        const user = auth.currentUser;
        if (!user) {
            alert('Debes iniciar sesión para comentar.');
            return;
        }

        // Crear un ID temporal para el comentario optimista
        const tempId = `temp-${Date.now()}`;

        // Crear el comentario optimista en la UI
        const comentarioElement = document.createElement('div');
        comentarioElement.classList.add('col-md-6', 'mb-4', 'comentario-temporal');
        comentarioElement.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        <img src="${user.photoURL}" alt="${user.displayName}" class="rounded-circle me-2" width="40" height="40">
                        <h5 class="card-title mb-0">${user.displayName} (Enviando...)</h5>
                    </div>
                    <p class="card-text">${sanitizeHTML(texto)}</p>
                    <small class="text-muted">Enviando...</small>
                </div>
            </div>
        `;
        comentariosContainer.prepend(comentarioElement); // Añadir al inicio

        try {
            const token = await user.getIdToken();

            // Enviar solicitud POST con fetchWithRetry
            const response = await fetchWithRetry('/.netlify/functions/crearComentario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ texto })
            }, 3, 500); // 3 reintentos, 500ms inicial

            const data = await response.json();

            if (response.ok) {
                // Remover el comentario temporal
                comentariosContainer.removeChild(comentarioElement);
                // Recargar los comentarios para mostrar el nuevo comentario
                cargarComentarios();
                comentarioTexto.value = '';
            } else {
                throw new Error(data.message || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error al enviar comentario:', error);
            alert('Hubo un error al enviar tu comentario. Inténtalo de nuevo.');
            // Remover el comentario temporal
            comentariosContainer.removeChild(comentarioElement);
        }
    });

    // Función para cargar y mostrar los comentarios
    async function cargarComentarios() {
        try {
            const snapshot = await db.collection('comentarios').orderBy('timestamp', 'desc').get();
            comentariosContainer.innerHTML = ''; // Limpiar contenedor

            if (snapshot.empty) {
                comentariosContainer.innerHTML = '<p>No hay comentarios.</p>';
            } else {
                snapshot.forEach(doc => {
                    const comentario = doc.data();
                    const comentarioElement = document.createElement('div');
                    comentarioElement.classList.add('col-md-6', 'mb-4');
                    comentarioElement.innerHTML = `
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex align-items-center mb-3">
                                    ${comentario.usuarioFoto ? `<img src="${comentario.usuarioFoto}" alt="${comentario.usuarioNombre}" class="rounded-circle me-2" width="40" height="40">` : ''}
                                    <h5 class="card-title mb-0">${comentario.usuarioNombre}</h5>
                                </div>
                                <p class="card-text">${sanitizeHTML(comentario.texto)}</p>
                                <small class="text-muted">${comentario.timestamp?.toDate().toLocaleString() || ''}</small>
                            </div>
                        </div>
                    `;
                    comentariosContainer.appendChild(comentarioElement);
                });
            }
        } catch (error) {
            console.error('Error al cargar comentarios:', error);
            comentariosContainer.innerHTML = '<p>Error al cargar comentarios.</p>';
        }
    }

    // Sanitización para prevenir XSS
    function sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Actualizar comentarios en tiempo real
    db.collection('comentarios').orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            cargarComentarios();
        });
}
