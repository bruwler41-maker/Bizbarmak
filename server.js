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
let messages = []; // Хранилище для работы с ID сообщений

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const uiWrapper = (title, msg, btnText = "Назад", color = "#667eea") => `
    <body style="background: #0f0c29; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
        <div style="text-align: center; background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); max-width: 320px;">
            <h2 style="color: ${color}">${title}</h2>
            <p style="opacity: 0.8">${msg}</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: ${color}; color: white; text-decoration: none; border-radius: 12px; font-weight: bold;">${btnText}</a>
        </div>
    </body>
`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (username.includes("ADMIN")) return res.send(uiWrapper("Ошибка", "Ник защищен.", "Назад", "#ff4b2b"));
    if (users.find(u => u.username === username)) return res.send(uiWrapper("Ошибка", "Ник занят.", "Назад", "#ff4b2b"));
    users.push({ username, password, color: "#667eea", bio: "В сети Bizbarmak", avatar: "https://cdn-icons-png.flaticon.com/512/147/147144.png", xp: 0, mutedUntil: 0 });
    res.send(uiWrapper("Успех!", `Аккаунт ${username} создан.`, "Войти"));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "@-ADMIN-@" && password === "adminpanelactivate") return res.redirect(`/chat.html?user=${encodeURIComponent(username)}`);
    const user = users.find(u => u.username === username && u.password === password);
    if (user) res.redirect(`/chat.html?user=${encodeURIComponent(username)}`);
    else res.send(uiWrapper("Ошибка", "Неверный логин или пароль.", "Назад", "#ff4b2b"));
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

        const msgId = Date.now() + Math.random();
        const newMsg = { ...data, id: msgId, color: data.color, avatar: data.avatar, xp: user ? user.xp : 0 };
        messages.push(newMsg);
        if (messages.length > 50) messages.shift();
        io.emit('chat message', newMsg);
    });

    // НОВЫЕ ФУНКЦИИ УДАЛЕНИЯ И ПРАВКИ
    socket.on('delete message', (id) => {
        messages = messages.filter(m => m.id !== id);
        io.emit('message deleted', id);
    });

    socket.on('edit message', (data) => {
        const msg = messages.find(m => m.id === data.id);
        if (msg) {
            msg.text = data.newText + " (изм.)";
            io.emit('message edited', { id: data.id, newText: msg.text });
        }
    });

    // АДМИНКА
    socket.on('admin add xp', (d) => { if (currentUserName === "@-ADMIN-@") { const t = users.find(u => u.username === d.targetName); if(t) { t.xp += parseInt(d.amount); io.emit('chat message', { user: "Система", text: `+${d.amount} XP для ${d.targetName}`, xp: -2 }); } } });
    socket.on('admin mute', (d) => { if (currentUserName === "@-ADMIN-@") { const t = users.find(u => u.username === d.targetName); if(t) { t.mutedUntil = Date.now() + (d.minutes * 60 * 1000); io.emit('chat message', { user: "Система", text: `${d.targetName} замучен`, xp: -2 }); } } });
    socket.on('get info', (n) => { const t = (n === "@-ADMIN-@") ? { username: "@-ADMIN-@", xp: -1, bio: "АДМИН", avatar: "https://cdn-icons-png.flaticon.com/512/606/606541.png" } : users.find(u => u.username === n); if (t) socket.emit('user info', t); });
    socket.on('disconnect', () => { if (currentUserName) delete onlineUsers[currentUserName]; io.emit('update online', Object.keys(onlineUsers)); });
});

server.listen(PORT, () => console.log('Ready'));
