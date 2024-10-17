// netlify/functions/reactions.js
const fs = require('fs');
const path = require('path');

// Path al archivo JSON donde guardaremos las reacciones
const reactionsFilePath = path.join(__dirname, 'reactions.json');

// Lee las reacciones desde el archivo JSON
function getReactions() {
    if (fs.existsSync(reactionsFilePath)) {
        const rawData = fs.readFileSync(reactionsFilePath);
        return JSON.parse(rawData);
    }
    return {
        caballo: 0,
        libertad: 0,
        filosofico: 0,
        fitness: 0
    };
}

// Guarda las reacciones en el archivo JSON
function saveReactions(reactions) {
    fs.writeFileSync(reactionsFilePath, JSON.stringify(reactions, null, 2));
}

exports.handler = async function (event, context) {
    const reactions = getReactions();
    const { reaction, action } = JSON.parse(event.body);

    if (reactions.hasOwnProperty(reaction)) {
        if (action === 'add') {
            reactions[reaction]++;
        } else if (action === 'remove') {
            reactions[reaction]--;
        }
        saveReactions(reactions);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Reacción procesada', reactions })
    };
};
