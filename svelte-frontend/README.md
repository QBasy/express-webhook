# 🚀 SvelteKit Webhook Viewer - FRONTEND ONLY

**Чистый фронтенд на SvelteKit 5 + Lucide + i18n + Mobile-First**

> ⚠️ **ВАЖНО:** Этот проект — **только фронтенд**. Он работает с вашим **Fastify бэкендом**!

---

## 📐 АРХИТЕКТУРА

```
┌─────────────────────────────────────┐
│   SvelteKit Frontend (Port 5173)    │
│   - UI компоненты (Svelte 5 Runes)  │
│   - Lucide иконки                    │
│   - i18n (RU/EN)                     │
│   - Mobile-first адаптивность        │
│   - Только fetch() к API             │
└─────────────────────────────────────┘
              ↓ HTTP requests
┌─────────────────────────────────────┐
│   Fastify Backend (Port 3000)       │
│   - MongoDB                          │
│   - JWT auth                         │
│   - /api/auth/*                      │
│   - /api/room/*                      │
│   - /api/webhook/*                   │
│   - /api/admin/*                     │
└─────────────────────────────────────┘
```

---

## ✅ ЧТО ВКЛЮЧЕНО

### Frontend (SvelteKit)
- ✅ **Svelte 5 Runes** - $state, $derived, $effect
- ✅ **Lucide Icons** - красивые SVG иконки
- ✅ **i18n** - RU/EN переключение
- ✅ **Mobile-First** - адаптивная верстка
- ✅ **Sticky Navbar** - прилипающий navbar
- ✅ **Burger Menu** - мобильное меню
- ✅ **API Client** - wrapper для Fastify
- ✅ **TypeScript** - полная типизация
- ✅ **NO Backend** - чистый фронтенд

### Backend (Fastify) - У вас уже есть!
- ✅ MongoDB
- ✅ JWT auth
- ✅ User management
- ✅ Room management
- ✅ Webhook storage
- ✅ Admin panel API

---

## 🚀 БЫСТРЫЙ СТАРТ

### 1. Запустить Fastify Backend

```bash
cd /path/to/fastify-backend
npm install
npm run dev  # Запустится на :3000
```

### 2. Запустить SvelteKit Frontend

```bash
cd /path/to/sveltekit-frontend
npm install

# Создать .env
echo "VITE_API_URL=http://localhost:3000" > .env

# Запустить dev server
npm run dev  # Запустится на :5173
```

### 3. Открыть браузер

```
http://localhost:5173
Логин: admin / admin
```

---

## 📁 СТРУКТУРА ПРОЕКТА

```
sveltekit-frontend/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── Navbar.svelte          # Navbar с Lucide + i18n + mobile
│   │   │
│   │   ├── stores/
│   │   │   ├── auth.svelte.ts         # Auth state (login, logout)
│   │   │   ├── webhooks.svelte.ts     # Webhooks state
│   │   │   └── i18n.svelte.ts         # i18n (RU/EN)
│   │   │
│   │   ├── utils/
│   │   │   └── api.ts                 # ⭐ API Client для Fastify
│   │   │
│   │   └── types/
│   │       └── index.ts               # TypeScript типы
│   │
│   └── routes/                        # Страницы
│       ├── +layout.svelte             # Layout (Navbar + i18n init)
│       ├── +page.svelte               # Главная (webhooks viewer)
│       ├── login/+page.svelte         # Логин
│       └── register/+page.svelte      # Регистрация
│
├── .env                               # VITE_API_URL=http://localhost:3000
├── package.json                       # БЕЗ MongoDB, JWT, bcrypt
└── README.md
```

**❌ НЕТ:**
- `src/lib/server/` - удалено
- `src/routes/api/` - удалено
- `src/hooks.server.ts` - удалено
- MongoDB зависимостей
- JWT зависимостей

---

## 🔌 API CLIENT

Все запросы к Fastify идут через `/src/lib/utils/api.ts`:

```typescript
import { api } from '$lib/utils/api';

// Логин
const result = await api.login(username, password);

// Получить webhooks
const webhooks = await api.getWebhooks(roomId);

// Удалить webhook
await api.deleteWebhook(roomId, webhookId);

// Admin: одобрить пользователя
await api.approveUser(userId);
```

### Доступные методы API:

**Auth:**
- `api.login(username, password)`
- `api.register(username, email, password, reason?)`
- `api.getMe()`
- `api.updateMyTTL(ttl)`
- `api.logout()`

**Webhooks:**
- `api.getWebhooks(roomId)`
- `api.clearWebhooks(roomId)`
- `api.deleteWebhook(roomId, webhookId)`

