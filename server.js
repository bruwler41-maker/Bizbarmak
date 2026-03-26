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

const uiWrapper = (title, msg, btnText = "Назад", color = "#667eea") => `
    <body style="background: #0f0c29; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
        <div style="text-align: center; background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); max-width: 300px;">
            <h2 style="color: ${color}">${title}</h2>
            <p style="opacity: 0.8">${msg}</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: ${color}; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">${btnText}</a>
        </div>
    </body>
`;

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) return res.send(uiWrapper("Упс!", "Ник занят.", "Назад", "#ff4b2b"));
    users.push({ username, password, color: "#667eea", bio: "Новичок в Bizbarmak" });
    res.send(uiWrapper("Успех!", `Аккаунт ${username} создан.`, "Войти"));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.redirect(`/chat.html?user=${encodeURIComponent(username)}`);
    } else {
        res.send(uiWrapper("Ошибка", "Неверный логин или пароль.", "Назад", "#ff4b2b"));
    }
});

io.on('connection', (socket) => {
    socket.on('register online', (username) => {
        onlineUsers[username] = socket.id;
        const user = users.find(u => u.username === username);
        if (user) socket.emit('profile data', user);
        io.emit('update online', Object.keys(onlineUsers));
    });

    socket.on('update profile', (data) => {
        const user = users.find(u => u.username === data.username);
        if (user) { user.color = data.color; user.bio = data.bio; }
    });

    socket.on('chat message', (data) => {
        const user = users.find(u => u.username === data.user);
        io.emit('chat message', { ...data, color: user ? user.color : "#ffffff" });
    });

    socket.on('private message', ({ to, from, text }) => {
        const targetId = onlineUsers[to];
        const sender = users.find(u => u.username === from);
        if (targetId) {
            io.to(targetId).emit('private message', { from, text, color: sender ? sender.color : "#fff" });
            socket.emit('private message', { from: `Вы (для ${to})`, text, color: sender ? sender.color : "#fff" });
        } else {
            socket.emit('system message', `Пользователь ${to} не в сети.`);
        }
    });

    socket.on('disconnect', () => {
        for (let user in onlineUsers) {
            if (onlineUsers[user] === socket.id) { delete onlineUsers[user]; break; }
        }
        io.emit('update online', Object.keys(onlineUsers));
    });
});

server.listen(PORT, () => console.log(`Bizbarmak на порту ${PORT}`));
