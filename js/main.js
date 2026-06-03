document.addEventListener('DOMContentLoaded', function () {
    var ORDER_API_URL = '/api/send-order';

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (event) {
            var targetId = link.getAttribute('href').slice(1);
            if (!targetId) {
                return;
            }

            var target = document.getElementById(targetId);
            if (!target) {
                return;
            }

            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    if (typeof $ !== 'undefined') {
        $('#exampleModal').on('show.bs.modal', function (event) {
            var button = $(event.relatedTarget);
            var productName = button.data('product');
            var title = $('#exampleModalLabel');
            var orderError = document.getElementById('order-error');
            var quantityInput = document.getElementById('message-text');

            if (productName) {
                title.text('Заказ: ' + productName);
            }

            if (quantityInput && !quantityInput.value) {
                quantityInput.value = '1';
            }

            if (orderError) {
                orderError.hidden = true;
                orderError.textContent = '';
            }
        });

        $('#exampleModal').on('hidden.bs.modal', function () {
            $('#exampleModalLabel').text('Выберите кол-во улиток');
        });
    }

    var orderBtn = document.getElementById('order-btn');
    var orderForm = document.getElementById('order-form');
    var orderError = document.getElementById('order-error');

    function showOrderError(message) {
        if (!orderError) {
            window.alert(message);
            return;
        }

        orderError.textContent = message;
        orderError.hidden = false;
    }

    function submitOrder() {
        if (!orderForm.checkValidity()) {
            orderForm.reportValidity();
            return;
        }

        var productTitle = document.getElementById('exampleModalLabel');
        var productName = productTitle ? productTitle.textContent.replace('Заказ: ', '').trim() : '';
        var order = {
            product: productName || 'Не указан',
            name: document.getElementById('order-name').value.trim(),
            phone: document.getElementById('order-phone').value.trim(),
            quantity: document.getElementById('message-text').value
        };

        orderBtn.disabled = true;
        orderBtn.textContent = 'Отправка...';

        if (orderError) {
            orderError.hidden = true;
            orderError.textContent = '';
        }

        fetch(ORDER_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        })
            .then(function (response) {
                return response.text().then(function (text) {
                    var data = {};

                    if (text) {
                        try {
                            data = JSON.parse(text);
                        } catch (parseError) {
                            throw new Error('Сервер недоступен. Запустите сайт через npm start');
                        }
                    }

                    return { ok: response.ok, data: data };
                });
            })
            .then(function (result) {
                if (!result.ok || !result.data.ok) {
                    throw new Error(result.data.error || 'Не удалось отправить заявку');
                }

                $('#exampleModal').modal('hide');
                $('#success').modal('show');
                orderForm.reset();
                document.getElementById('message-text').value = '1';
            })
            .catch(function (error) {
                showOrderError(
                    error.message ||
                    'Не удалось отправить заявку. Запустите сайт через npm start и проверьте .env'
                );
            })
            .finally(function () {
                orderBtn.disabled = false;
                orderBtn.textContent = 'Оформить';
            });
    }

    if (orderBtn && orderForm) {
        orderBtn.addEventListener('click', submitOrder);

        orderForm.addEventListener('submit', function (event) {
            event.preventDefault();
            submitOrder();
        });
    }
});
