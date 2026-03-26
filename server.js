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
    if (users.find(u => u.username === username)) return res.send(uWrapper("Ошибка", "Ник занят.", "Назад", "#ff4b2b"));
    users.push({ 
        username, password, color: "#667eea", 
        bio: "В сети Bizbarmak", 
        avatar: "https://cdn-icons-png.flaticon.com/512/147/147144.png",
        xp: 0,
        mutedUntil: 0 // Время окончания мута
    });
    res.send(uiWrapper("Успех!", `Аккаунт ${username} создан.`, "Войти"));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "@-ADMIN-@" && password === "adminpanelactivate") {
        return res.redirect(`/chat.html?user=${encodeURIComponent(username)}`);
    }
    const user = users.find(u => u.username === username && u.password === password);
    if (user) res.redirect(`/chat.html?user=${encodeURIComponent(username)}`);
    else res.send(uiWrapper("Ошибка", "Неверный логин или пароль.", "Назад", "#ff4b2b"));
});

io.on('connection', (socket) => {
    let currentUserName = "";

    socket.on('register online', (username) => {
        currentUserName = username;
        onlineUsers[username] = socket.id;
        let user;
        if (username === "@-ADMIN-@") {
            user = { username: "@-ADMIN-@", color: "#ff4b2b", bio: "ГЛАВНЫЙ АДМИН", avatar: "https://cdn-icons-png.flaticon.com/512/606/606541.png", xp: -1 };
        } else {
            user = users.find(u => u.username === username);
        }
        if (user) socket.emit('profile data', user);
        io.emit('update online', Object.keys(onlineUsers));
    });

    socket.on('chat message', (data) => {
        const isAdmin = data.user === "@-ADMIN-@";
        const user = isAdmin ? { color: "#ff4b2b", avatar: "https://cdn-icons-png.flaticon.com/512/606/606541.png", xp: -1, mutedUntil: 0 } : users.find(u => u.username === data.user);
        
        if (user) {
            // Проверка мута
            if (user.mutedUntil > Date.now()) {
                const remaining = Math.ceil((user.mutedUntil - Date.now()) / 1000);
                return socket.emit('chat message', { user: "Система", text: `Вы замучены! Осталось: ${remaining} сек.`, color: "#ff4b2b", xp: -2 });
            }

            if (!isAdmin) user.xp += 10;
            io.emit('chat message', { ...data, color: user.color, avatar: user.avatar, xp: user.xp });
        }
    });

    // ТЕПЕРЬ ДОБАВЛЯЕТ XP (+), А НЕ ЗАМЕНЯЕТ
    socket.on('admin add xp', (data) => {
        if (currentUserName === "@-ADMIN-@") {
            const target = users.find(u => u.username === data.targetName);
            if (target) {
                target.xp += parseInt(data.amount);
                io.emit('chat message', { user: "Система", text: `Админ выдал +${data.amount} XP игроку ${data.targetName}!`, color: "#ff4b2b", avatar: "https://cdn-icons-png.flaticon.com/512/606/606541.png", xp: -2 });
            }
        }
    });

    // ВЫДАЧА ШЕФА (УСТАНОВКА 1500)
    socket.on('admin set chef', (targetName) => {
        if (currentUserName === "@-ADMIN-@") {
            const target = users.find(u => u.username === targetName);
            if (target) {
                target.xp = 1500;
                io.emit('chat message', { user: "Система", text: `${targetName} теперь Шеф по воле Админа!`, color: "#f6d365", avatar: "https://cdn-icons-png.flaticon.com/512/606/606541.png", xp: -2 });
            }
        }
    });

    // МУТ
    socket.on('admin mute', (data) => {
        if (currentUserName === "@-ADMIN-@") {
            const target = users.find(u => u.username === data.targetName);
            if (target) {
                target.mutedUntil = Date.now() + (data.minutes * 60 * 1000);
                io.emit('chat message', { user: "Система", text: `Игрок ${data.targetName} замучен на ${data.minutes} мин.`, color: "#ff4b2b", xp: -2 });
            }
        }
    });

    socket.on('admin reset xp', (targetName) => {
        if (currentUserName === "@-ADMIN-@") {
            const target = users.find(u => u.username === targetName);
            if (target) {
                target.xp = 0;
                io.emit('chat message', { user: "Система", text: `Опыт игрока ${targetName} обнулен!`, color: "#ff4b2b", xp: -2 });
            }
        }
    });

    socket.on('get info', (name) => {
        const target = (name === "@-ADMIN-@") ? { username: "@-ADMIN-@", color: "#ff4b2b", bio: "ГЛАВНЫЙ АДМИН", avatar: "https://cdn-icons-png.flaticon.com/512/606/606541.png", xp: -1 } : users.find(u => u.username === name);
        if (target) socket.emit('user info', target);
    });

    socket.on('disconnect', () => {
        if (currentUserName) delete onlineUsers[currentUserName];
        io.emit('update online', Object.keys(onlineUsers));
    });
});

server.listen(PORT, () => console.log('Admin v2 Ready'));
