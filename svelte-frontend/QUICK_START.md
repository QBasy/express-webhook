# ⚡ QUICK START - 3 минуты до запуска!

## ✅ ЧТО У ВАС УЖЕ ЕСТЬ:

- ✅ Fastify backend с MongoDB
- ✅ JWT auth
- ✅ API endpoints:
  - `/api/auth/login`
  - `/api/auth/register`
  - `/api/webhook/:id`
  - `/api/room/:id`
  - `/api/admin/*`

## 🚀 ЗАПУСК ЗА 3 ШАГА:

### 1️⃣ Запустить Fastify Backend

```bash
cd /path/to/your/fastify-backend
npm run dev
# ✅ Backend должен быть на http://localhost:3000
```

### 2️⃣ Настроить Frontend

```bash
cd sveltekit-webhook-viewer
npm install

# Создать .env
echo "VITE_API_URL=http://localhost:3000" > .env
```

### 3️⃣ Запустить Frontend

```bash
npm run dev
# ✅ Откроется http://localhost:5173
```

---

## 🎯 ЧТО ДЕЛАТЬ ДАЛЬШЕ:

1. Открыть браузер: `http://localhost:5173`
2. Войти: `admin` / `admin`
3. Ввести Room ID
4. Нажать "Загрузить"
5. Webhooks отображаются!

---

## 🔌 КАК ЭТО РАБОТАЕТ:

```
Browser → SvelteKit (5173) → Fastify (3000) → MongoDB
```

SvelteKit делает:
```javascript
fetch('http://localhost:3000/api/webhook/room123')
```

Fastify отвечает:
```json
[
  {
    "_id": "...",
    "roomId": "room123",
    "body": {...},
    "timestamp": "2025-11-02T..."
  }
]
```

---

## ⚠️ ЕСЛИ НЕ РАБОТАЕТ:

### CORS ошибка?
Добавь в Fastify:
```typescript
import cors from '@fastify/cors';
fastify.register(cors, {
  origin: 'http://localhost:5173',
  credentials: true
});
```

### 401 Unauthorized?
- Проверь что в Fastify есть пользователь admin/admin
- Перезайди в систему

### Connection refused?
- Проверь что Fastify запущен на `:3000`
- Проверь `.env`: `VITE_API_URL=http://localhost:3000`

---

## 🎉 ВСЁ РАБОТАЕТ?

Теперь можешь:
- ✅ Смотреть webhooks
- ✅ Удалять webhooks
- ✅ Переключать язык (RU/EN)
- ✅ Открыть на мобилке (responsive)
- ✅ Регистрировать новых пользователей
- ✅ Управлять через Admin panel (если admin)

---

## 📱 МОБИЛЬНАЯ ВЕРСИЯ:

Открой на телефоне:
```
http://YOUR_IP:5173
```

Например: `http://192.168.1.100:5173`

---

## 🛠️ PRODUCTION:

```bash
# Frontend
npm run build
npm run preview

# Backend
npm run build
npm start
```

---

**Всё готово! 🚀**
