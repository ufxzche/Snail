const https = require('https');

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function validateOrder(order) {
    if (!order || typeof order !== 'object') {
        throw new Error('INVALID_ORDER');
    }

    if (!order.name || !order.phone || !order.quantity) {
        throw new Error('MISSING_FIELDS');
    }

    if (Number(order.quantity) < 1 || Number(order.quantity) > 100) {
        throw new Error('INVALID_QUANTITY');
    }
}

function sendTelegramOrder(order) {
    validateOrder(order);

    var token = process.env.TELEGRAM_BOT_TOKEN;
    var chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        throw new Error('TELEGRAM_NOT_CONFIGURED');
    }

    var text = [
        '🐌 <b>Новый заказ Snail</b>',
        '',
        '<b>Товар:</b> ' + escapeHtml(order.product || 'Не указан'),
        '<b>Имя:</b> ' + escapeHtml(order.name),
        '<b>Телефон:</b> ' + escapeHtml(order.phone),
        '<b>Кол-во:</b> ' + escapeHtml(order.quantity),
        '<b>Время:</b> ' + new Date().toLocaleString('ru-RU')
    ].join('\n');

    var payload = JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
    });

    return new Promise(function (resolve, reject) {
        var request = https.request({
            hostname: 'api.telegram.org',
            path: '/bot' + token + '/sendMessage',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, function (response) {
            var chunks = [];

            response.on('data', function (chunk) {
                chunks.push(chunk);
            });

            response.on('end', function () {
                try {
                    var data = JSON.parse(Buffer.concat(chunks).toString('utf8'));

                    if (response.statusCode >= 400 || !data.ok) {
                        reject(new Error(data.description || 'TELEGRAM_API_ERROR'));
                        return;
                    }

                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            });
        });

        request.on('error', reject);
        request.write(payload);
        request.end();
    });
}

const ERROR_MESSAGES = {
    TELEGRAM_NOT_CONFIGURED: 'Telegram-бот не настроен на сервере',
    MISSING_FIELDS: 'Заполните все поля формы',
    INVALID_QUANTITY: 'Укажите количество от 1 до 100',
    INVALID_ORDER: 'Некорректные данные заказа'
};

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    try {
        var body = req.body;

        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        await sendTelegramOrder(body);
        return res.status(200).json({ ok: true });
    } catch (error) {
        var message = ERROR_MESSAGES[error.message] || 'Не удалось отправить заявку';
        var status = error.message === 'TELEGRAM_NOT_CONFIGURED' ? 503 : 400;

        return res.status(status).json({ ok: false, error: message });
    }
};
