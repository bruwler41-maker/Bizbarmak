const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

let users = []; 
let onlineUsers = {}; // { username: socketId }

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const uiWrapper = (title, msg, btnText = "Назад", color = "#667eea") => `
    <body style="background: #0f0c29; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
        <div style="text-align: center; background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); max-width: 300px;">
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
    users.push({ username, password, bio: "Пользователь Bizbarmak" });
    res.send(uiWrapper("Готово!", `Аккаунт ${username} создан.`, "Войти"));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        // Передаем никнейм через URL (временно, пока нет сессий)
        res.redirect(`/chat.html?user=${username}`);
    } else {
        res.send(uiWrapper("Ошибка", "Неверные данные.", "Назад", "#ff4b2b"));
    }
});

io.on('connection', (socket) => {
    socket.on('register online', (username) => {
        onlineUsers[username] = socket.id;
        io.emit('update online', Object.keys(onlineUsers));
    });

    // Общий чат
    socket.on('chat message', (data) => io.emit('chat message', data));

    // Личные сообщения (ЛС)
    socket.on('private message', ({ to, from, text }) => {
        const targetId = onlineUsers[to];
        if (targetId) {
            io.to(targetId).emit('private message', { from, text });
            socket.emit('private message', { from: `Вы (для ${to})`, text });
        } else {
            socket.emit('system message', `Пользователь ${to} не в сети.`);
        }
    });

    socket.on('disconnect', () => {
        for (let user in onlineUsers) {
            if (onlineUsers[user] === socket.id) delete onlineUsers[user];
        }
        io.emit('update online', Object.keys(onlineUsers));
    });
});

server.listen(PORT, () => console.log(`Bizbarmak на порту ${PORT}`));
