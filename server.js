const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

let users = []; // Временная база в памяти

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Красивая обертка для уведомлений
const uiWrapper = (title, msg, btnText = "Назад", color = "#667eea") => `
    <body style="background: #0f0c29; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
        <div style="text-align: center; background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); max-width: 300px;">
            <h2 style="color: ${color}">${title}</h2>
            <p style="opacity: 0.8">${msg}</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: ${color}; color: white; text-decoration: none; border-radius: 10px; font-weight: bold;">${btnText}</a>
        </div>
    </body>
`;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Регистрация
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) {
        return res.send(uiWrapper("Упс!", "Этот никнейм уже занят.", "Попробовать другой", "#ff4b2b"));
    }
    users.push({ username, password });
    res.send(uiWrapper("Готово!", `Аккаунт <b>${username}</b> создан.`, "Войти сейчас"));
});

// Вход
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.sendFile(path.join(__dirname, 'chat.html'));
    } else {
        res.send(uiWrapper("Ошибка входа", "Неверный логин или пароль.", "Назад", "#ff4b2b"));
    }
});

// РАБОТА С СООБЩЕНИЯМИ (WebSockets)
io.on('connection', (socket) => {
    console.log('Пользователь подключился');

    socket.on('chat message', (data) => {
        // Рассылаем сообщение всем подключенным пользователям
        io.emit('chat message', data);
    });

    socket.on('disconnect', () => {
        console.log('Пользователь отключился');
    });
});

server.listen(PORT, () => {
    console.log(`Bizbarmak в эфире на порту ${PORT}`);
});
