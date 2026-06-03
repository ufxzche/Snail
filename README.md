# Snail

Сайт магазина улиток.

## Запуск

```bash
npm start
```

Сайт откроется на `http://localhost:3000`.

## Заказы через Telegram

1. Создайте бота в [@BotFather](https://t.me/BotFather)
2. Скопируйте `.env.example` в `.env` и укажите `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`
3. Запустите `npm start` и оформите заказ на сайте

Подробнее про `chat_id`: после сообщения боту откройте  
`https://api.telegram.org/bot<TOKEN>/getUpdates`

## Файлы

- `index.html` — главная
- `about.html` — о улитках
- `server.js` — локальный сервер
- `api/send-order.js` — API для Vercel