**Rooms:**
- `api.createRoom(roomId)`
- `api.getMyRooms()`
- `api.deleteRoom(roomId)`
- `api.getAllRooms()` (admin)
- `api.setFakeError(roomId, enabled, statusCode?)`
- `api.getFakeErrorStatus(roomId)`

**Admin:**
- `api.getUsers()`
- `api.approveUser(userId)`
- `api.rejectUser(userId, reason?)`
- `api.deleteUser(userId)`
- `api.updateUserTTL(userId, ttl)`
- `api.getStats()`

---

## 🌐 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

### Frontend (.env)

```bash
# URL вашего Fastify бэкенда
VITE_API_URL=http://localhost:3000
```

### Backend (ваш Fastify)

```bash
MONGO_URI=mongodb://localhost:27017
DB_NAME=webhook_viewer
JWT_SECRET=your-super-secret-key
PORT=3000
```

---

## 🎨 ФИЧИ

### 🌐 i18n (Internationalization)
Переключение языка в navbar (кнопка 🌐):

```typescript
import { i18n } from '$stores/i18n.svelte';

// Использование
{i18n.t('auth.username')}  // "Имя пользователя" или "Username"

// Переключение
i18n.toggleLocale()  // RU ⇄ EN
```

### 🎨 Lucide Icons
Вместо эмодзи используются SVG иконки:

```svelte
<script>
  import { Home, Crown, LogOut } from 'lucide-svelte';
</script>

<Home size={20} class="text-green-600" />
<Crown size={18} />
<LogOut size={16} />
```

### 📱 Mobile-First
- **< 640px:** бургер-меню
- **640-1024px:** адаптивный layout
- **> 1024px:** полный navbar + dropdown

---

## 🔐 АУТЕНТИФИКАЦИЯ

JWT токен хранится в `localStorage`:

```typescript
// После логина
localStorage.setItem('jwt_token', token);

// При запросах
headers: {
  'Authorization': `Bearer ${token}`
}

// При логауте
localStorage.removeItem('jwt_token');
```

---

## 🛠️ КОМАНДЫ

```bash
npm run dev       # Dev server (http://localhost:5173)
npm run build     # Production build
npm run preview   # Preview production
npm run check     # Type check
```

---

## 📋 CHECKLIST ПЕРЕД ЗАПУСКОМ

- [ ] ✅ Fastify backend запущен на `:3000`
- [ ] ✅ MongoDB запущена
- [ ] ✅ `.env` создан с `VITE_API_URL=http://localhost:3000`
- [ ] ✅ `npm install` выполнен
- [ ] ✅ В Fastify есть admin пользователь (admin/admin)

---

## 🆚 СРАВНЕНИЕ: БЫЛО → СТАЛО

| Что | Было ❌ | Стало ✅ |
|-----|---------|----------|
| **Backend** | В SvelteKit | В Fastify (отдельно) |
| **MongoDB** | В SvelteKit | В Fastify |
| **JWT** | В SvelteKit | В Fastify |
| **API Routes** | `/routes/api/` | Fastify endpoints |
| **Иконки** | Эмодзи 🏠 | Lucide SVG |
| **i18n** | Нет | RU/EN |
| **Mobile** | Не адаптивно | Mobile-first |

---

## 🐛 TROUBLESHOOTING

### CORS ошибки

Если видишь CORS ошибки в консоли, добавь в Fastify:

```typescript
// fastify-backend/src/index.ts
import cors from '@fastify/cors';

fastify.register(cors, {
  origin: 'http://localhost:5173',  // SvelteKit dev server
  credentials: true
});
```

### 401 Unauthorized

- Проверь что токен сохранен: `localStorage.getItem('jwt_token')`
- Проверь что Fastify `JWT_SECRET` правильный
- Перезайди в систему

### Webhooks не загружаются

- Проверь что Fastify запущен на `:3000`
- Проверь `VITE_API_URL` в `.env`
- Открой DevTools → Network и посмотри запросы

---

## 📦 ЗАВИСИМОСТИ

```json
{
  "dependencies": {
    "lucide-svelte": "^0.447.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-node": "^5.0.0",
    "@sveltejs/kit": "^2.5.0",
    "svelte": "^5.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

**БЕЗ:** mongodb, jsonwebtoken, bcryptjs

---

## 🚀 PRODUCTION BUILD

```bash
# Frontend
npm run build
npm run preview

# Backend (Fastify)
npm run build
npm start
```

---

## 🎯 TODO (Опционально)

- [ ] Admin page (управление пользователями)
- [ ] Tester page (API тестер)
- [ ] Docs page (документация)
- [ ] Dark mode
- [ ] WebSocket (real-time webhooks)

---

## 📞 КОНТАКТЫ

**GREEN-API QA TEAM**  
https://green-api.com

---

**Made with ❤️ using Svelte 5 + Lucide + i18n + Mobile-First**

🎉 **Готово к использованию!**
