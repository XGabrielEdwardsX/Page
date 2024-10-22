const firebase = window.firebase;

export function setupComments(auth, db) {
    const comentarioTexto = document.getElementById('comentario-texto');
    const enviarComentarioBtn = document.getElementById('enviar-comentario');
    const comentariosContainer = document.getElementById('comentarios-container');
    const nextPageBtn = document.getElementById('next-page');
    const prevPageBtn = document.getElementById('prev-page');
    const pageNumberElement = document.getElementById('page-number'); // Elemento HTML para mostrar la página actual

    let lastVisible = null;
    let firstVisible = null;
    let currentPage = 1; // Inicializamos la variable de página actual
    const pageSize = 2; // Número de comentarios por página
    const commentsQuery = db.collection('comentarios').orderBy('timestamp', 'asc').limit(pageSize); // Ordenamos ascendente

    enviarComentarioBtn.addEventListener('click', async () => {
        const texto = comentarioTexto.value.trim();

        if (!texto) {
            alert('Por favor, escribe un comentario.');
            return;
        }

        // Deshabilitar el botón para prevenir múltiples envíos
        enviarComentarioBtn.disabled = true;
        enviarComentarioBtn.textContent = 'Enviando...';

        // Obtener el usuario actual
        const user = auth.currentUser;
        if (!user) {
            alert('Debes iniciar sesión para comentar.');
            enviarComentarioBtn.disabled = false;
            enviarComentarioBtn.textContent = 'Comentar';
            return;
        }

        try {
            const token = await user.getIdToken();

            const response = await fetch('/.netlify/functions/crearComentario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ texto })
            });

            const data = await response.json();

            if (response.ok) {
                comentarioTexto.value = '';

                // Agregar el nuevo comentario directamente al DOM
                agregarComentarioAlDOM({
                    usuarioNombre: user.displayName,
                    usuarioFoto: user.photoURL,
                    texto: texto,
                    timestamp: new Date() // Usamos la fecha actual
                });

                // Opcional: Desplazar suavemente hasta el nuevo comentario
                comentariosContainer.lastElementChild.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error al enviar comentario:', error);
            alert('Hubo un error al enviar tu comentario. Inténtalo de nuevo.');
        } finally {
            // Rehabilitar el botón después de que la solicitud haya finalizado
            enviarComentarioBtn.disabled = false;
            enviarComentarioBtn.textContent = 'Comentar';
        }
    });

    async function cargarComentarios(query = commentsQuery, isInitialLoad = false) {
        try {
            // Iniciar la transición de desvanecimiento
            comentariosContainer.style.opacity = '0';

            const snapshot = await query.get();

            // Después de obtener los datos, esperar a que termine la transición
            setTimeout(async () => {
                comentariosContainer.innerHTML = ''; // Limpiar el contenedor

                if (!snapshot.empty) {
                    snapshot.forEach(doc => {
                        const comentario = doc.data();
                        agregarComentarioAlDOM(comentario);
                    });

                    // Actualizar firstVisible y lastVisible
                    firstVisible = snapshot.docs[0];
                    lastVisible = snapshot.docs[snapshot.docs.length - 1];

                    // Determinar si hay más comentarios después del último visible
                    const nextQuery = db.collection('comentarios')
                        .orderBy('timestamp', 'asc')
                        .startAfter(lastVisible)
                        .limit(1);

                    const nextSnapshot = await nextQuery.get();
                    nextPageBtn.style.display = nextSnapshot.empty ? 'none' : 'block';

                    // Mostrar/Ocultar el botón "Anterior"
                    prevPageBtn.style.display = (currentPage === 1) ? 'none' : 'block';

                    // Mostrar el número de página actual
                    pageNumberElement.textContent = `Página ${currentPage}`;
                } else {
                    // Si no hay comentarios, limpiar referencias y ocultar botones
                    firstVisible = null;
                    lastVisible = null;
                    nextPageBtn.style.display = 'none';
                    prevPageBtn.style.display = 'none';
                    pageNumberElement.textContent = 'Página 1';
                }

                // Restaurar la opacidad para mostrar los nuevos comentarios con animación
                comentariosContainer.style.opacity = '1';

                // Opcional: Desplazarse suavemente al inicio del contenedor de comentarios
                comentariosContainer.scrollIntoView({ behavior: 'smooth' });

            }, 300); // El retraso debe coincidir con la duración de la transición
        } catch (error) {
            console.error('Error al cargar comentarios:', error);
            comentariosContainer.innerHTML = '<p>Error al cargar comentarios.</p>';
        }
    }

    // Función para agregar un comentario al DOM
    function agregarComentarioAlDOM(comentario) {
        const comentarioElement = document.createElement('div');
        comentarioElement.classList.add('col-md-6', 'mb-4', 'comment');

        // Obtener la fecha correcta desde comentario.timestamp
        let timestampDate;
        if (comentario.timestamp) {
            if (comentario.timestamp.toDate) {
                // Si es un objeto Timestamp de Firestore
                timestampDate = comentario.timestamp.toDate();
            } else if (comentario.timestamp instanceof Date) {
                // Si ya es un objeto Date
                timestampDate = comentario.timestamp;
            } else {
                // Si es otro tipo (por ejemplo, una cadena)
                timestampDate = new Date(comentario.timestamp);
            }
        } else {
            timestampDate = null;
        }

        const timestampString = timestampDate ? timestampDate.toLocaleString() : '';

        comentarioElement.innerHTML =
            `<div class="card">
                <div class="card-body">
                    <div class="d-flex align-items-center mb-3">
                        ${comentario.usuarioFoto ? `<img src="${comentario.usuarioFoto}" alt="${comentario.usuarioNombre}" class="rounded-circle me-2" width="40" height="40">` : ''}
                        <h5 class="card-title mb-0">${comentario.usuarioNombre}</h5>
                    </div>
                    <p class="card-text">${sanitizeHTML(comentario.texto)}</p>
                    <small class="text-muted">${timestampString}</small>
                </div>
            </div>`;
        comentariosContainer.appendChild(comentarioElement);
    }

    // Resto del código permanece igual...
    // Cargar la siguiente página de comentarios
    nextPageBtn.addEventListener('click', () => {
        if (lastVisible) {
            const nextQuery = db.collection('comentarios')
                .orderBy('timestamp', 'asc') // Aseguramos el orden ascendente
                .startAfter(lastVisible)
                .limit(pageSize);

            nextQuery.get().then((snapshot) => {
                if (!snapshot.empty) {
                    currentPage++; // Incrementar el número de la página
                    cargarComentarios(nextQuery, false);
                } else {
                    // No hay más comentarios, ocultamos el botón "Siguiente"
                    nextPageBtn.style.display = 'none';
                }
            });
        }
    });

    // Cargar la página anterior de comentarios
    prevPageBtn.addEventListener('click', () => {
        if (firstVisible) {
            const prevQuery = db.collection('comentarios')
                .orderBy('timestamp', 'asc') // Aseguramos el orden ascendente
                .endBefore(firstVisible)
                .limitToLast(pageSize);

            prevQuery.get().then((snapshot) => {
                if (!snapshot.empty) {
                    currentPage--; // Decrementar el número de la página
                    cargarComentarios(prevQuery, false);
                } else {
                    // No hay páginas anteriores, ocultamos el botón "Anterior"
                    prevPageBtn.style.display = 'none';
                }
            });
        }
    });

    // Sanitización para prevenir XSS
    function sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Cargar los comentarios iniciales
    cargarComentarios(commentsQuery, true); // Pasamos "true" para indicar que es la primera carga
}

// Número máximo de caracteres permitido
const maxChars = 200;

// Elementos HTML
const comentarioTexto = document.getElementById('comentario-texto');
const charCount = document.getElementById('char-count');

// Actualizar el contador de caracteres en tiempo real
comentarioTexto.addEventListener('input', function () {
    const remainingChars = maxChars - comentarioTexto.value.length;
    charCount.textContent = `Te quedan ${remainingChars} caracteres.`;

    // Cambiar el color del contador cuando se acerque al límite
    if (remainingChars < 20) {
        charCount.style.color = 'red';
    } else {
        charCount.style.color = 'inherit';
    }
});
