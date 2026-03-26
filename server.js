const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

let users = []; // Пока база в памяти

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// РЕГИСТРАЦИЯ
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) {
        return res.send("<h2>Этот ник уже занят!</h2><a href='/'>Назад</a>");
    }
    users.push({ username, password });
    res.send(`<h2>Аккаунт ${username} создан!</h2><a href='/'>Теперь войди</a>`);
});

// ВХОД
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        res.send(`<h1>Привет, ${username}!</h1><p>Добро пожаловать в Bizbarmak.</p>`);
    } else {
        res.send("<h2>Неверный логин или пароль!</h2><a href='/'>Попробовать снова</a>");
    }
});

app.listen(PORT, () => {
    console.log(`Bizbarmak запущен на порту ${PORT}`);
});
