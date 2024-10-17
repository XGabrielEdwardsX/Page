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
        const usuarioNombre = decodedToken.name;
        const usuarioFoto = decodedToken.picture;

        const { texto } = JSON.parse(event.body);

        if (!texto) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Comentario vacío' }),
            };
        }

        // Crear un nuevo comentario
        const nuevoComentario = {
            texto,
            usuarioId,
            usuarioNombre,
            usuarioFoto: usuarioFoto || '',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection('comentarios').add(nuevoComentario);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Comentario creado exitosamente' }),
        };
    } catch (error) {
        console.error('Error al crear comentario:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error al crear comentario', error }),
        };
    }
};
