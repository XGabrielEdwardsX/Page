const reactions = {
    caballo: 0,
    libertad: 0,
    filosofico: 0,
    fitness: 0
};

exports.handler = async function(event, context) {
    const { reaction, action } = JSON.parse(event.body);

    // Sumar o restar reacciones dependiendo de la acción
    if (reactions.hasOwnProperty(reaction)) {
        if (action === 'add') {
            reactions[reaction]++;
        } else if (action === 'remove') {
            reactions[reaction]--;
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Reacción procesada', reactions })
    };
};