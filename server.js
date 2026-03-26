const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// ВАЖНО: Мы используем process.env.PORT, чтобы хостинг сам назначил порт.
// Если мы запускаем код на компьютере, будет использоваться 3000.
const PORT = process.env.PORT || 3000;

// Настройка для работы с данными из HTML-форм
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Позволяем серверу раздавать статические файлы (картинки, стили), если они появятся
app.use(express.static(path.join(__dirname)));

// Главная страница — отправляем твой index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Маршрут для обработки регистрации
app.post('/register', (req, res) => {
    // Извлекаем данные из формы
    const { username, email, password } = req.body;
    
    // В консоли сервера (в терминале) мы увидим, что кто-то зашел
    console.log(`--- Новая регистрация в Bizbarmak ---`);
    console.log(`Имя пользователя: ${username}`);
    console.log(`Email: ${email}`);
    // Пароль выводить в консоль не будем в целях безопасности
    console.log(`-------------------------------------`);

    // Временный ответ пользователю после нажатия кнопки
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1 style="color: #6c5ce7;">Успех!</h1>
            <p>Рахмет, <strong>${username}</strong>! Твой аккаунт для Bizbarmak почти готов.</p>
            <p>Данные для почты <i>${email}</i> получены сервером.</p>
            <br>
            <a href="/" style="color: #9face6;">Вернуться назад</a>
        </div>
    `);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`  Bizbarmak запущен!`);
    console.log(`  Адрес: http://localhost:${PORT}`);
    console.log(`=========================================`);
});
