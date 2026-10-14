// Servidor de Neon Syndicate Multijugador - Guarda como: server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static(__dirname + '/public'));

let players = {};
// Tiempos de recarga: 10 minutos (600,000 milisegundos)
let robberies = {
    bov_quimica: { locked: false, cooldownEnd: 0, cooldownTime: 600000, value: 1500 },
    fab_uranio: { locked: false, cooldownEnd: 0, cooldownTime: 600000, value: 4500 }
};

io.on('connection', (socket) => {
    console.log(`Operativo conectado: ${socket.id}`);
    
    players[socket.id] = {
        id: socket.id,
        x: 300, y: 350,
        angle: 0,
        hp: 100,
        cash: 0, bag: 0,
        role: 'FUGITIVE', // Cambiado de Prisoner a Fugitive (Fugitivo)
        vehicle: null
    };

    socket.emit('init', { id: socket.id, players, robberies });
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('playerUpdate', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].angle = data.angle;
            players[socket.id].vehicle = data.vehicle;
            players[socket.id].bag = data.bag;
            players[socket.id].role = data.role;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    socket.on('fireProjectile', (projData) => {
        socket.broadcast.emit('enemyProjectile', { id: socket.id, ...projData });
    });

    socket.on('tryRobbery', (zoneId) => {
        let now = Date.now();
        if (robberies[zoneId] && !robberies[zoneId].locked) {
            robberies[zoneId].locked = true;
            robberies[zoneId].cooldownEnd = now + robberies[zoneId].cooldownTime;
            
            io.emit('robberyStarted', { zoneId, cooldownEnd: robberies[zoneId].cooldownEnd });
            socket.emit('robberySuccess', robberies[zoneId].value);
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

setInterval(() => {
    let now = Date.now();
    for (let key in robberies) {
        if (robberies[key].locked && now >= robberies[key].cooldownEnd) {
            robberies[key].locked = false;
            io.emit('robberyReset', key);
        }
    }
}, 5000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Servidor Neon Syndicate en puerto ${PORT}`));