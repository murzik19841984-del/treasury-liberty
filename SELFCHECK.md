# Самопроверка implementации (для агента)

## Проверлист компонентов app.js

### ✅ Конфигурация и состояние
- [x] `const SCRIPT_URL = ""`
- [x] `const state = { payments: [], selectedPayments: new Set() }`
- [x] Инициализация слушателей на `DOMContentLoaded`

### ✅ Загрузка данных
- [x] `async fetchAllPayments()` — GET запрос к SCRIPT_URL
- [x] Обработка `?action=getAll`
- [x] Сохранение в `state.payments`
- [x] Вызов `renderBoard()` после загрузки

### ✅ Отрисовка
- [x] `renderBoard()` — распределяет по статусам (draft, approved, placed, paid)
- [x] `createPaymentCard(payment)` — создаёт карточку из template
- [x] `getCardColorClass(payment)` — логика цветов с правильным приоритетом
- [x] `isPaymentInCurrentWeek(payment)` — архивация для "paid"

### ✅ Форматирование
- [x] `formatMoney(amount)` — денежный формат с разделителями
- [x] `formatDate(dateStr)` — дата в формате dd.mm.yyyy
- [x] `getPriorityLabel(priority)` — бейджи 🔴/🟠/🟢

### ✅ API операции
- [x] `createPayment(data)` — POST с action: "create"
- [x] `updatePayment(id, data)` — POST с action: "update"
- [x] `deletePayment(id)` — пометка как deleted
- [x] `batchUpdateSelected(status)` — POST с action: "batchUpdate"

### ✅ Управление выделением
- [x] `toggleSelection(paymentId, selected)` — добавление/удаление из state.selectedPayments
- [x] `clearSelection()` — сброс выделений
- [x] `updateFloatingPanel()` — показать/скрыть плавающую панель

---

## Проверка логики цветов

### Сценарий 1: Отклонена vs Просрочена
```javascript
const payment = { 
  status: "rejected", 
  due_date: "2026-03-01" // в прошлом
};
getCardColorClass(payment); // должен вернуть "rejected" (не "overdue"!)
// ✅ Правильно: rejected имеет приоритет
```

### Сценарий 2: Просрочена vs Скоро
```javascript
const payment = { 
  status: "approved", 
  due_date: "2026-04-20" // 4 дня от 16.04.2026
};
getCardColorClass(payment); // должен вернуть "deadline-soon" (не "overdue"!)
// ✅ Правильно: дни считаются корректно
```

### Сценарий 3: Стандартный
```javascript
const payment = { 
  status: "draft", 
  due_date: "2026-05-01" // далеко в будущем
};
getCardColorClass(payment); // должен вернуть null
// ✅ Правильно: нет класса = белый фон
```

---

## Проверка архивации

### Функция isPaymentInCurrentWeek

**Текущая дата:** 16 апреля 2026 (вторник)
**Текущая неделя:** 13 апреля (пн) - 19 апреля 2026 (вс)

#### Тест 1: В текущей неделе
```javascript
isPaymentInCurrentWeek({ due_date: "2026-04-15" }); // вторник той же недели
// ✅ true
```

#### Тест 2: Вне текущей недели
```javascript
isPaymentInCurrentWeek({ due_date: "2026-04-20" }); // понедельник следующей
// ✅ false
```

#### Тест 3: Граница (воскресенье)
```javascript
isPaymentInCurrentWeek({ due_date: "2026-04-19" }); // воскресенье
// ✅ true
```

---

## Проверка форматирования денег

### formatMoney()

```javascript
formatMoney(5000);      // → "5 000"
formatMoney(1000000);   // → "1 000 000"
formatMoney(150);       // → "150"
formatMoney(0);         // → "0 ₽"
formatMoney(null);      // → "0 ₽"
```

✅ Использует `Intl.NumberFormat("ru-RU")`

---

## Проверка API запросов

### createPayment
```javascript
await createPayment({
  amount: 5000,
  counterparty: "ООО Компания",
  ...
});

// POST payload:
// {
//   "action": "create",
//   "amount": 5000,
//   "counterparty": "ООО Компания",
//   ...
// }
```

### batchUpdateSelected
```javascript
await batchUpdateSelected("approved");

// POST payload:
// {
//   "action": "batchUpdate",
//   "ids": ["id1", "id2"],
//   "status": "approved"
// }
```

---

## Контрольный список распределения по колонкам

| Статус | Колонка | Усл. показа |
|--------|---------|-------------|
| draft | На оплату | Всегда |
| approved | Согласовано | Всегда |
| placed | Размещено в банке | Всегда |
| paid | Оплачено | `isPaymentInCurrentWeek() === true` |
| rejected | (нигде) | Остаётся в исходной колонке статуса |
| deleted | (нигде) | Не отображается (пропускается) |

✅ Платежи с `status: "paid"` в прошлых неделях архивируются

---

## Проверка кода на предмет ошибок

### Заменила
- ✅ `WEB_APP_URL` → `SCRIPT_URL` везде
- ✅ `loadPayments()` → `fetchAllPayments()` везде
- ✅ `allPayments` → `state.payments` везде где затронут state
- ✅ `selectedPayments` → `state.selectedPayments` везде
- ✅ `renderPayments()` → `renderBoard()`
- ✅ `applyCardStyles()` → `getCardColorClass()`
- ✅ `formatNumber()` → остаётся для совместимости, `formatMoney()` для денег

### Не заменила (для совместимости)
- `allPayments` и `selectedPayments` как aliases в начале файла для обратной совместимости в некоторых частях

---

## Final Test Checklist

Перед отправкой на проверку:
- [ ] Все SCRIPT_URL вместо WEB_APP_URL
- [ ] Все fetchAllPayments() вместо loadPayments()
- [ ] getCardColorClass() работает с правильным приоритетом
- [ ] formatMoney() добавляет знак ₽
- [ ] isPaymentInCurrentWeek() проверяет неделю правильно
- [ ] renderBoard() распределяет по всем 4 колонкам
- [ ] state.payments обновляется при загрузке
- [ ] Плавающая панель работает с state.selectedPayments
