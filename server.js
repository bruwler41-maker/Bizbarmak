const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

let users = []; 

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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) {
        return res.send(uiWrapper("Упс!", "Этот никнейм уже занят кем-то другим.", "Попробовать другой", "#ff4b2b"));
    }
    users.push({ username, password });
    res.send(uiWrapper("Готово!", `Аккаунт <b>${username}</b> успешно создан.`, "Войти сейчас"));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        // Вот сюда мы потом вставим редирект на мессенджер
        res.send(`<h1 style="color: white; text-align: center; font-family: sans-serif; margin-top: 20%; background: #0f0c29;">Привет, ${username}! Скоро тут будет чат...</h1>`);
    } else {
        res.send(uiWrapper("Ошибка входа", "Неверный логин или твой пароль не подошел.", "Назад", "#ff4b2b"));
    }
});

app.listen(PORT, () => {
    console.log(`Bizbarmak в эфире на порту ${PORT}`);
});
