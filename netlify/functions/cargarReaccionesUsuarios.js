// Función para cargar y mostrar quién ha reaccionado
async function cargarReaccionesUsuarios() {
    const reaccionesUsuariosContainer = document.getElementById('reacciones-usuarios'); // Asegúrate de que este elemento existe
    if (!reaccionesUsuariosContainer) {
        console.error('El contenedor de reacciones de usuarios no existe.');
        return;
    }

    try {
        const snapshot = await db.collection('reaccionesUsuarios').get();
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
