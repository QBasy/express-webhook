# 📚 НАВИГАЦИЯ ПО ДОКУМЕНТАЦИИ

## 🚀 НАЧНИТЕ ОТСЮДА:

### 1️⃣ [QUICK_START.md](./QUICK_START.md) ⭐
**Для тех кто хочет запустить за 3 минуты**
- Минимальные шаги
- Быстрый старт
- Troubleshooting

### 2️⃣ [README.md](./README.md)
**Полная документация проекта**
- Что включено
- Установка
- API Client
- Фичи (i18n, Lucide, Mobile)
- Примеры использования

---

## 📖 ДОПОЛНИТЕЛЬНЫЕ МАТЕРИАЛЫ:

### 3️⃣ [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)
**Что изменилось в проекте**
- Что было удалено
- Что добавлено
- Сравнение до/после
- Как теперь работает

### 4️⃣ [ARCHITECTURE.md](./ARCHITECTURE.md)
**Подробная архитектура**
- Схемы взаимодействия
- Data flow
- Authentication flow
- Файловая структура

---

## 📋 КРАТКАЯ СПРАВКА:

```bash
# Установка
npm install
echo "VITE_API_URL=http://localhost:3000" > .env

# Запуск
npm run dev  # http://localhost:5173

# Build
npm run build
npm run preview
```

---

## 🔌 БЫСТРЫЙ СТАРТ КОДА:

### API Client:
```typescript
import { api } from '$lib/utils/api';

// Login
await api.login(username, password);

// Get webhooks
const webhooks = await api.getWebhooks(roomId);
```

### Stores:
```typescript
import { authState } from '$stores/auth.svelte';
import { webhooksState } from '$stores/webhooks.svelte';
import { i18n } from '$stores/i18n.svelte';

// Auth
authState.isAuthenticated  // boolean
authState.user             // User | null

// Webhooks
webhooksState.items        // Webhook[]
webhooksState.loading      // boolean

// i18n
i18n.t('auth.username')    // "Имя пользователя"
i18n.toggleLocale()        // RU ⇄ EN
```

---

## 📁 СТРУКТУРА ФАЙЛОВ:

```
├── src/
│   ├── lib/
│   │   ├── components/Navbar.svelte
│   │   ├── stores/ (auth, webhooks, i18n)
│   │   ├── utils/api.ts ⭐
│   │   └── types/index.ts
│   └── routes/ (pages)
├── .env
├── package.json
└── *.md (documentation)
```

---

## 🎯 ЧТО ЧИТАТЬ В ЗАВИСИМОСТИ ОТ ЗАДАЧИ:

| Задача | Документ |
|--------|----------|
| Быстро запустить | [QUICK_START.md](./QUICK_START.md) |
| Понять как работает | [README.md](./README.md) |
| Узнать что изменилось | [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md) |
| Изучить архитектуру | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Добавить новую фичу | [README.md](./README.md) → API Client |
| Настроить деплой | [README.md](./README.md) → Production |
| Решить проблему | [QUICK_START.md](./QUICK_START.md) → Troubleshooting |

---

## ⚡ ЧАСТЫЕ ВОПРОСЫ:

**Q: Где бэкенд?**  
A: Бэкенд в вашем Fastify проекте (отдельно)

**Q: Как добавить новый API endpoint?**  
A: Добавь метод в `src/lib/utils/api.ts`

**Q: Как изменить язык?**  
A: Кнопка 🌐 в navbar или `i18n.toggleLocale()`

**Q: Как добавить перевод?**  
A: Отредактируй `src/lib/stores/i18n.svelte.ts`

**Q: CORS ошибка?**  
A: Настрой CORS в Fastify (см. QUICK_START.md)

---

## 📞 ПОДДЕРЖКА:

**GREEN-API QA TEAM**  
https://green-api.com

---

## 🔥 ЧЕКЛИСТ ГОТОВНОСТИ:

- [ ] Fastify backend запущен на :3000
- [ ] MongoDB запущена
- [ ] .env создан с VITE_API_URL
- [ ] npm install выполнен
- [ ] npm run dev запущен
- [ ] Браузер открыт на :5173
- [ ] Логин работает (admin/admin)

---

**Готово! Выбирай нужный документ и вперёд! 🚀**
