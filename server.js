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
    if (users.find(u => u.username === username)) return res.send(uiWrapper("Ошибка", "Никнейм уже занят.", "Назад", "#ff4b2b"));
    
    users.push({ 
        username, 
        password, 
        color: "#667eea", 
        bio: "Пользуюсь Bizbarmak 🚀",
        avatar: "https://cdn-icons-png.flaticon.com/512/147/147144.png"
    });
    res.send(uiWrapper("Успех!", `Аккаунт ${username} готов к работе.`, "Войти"));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.redirect(`/chat.html?user=${encodeURIComponent(username)}`);
    } else {
        res.send(uiWrapper("Ошибка входа", "Неверный ник или пароль.", "Назад", "#ff4b2b"));
    }
});

io.on('connection', (socket) => {
    socket.on('register online', (username) => {
        onlineUsers[username
