const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

let users = []; 
let onlineUsers = {}; 
let messages = []; // Храним историю для редактирования

app.use(express.static(path.join(__dirname)));

io.on('connection', (socket) => {
    let currentUserName = "";

    socket.on('register online', (username) => {
        currentUserName = username;
        onlineUsers[username] = socket.id;
        const user = (username === "@-ADMIN-@") ? { username: "@-ADMIN-@", xp: -1 } : users.find(u => u.username === username);
        if (user) socket.emit('profile data', user);
        io.emit('update online', Object.keys(onlineUsers));
    });

    socket.on('chat message', (data) => {
        const isAdmin = data.user === "@-ADMIN-@";
        const user = isAdmin ? { xp: -1 } : users.find(u => u.username === data.user);
        
        if (user && user.mutedUntil > Date.now()) return;

        const msgId = Date.now() + Math.random(); // Уникальный ID сообщения
        const newMsg = { ...data, id: msgId, color: data.color, avatar: data.avatar, xp: user ? user.xp : 0 };
        messages.push(newMsg);
        if (messages.length > 100) messages.shift(); // Храним только последние 100

        io.emit('chat message', newMsg);
    });

    // УДАЛЕНИЕ
    socket.on('delete message', (id) => {
        messages = messages.filter(m => m.id !== id);
        io.emit('message deleted', id);
    });

    // РЕДАКТИРОВАНИЕ
    socket.on('edit message', (data) => {
        const msg = messages.find(m => m.id === data.id);
        if (msg) {
            msg.text = data.newText + " (изм.)";
            io.emit('message edited', { id: data.id, newText: msg.text });
        }
    });

    // (Остальные функции админа: xp, mute — остаются прежними)
    socket.on('admin add xp', (data) => { /* ... код из прошлого шага ... */ });
    socket.on('admin mute', (data) => { /* ... код из прошлого шага ... */ });
    socket.on('disconnect', () => { if (currentUserName) delete onlineUsers[currentUserName]; io.emit('update online', Object.keys(onlineUsers)); });
});

server.listen(PORT, () => console.log('Bizbarmak Chat Active'));
