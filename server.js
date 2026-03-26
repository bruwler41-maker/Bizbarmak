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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (username.includes("ADMIN")) return res.send("Ник защищен.");
    if (users.find(u => u.username === username)) return res.send("Ник занят.");
    users.push({ username, password, color: "#667eea", avatar: "https://cdn-icons-png.flaticon.com/512/147/147144.png", xp: 0, mutedUntil: 0 });
    res.send(`<h2>Аккаунт создан!</h2><a href="/">Войти</a>`);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "@-ADMIN-@" && password === "adminpanelactivate") return res.redirect(`/chat.html?user=${encodeURIComponent(username)}`);
    const user = users.find(u => u.username === username && u.password === password);
    if (user) res.redirect(`/chat.html?user=${encodeURIComponent(username)}`);
    else res.send("Ошибка входа.");
});

io.on('connection', (socket) => {
    let currentUserName = "";

    socket.on('register online', (username) => {
        currentUserName = username;
        onlineUsers[username] = socket.id;
        let user = (username === "@-ADMIN-@") ? { username: "@-ADMIN-@", xp: -1 } : users.find(u => u.username === username);
        if (user) socket.emit('profile data', user);
        io.emit('update online', Object.keys(onlineUsers));
    });

    socket.on('chat message', (data) => {
        const isAdmin = data.user === "@-ADMIN-@";
        const user = isAdmin ? { xp: -1, mutedUntil: 0 } : users.find(u => u.username === data.user);
        if (user && user.mutedUntil > Date.now()) return;
        
        const xpVal = user ? user.xp : 0;
        io.emit('chat message', { ...data, xp: xpVal });
    });

    socket.on('admin add xp', (d) => {
        if (currentUserName === "@-ADMIN-@") {
            const t = users.find(u => u.username === d.targetName);
            if(t) { t.xp += parseInt(d.amount); io.emit('chat message', { user: "Система", text: `+${d.amount} XP для ${d.targetName}`, xp: -2 }); }
        }
    });

    socket.on('disconnect', () => {
        if (currentUserName) delete onlineUsers[currentUserName];
        io.emit('update online', Object.keys(onlineUsers));
    });
});

server.listen(PORT, () => console.log('Bizbarmak Live'));
