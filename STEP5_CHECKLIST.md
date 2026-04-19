# Шаг № 5: Согласование и отклонение платежей - Проверка

## 📋 Реализовано в коде

### HTML (index.html)
✅ Добавлены кнопки согласования/отклонения в шаблон карточки:
```html
<button class="card-action-btn approve-btn" title="Согласовать">✓</button>
<button class="card-action-btn reject-btn" title="Отклонить">✗</button>
```

✅ Добавлен поп-ап отклонения с textarea для причины:
```html
<div class="modal" id="rejectModal">
  <textarea id="rejectionReason" required></textarea>
  <button id="rejectSubmitBtn">Отклонить</button>
</div>
```

### CSS (style.css)
✅ Стили для кнопок согласования/отклонения:
- `.approve-btn` — зелёный цвет (#4CAF50)
- `.reject-btn` — красный цвет (#F44336)
- `.approve-btn.hidden`, `.reject-btn.hidden` — `display: none`

### JavaScript (app.js)

#### Логика видимости кнопок
```javascript
if (payment.status === "draft") {
  // Кнопки видны: слушаем события
  approveBtn.addEventListener("click", () => handleApprove(payment.id));
  rejectBtn.addEventListener("click", () => openRejectModal(payment.id));
} else {
  // Кнопки скрыты для других статусов
  approveBtn.classList.add("hidden");
  rejectBtn.classList.add("hidden");
}
```

#### Согласование платежа
```javascript
async function handleApprove(paymentId) {
  // 1. Подтверждение пользователя
  if (!confirm("Согласовать?")) return;
  
  // 2. API запрос: status = "approved", approved = true
  await updatePayment(paymentId, {
    status: "approved",
    approved: true
  });
  
  // 3. Локальное обновление
  payment.status = "approved";
  payment.approved = true;
  
  // 4. История: action = "approved"
  await addHistory({
    payment_id: paymentId,
    action: "approved",
    old_value: "draft",
    new_value: "approved"
  });
  
  // 5. Перерисовка: карточка уходит во вторую колонку
  renderBoard();
}
```

#### Отклонение платежа
```javascript
async function handleRejectSubmit(e) {
  // 1. Причина отклонения (обязательно)
  const rejectionReason = rejectionReasonField.value.trim();
  if (!rejectionReason) return error;
  
  // 2. API запрос: status = "rejected", rejection_reason
  await updatePayment(paymentId, {
    status: "rejected",
    approved: false,
    rejection_reason: rejectionReason
  });
  
  // 3. Локальное обновление
  payment.status = "rejected";
  payment.rejection_reason = rejectionReason;
  
  // 4. История: action = "rejected"
  await addHistory({
    payment_id: paymentId,
    action: "rejected",
    new_value: "rejected"
  });
  
  // 5. Перерисовка: карточка остается в первой колонке, серая
  renderBoard();
}
```

#### Поп-ап отклонения
```javascript
function openRejectModal(paymentId) {
  state.rejectingPaymentId = paymentId;
  rejectForm.reset();
  rejectionReasonField.focus();
  updateRejectSubmitBtn();  // Заблокировать кнопку
  rejectModal.style.display = "flex";
}

function updateRejectSubmitBtn() {
  const reason = rejectionReasonField.value.trim();
  rejectSubmitBtn.disabled = !reason;  // Кнопка активна только если есть текст
}
```

#### Распределение по колонкам
```javascript
// В renderBoard:
if (status === "rejected") {
  grouped.draft.push(payment);  // Отклоненные остаются в первой колонке
} else if (grouped[status]) {
  grouped[status].push(payment);
}
```

#### История изменений
```javascript
async function addHistory(data) {
  const payload = {
    action: "addHistory",
    payment_id: data.payment_id,
    action_type: data.action,
    old_value: data.old_value,
    new_value: data.new_value,
    user: "system"
  };
  
  // POST к Web App для добавления в лист History
  await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
```

---

## ✅ Самопроверка для агента

### Видимость кнопок
- [x] Кнопки видны только если `status === "draft"`
- [x] При других статусах добавляется класс `hidden`
- [x] Класс `hidden` устанавливает `display: none`

### Согласование
- [x] Вызывает `updatePayment()` с `status="approved"`, `approved=true`
- [x] Добавляет историю с `action="approved"`
- [x] Карточка переходит во вторую колонку (статус changed)
- [x] После обновления кнопки скрываются

### Отклонение
- [x] Открывает поп-ап с textarea
- [x] Причина обязательна (кнопка заблокирована если пусто)
- [x] При отправке: `status="rejected"`, `approved=false`, `rejection_reason=текст`
- [x] Добавляет историю с `action="rejected"`
- [x] Карточка остается в первой колонке (draft)
- [x] Карточка получает класс `rejected` (серый стиль)

### История
- [x] `addHistory()` отправляет `action="addHistory"` на Web App
- [x] Содержит `payment_id`, `action_type`, `old_value`, `new_value`, `user`

---

## 🖥️ Ручная проверка (инструкция для пользователя)

### Подготовка
1. Убедитесь, что у вас есть платежи со статусом `draft` в первой колонке
2. Откройте DevTools (F12) для контроля изменений

### Проверка 1: Согласование платежа

**Что делать:**
1. Найдите платёж в колонке "На оплату"
2. Визуально найдите кнопки:
   - ✓ (зелёная) справа от иконки редактирования
   - ✗ (красная) слева от неё

**Ожидаемый результат:**
- [ ] Кнопки видны только для платежей в первой колонке
- [ ] Кнопка ✓ зелёная (#4CAF50)
- [ ] Кнопка ✗ красная (#F44336)

**Что делать дальше:**
3. Нажмите кнопку ✓
4. Нажмите "ОК" в диалоге подтверждения

**Ожидаемый результат:**
- [ ] Спиннер появляется (загрузка)
- [ ] Карточка переемещается во вторую колонку "Согласовано"
- [ ] Уведомление: "Платёж согласован"
- [ ] Счётчик второй колонки увеличился на 1
- [ ] Счётчик первой колонки уменьшился на 1

**Проверка в Google Sheets:**
- [ ] В таблице поле `approved` изменилось на `TRUE`
- [ ] Лист `History` имеет новую запись:
  - `action` = "approved"
  - `old_value` = "draft"
  - `new_value` = "approved"

### Проверка 2: Отклонение платежа

**Что делать:**
1. Найдите другой платёж в колонке "На оплату"
2. Нажмите кнопку ✗

**Ожидаемый результат:**
- [ ] Появляется поп-ап "Причина отклонения"
- [ ] Поле textarea пусто и в фокусе
- [ ] Кнопка "Отклонить" **неактивная** (серая, disabled)

**Что делать дальше:**
3. Попробуйте нажать "Отклонить" (кнопка не должна сработать)
4. Введите причину отклонения: "Неправильный контрагент"

**Ожидаемый результат:**
- [ ] Кнопка "Отклонить" становится **активной** (зелёная)
- [ ] Текст в поле остаётся

**Что делать дальше:**
5. Нажмите "Отклонить"

**Ожидаемый результат:**
- [ ] Спиннер появляется
- [ ] Поп-ап закрывается
- [ ] Карточка **остаётся** в первой колонке
- [ ] Карточка **становится серой** (класс `rejected`)
- [ ] Уведомление: "Платёж отклонен"
- [ ] Счётчик первой колонки остаётся неизменным

**Проверка в Google Sheets:**
- [ ] Поле `approved` изменилось на `FALSE`
- [ ] Поле `rejection_reason` содержит "Неправильный контрагент"
- [ ] Лист `History` имеет две новые записи:
  - Одна с `action` = "approved" (если согласовали ранее)
  - Одна с `action` = "rejected"

### Проверка 3: Переслушивание отклоненной карточки

**Что делать:**
1. Нажмите на отклоненную карточку (серую)
2. Попробуйте нажать ✓ или ✗

**Ожидаемый результат:**
- [ ] Кнопки ✓ и ✗ **не видны** или **не активны**
- [ ] Видны только кнопки редактирования (✎) и удаления (🗑️)

### Проверка 4: Редактирование отклоненного платежа

**Что делать:**
1. На отклоненной карточке нажмите ✎ (Редактировать)
2. Измените статус на "draft" (если возможно) или другие данные
3. Нажмите "Обновить"

**Ожидаемый результат:**
- [ ] Форма открывается с текущими данными
- [ ] Статус показывает "rejected"
- [ ] После обновления кнопки ✓ и ✗ снова становятся видны
- [ ] История обновляется в `History` листе

---

## 📊 Проверка через DevTools

### Консоль (F12 → Console)

```javascript
// Проверить платёж после согласования
console.log(state.payments.find(p => p.status === "approved"));
// Ожидается: { ..., status: "approved", approved: true }

// Проверить отклоненный платёж
console.log(state.payments.find(p => p.status === "rejected"));
// Ожидается: { ..., status: "rejected", approved: false, rejection_reason: "..." }

// Проверить количество платежей в первой колонке
console.log(state.payments.filter(p => p.status === "draft" || p.status === "rejected").length);
```

### Вкладка Elements (F12 → Elements)

1. Найдите карточку в HTML
2. Проверьте класс: `<div class="payment-card rejected">`
3. Посмотрите, что класс `rejected` применён
4. Проверьте, что кнопки имеют класс `hidden`

---

## ⚠️ Возможные проблемы

### Проблема 1: Кнопки не видны в первой колонке
**Решение:**
- Проверьте, что `payment.status === "draft"`
- Убедитесь, что кнопки не скрыты в HTML (должны быть в шаблоне)
- Проверьте CSS для `.card-action-btn.approve-btn` и `.reject-btn`

### Проблема 2: Поп-ап отклонения не открывается
**Решение:**
- Проверьте, что `rejectModal` элемент существует в HTML
- Убедитесь, что обработчик `rejectBtn.addEventListener("click", ...)`  добавлен
- Проверьте консоль на ошибки JavaScript

### Проблема 3: Кнопка "Отклонить" в поп-апе всегда активна
**Решение:**
- Проверьте функцию `updateRejectSubmitBtn()`
- Убедитесь, что она устанавливает `disabled` на основе `rejectionReasonField.value.trim()`
- Проверьте обработчик `input` события для `rejectionReasonField`

### Проблема 4: История не записывается
**Решение:**
- Проверьте, что функция `addHistory()` вызывается
- Убедитесь, что `SCRIPT_URL` установлен правильно
- Проверьте лист `History` в Google Sheets (должны быть новые строки)

### Проблема 5: Отклоненная карточка исчезла вместо того, чтобы стать серой
**Решение:**
- Проверьте логику в `renderBoard()` — отклоненные платежи должны быть в `grouped.draft`
- Убедитесь, что статус "rejected" не фильтруется
- Проверьте, что класс `rejected` применён (в DevTools)

---

## ✨ Что должно работать

✅ **Согласование:**
- Кнопка ✓ видна только для draft платежей
- Переводит платёж в "approved"
- Карточка переходит во вторую колонку
- История обновляется

✅ **Отклонение:**
- Кнопка ✗ видна только для draft платежей
- Открывает поп-ап с textarea
- Причина обязательна (кнопка заблокирована если пусто)
- Переводит платёж в "rejected"
- Карточка остаётся в первой колонке и становится серой
- История обновляется

✅ **Распределение по колонкам:**
- draft + rejected → Первая колонка
- approved → Вторая колонка
- placed → Третья колонка
- paid → Четвёртая колонка (только текущая неделя)

---

## 🚀 Готово к следующему этапу!

После успешной проверки можно приступать к:
- Drag-and-drop для перемещения между колонками
- Фильтры и поиск по платежам
- Экспорт и импорт данных
