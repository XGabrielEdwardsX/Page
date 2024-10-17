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
    try {
        // Parsear la información de la solicitud
        const { reaction, action } = JSON.parse(event.body);
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

        // Actualizar el conteo de la reacción según la acción
        if (reactions.hasOwnProperty(reaction)) {
            if (action === 'add') {
                reactions[reaction]++;
            } else if (action === 'remove') {
                reactions[reaction]--;
            }
            // Guardar los cambios en Firestore
            await reactionsRef.set(reactions);
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
            body: JSON.stringify({ message: 'Error al procesar la reacción', error })
        };
    }
};
