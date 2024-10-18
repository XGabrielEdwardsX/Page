// manejarReaccion.js

const admin = require('firebase-admin');

// Inicializar Firebase Admin usando variables de entorno
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        })
    });
}

const db = admin.firestore();

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Método no permitido' }),
        };
    }

    try {
        // Obtener el token de autorización del encabezado
        const token = event.headers.authorization?.split('Bearer ')[1];
        if (!token) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'No autorizado' }),
            };
        }

        // Verificar el token
        const decodedToken = await admin.auth().verifyIdToken(token);
        const usuarioId = decodedToken.uid;
        const usuarioNombre = decodedToken.name || decodedToken.email; // Asegurar que haya un nombre
        const usuarioFoto = decodedToken.picture || '';

        const { reaction, action } = JSON.parse(event.body);

        if (!reaction || !action) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Datos incompletos' }),
            };
        }

        const reactionsRef = db.collection('reacciones').doc('current_reactions');

        // Obtener las reacciones actuales del documento
        const doc = await reactionsRef.get();
        let reactions = {
            caballo: 0,
            libertad: 0,
            filosofico: 0,
            fitness: 0
        };

        // Si el documento ya existe, actualizamos el objeto de reacciones
        if (doc.exists) {
            reactions = doc.data();
        }

        // Crear un ID único para la reacción del usuario
        const reaccionUsuarioId = `${usuarioId}_${reaction}`;
        const reaccionUsuarioRef = db.collection('reaccionesUsuarios').doc(reaccionUsuarioId);
        const reaccionUsuarioDoc = await reaccionUsuarioRef.get();

        if (action === 'add') {
            if (reaccionUsuarioDoc.exists && reaccionUsuarioDoc.data().reacted) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Ya has reaccionado con esta reacción.' }),
                };
            }

            // Incrementar el contador de la reacción
            if (reactions.hasOwnProperty(reaction)) {
                reactions[reaction]++;
                await reactionsRef.set(reactions);
            }

            // Registrar la reacción del usuario
            await reaccionUsuarioRef.set({
                usuarioNombre,
                usuarioFoto,
                reaction,
                reacted: true,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

        } else if (action === 'remove') {
            if (!reaccionUsuarioDoc.exists || !reaccionUsuarioDoc.data().reacted) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: 'No has reaccionado con esta reacción.' }),
                };
            }

            // Decrementar el contador de la reacción
            if (reactions.hasOwnProperty(reaction)) {
                reactions[reaction] = Math.max(reactions[reaction] - 1, 0);
                await reactionsRef.set(reactions);
            }

            // Eliminar la reacción del usuario
            await reaccionUsuarioRef.delete();
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Acción no válida.' }),
            };
        }

        // Responder con éxito y el estado actualizado de las reacciones
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Reacción procesada', reactions })
        };

    } catch (error) {
        console.error('Error al procesar la reacción:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error al procesar la reacción', error }),
        };
    }
};
