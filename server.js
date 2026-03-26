// ... (верхняя часть кода остается прежней)

let users = []; // Тут теперь будут объекты {username, password, color, bio}

// Обновим регистрацию, чтобы у каждого был цвет по умолчанию
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) return res.send(uiWrapper("Упс!", "Ник занят.", "Назад", "#ff4b2b"));
    
    users.push({ 
        username, 
        password, 
        color: "#667eea", // Цвет по умолчанию
        bio: "Пишу в Bizbarmak..." 
    });
    res.send(uiWrapper("Готово!", `Аккаунт ${username} создан.`, "Войти"));
});

io.on('connection', (socket) => {
    socket.on('register online', (username) => {
        onlineUsers[username] = socket.id;
        const user = users.find(u => u.username === username);
        // Отправляем пользователю его данные при входе
        socket.emit('profile data', user);
        io.emit('update online', Object.keys(onlineUsers));
    });

    // Обработка обновления профиля
    socket.on('update profile', (data) => {
        const user = users.find(u => u.username === data.username);
        if (user) {
            user.color = data.color;
            user.bio = data.bio;
            console.log(`Профиль ${data.username} обновлен`);
        }
    });

    // Изменим отправку сообщения, чтобы передавать цвет
    socket.on('chat message', (data) => {
        const user = users.find(u => u.username === data.user);
        io.emit('chat message', { ...data, color: user ? user.color : '#fff' });
    });

    // ... (код для ЛС остается прежним)
});
