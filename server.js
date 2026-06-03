const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

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

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

function loadEnvFile() {
    var envPath = path.join(ROOT, '.env');

    if (!fs.existsSync(envPath)) {
        return;
    }

    fs.readFileSync(envPath, 'utf8').split('\n').forEach(function (line) {
        var match = line.match(/^([^#=]+)=(.*)$/);

        if (match) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
    var urlPath = decodeURIComponent(req.url.split('?')[0]);
    var filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

    if (!filePath.startsWith(ROOT)) {
        sendJson(res, 403, { ok: false, error: 'Forbidden' });
        return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        sendJson(res, 404, { ok: false, error: 'Not found' });
        return;
    }

    var ext = path.extname(filePath).toLowerCase();
    var contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
}

async function handleOrder(req, res) {
    var chunks = [];

    for await (var chunk of req) {
        chunks.push(chunk);
    }

    try {
        var body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        await sendTelegramOrder(body);
        sendJson(res, 200, { ok: true });
    } catch (error) {
        var messages = {
            TELEGRAM_NOT_CONFIGURED: 'Создайте файл .env с TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID',
            MISSING_FIELDS: 'Заполните все поля формы',
            INVALID_QUANTITY: 'Укажите количество от 1 до 100',
            INVALID_ORDER: 'Некорректные данные заказа'
        };

        var status = error.message === 'TELEGRAM_NOT_CONFIGURED' ? 503 : 400;
        sendJson(res, status, {
            ok: false,
            error: messages[error.message] || 'Не удалось отправить заявку'
        });
    }
}

loadEnvFile();

var server = http.createServer(function (req, res) {
    if (req.method === 'POST' && req.url === '/api/send-order') {
        handleOrder(req, res);
        return;
    }

    if (req.method === 'GET') {
        serveStatic(req, res);
        return;
    }

    sendJson(res, 405, { ok: false, error: 'Method not allowed' });
});

server.listen(PORT, function () {
    console.log('Snail запущен: http://localhost:' + PORT);

    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
        console.log('Внимание: Telegram не настроен. Скопируйте .env.example в .env');
    }
});
