# Самопроверка: Шаг 6 - Групповые операции

## ✅ Проверлист реализации

### HTML компоненты

#### Чекбоксы на карточках
- [x] Чекбокс присутствует в шаблоне карточки
- [x] Атрибут `class="card-checkbox"`
- [x] Событие `change` вызывает `toggleSelection()`

#### Кнопки "Выбрать все"
- [x] Кнопка в каждом `.column-header`
- [x] Атрибут `data-column="draft|approved|placed|paid"`
- [x] Иконка ☑️ (или другая визуальная индикация)
- [x] Класс `column-select-all`

#### Плавающая панель
- [x] Элемент `#floatingPanel` существует
- [x] Содержит `.floating-panel-info` с количеством и суммой
- [x] Содержит `.floating-panel-actions` с кнопками
- [x] Начально скрыта: `style="display: none"`

#### Кнопки на панели
- [x] `#approveSelectedBtn` - согласование
- [x] `#placedSelectedBtn` - отправка в банк (НОВОЕ)
- [x] `#paidSelectedBtn` - отметить как оплачено (НОВОЕ)
- [x] `#rejectSelectedBtn` - отклонение
- [x] `#deleteSelectedBtn` - удаление
- [x] `#cancelSelectedBtn` - отмена

#### Информация на панели
- [x] `#selectedCount` - количество выбранных
- [x] `#selectedSum` - сумма выбранных (НОВОЕ)

---

### CSS стили

#### Заголовки колонок
```css
✅ .column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

✅ .column-title {
  flex: 1;
}

✅ .column-count {
  /* правильный стиль, flex-shrink: 0 */
}

✅ .column-select-all {
  padding, border, border-radius, cursor
  transition: all 0.2s ease
  flex-shrink: 0
  
  &:hover {
    background-color: var(--primary-light)
    border-color: var(--primary-color)
  }
}
```

#### Плавающая панель
```css
✅ .floating-panel {
  position: fixed
  bottom: 0
  z-index: 200
  animation: slideUp
}

✅ .floating-panel-content {
  display: flex
  justify-content: space-between
  gap: 24px
}

✅ .floating-panel-info {
  display: flex
  gap: 24px
}

✅ .selected-count {
  font-size: 14px
  white-space: nowrap
}

✅ .selected-sum {
  font-size: 14px
  font-weight: 600
  color: var(--success-color)       ← ЗЕЛЁНЫЙ
  background-color: rgba(76, 175, 80, 0.1)
  padding: 4px 12px
  border-radius: 4px
  white-space: nowrap
}

✅ .floating-panel-actions {
  display: flex
  gap: 8px
  flex-wrap: wrap
}
```

---

### JavaScript логика

#### DOM элементы
```javascript
✅ const selectedSumElement = document.getElementById("selectedSum");
✅ const placedSelectedBtn = document.getElementById("placedSelectedBtn");
✅ const paidSelectedBtn = document.getElementById("paidSelectedBtn");
```

#### Состояние
```javascript
✅ state = {
  payments: [],
  selectedPayments: new Set(),  // ← используется Set для O(1) поиска
  rejectingPaymentId: null
}
```

#### Обработчики событий (setupEventListeners)
```javascript
✅ cancelSelectedBtn.addEventListener("click", clearSelection);
✅ approveSelectedBtn.addEventListener("click", () => batchUpdateSelected("approved"));
✅ placedSelectedBtn.addEventListener("click", () => batchUpdateSelected("placed"));  // НОВОЕ
✅ paidSelectedBtn.addEventListener("click", () => batchUpdateSelected("paid"));      // НОВОЕ
✅ rejectSelectedBtn.addEventListener("click", () => batchUpdateSelected("rejected"));
✅ deleteSelectedBtn.addEventListener("click", () => deleteSelected());

✅ document.querySelectorAll(".column-select-all").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const column = e.currentTarget.dataset.column;
    selectAllInColumn(column);
  });
});
```

#### Функция выделения платежа
```javascript
✅ function toggleSelection(paymentId, selected) {
  if (selected) {
    state.selectedPayments.add(paymentId);
  } else {
    state.selectedPayments.delete(paymentId);
  }
  updateFloatingPanel();
}
```

#### Функция очистки выделения
```javascript
✅ function clearSelection() {
  state.selectedPayments.clear();
  document.querySelectorAll(".card-checkbox").forEach(cb => cb.checked = false);
  updateFloatingPanel();
}
```

#### Функция выбора всех в колонке
```javascript
✅ function selectAllInColumn(columnStatus) {
  const columnElement = document.getElementById(`column-${columnStatus}`);
  const checkboxes = columnElement.querySelectorAll(".card-checkbox");
  
  checkboxes.forEach(checkbox => {
    const card = checkbox.closest(".payment-card");
    const paymentId = card.dataset.id;
    
    state.selectedPayments.add(paymentId);
    checkbox.checked = true;
  });
  
  updateFloatingPanel();
}
```

Проверяет:
- ✅ Находит правильную колонку по ID
- ✅ Находит все чекбоксы в колонке
- ✅ Для каждого добавляет ID в Set
- ✅ Отмечает чекбокс
- ✅ Вызывает updateFloatingPanel()

#### Функция обновления панели с СУММОЙ
```javascript
✅ function updateFloatingPanel() {
  const count = state.selectedPayments.size;
  
  if (count > 0) {
    floatingPanel.style.display = "flex";
    selectedCountElement.textContent = `${count} ${getPlural(...)}`;
    
    // КРИТИЧНО: расчет суммы
    let sum = 0;
    state.payments.forEach(payment => {
      if (state.selectedPayments.has(payment.id)) {
        sum += parseFloat(payment.amount) || 0;
      }
    });
    
    selectedSumElement.textContent = `Сумма: ${formatMoney(sum)}`;
  } else {
    floatingPanel.style.display = "none";
  }
}
```

Проверяет:
- ✅ Показывает панель только если count > 0
- ✅ Считает сумму правильно (parseFloat + Number преобразование)
- ✅ Форматирует сумму с форматированием денег
- ✅ Использует getPlural() для правильного склонения

#### Функция массового обновления статуса
```javascript
✅ async function batchUpdateSelected(status) {
  if (state.selectedPayments.size === 0) return;
  
  const ids = Array.from(state.selectedPayments);
  const payload = {
    action: "batchUpdate",
    ids,
    status
  };
  
  try {
    showSpinner(true);
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error(...);
    
    // КРИТИЧНО: добавление истории для КАЖДОГО платежа
    for (const payment of state.payments) {
      if (ids.includes(payment.id)) {
        const oldStatus = payment.status;
        payment.status = status;
        payment.updated_at = new Date().toISOString();
        
        // Запись в историю
        await addHistory({
          payment_id: payment.id,
          action: "batch_update",
          old_value: oldStatus,
          new_value: status,
          user: "system"
        });
      }
    }
    
    clearSelection();
    renderBoard();
    showNotification(`Обновлено ${ids.length} платежей`, "success");
  } catch (error) {
    console.error("Ошибка при массовом обновлении:", error);
    showNotification("Ошибка при обновлении платежей", "error");
  } finally {
    showSpinner(false);
  }
}
```

Проверяет:
- ✅ Проверяет size === 0 и ничего не делает
- ✅ Преобразует Set в Array через Array.from()
- ✅ Отправляет POST запрос с action="batchUpdate"
- ✅ Обновляет статус локально для каждого платежа
- ✅ ВЫЗЫВАЕТ addHistory() для каждого платежа (важно!)
- ✅ Выполняет clearSelection() после успеха
- ✅ Перерисовывает доску через renderBoard()
- ✅ Обработка ошибок

#### Функция удаления нескольких платежей
```javascript
✅ async function deleteSelected() {
  if (state.selectedPayments.size === 0) return;
  
  if (!confirm(`Удалить ${state.selectedPayments.size} платежей?`)) {
    return;
  }
  
  await batchUpdateSelected("deleted");
}
```

#### Функция правильного склонения
```javascript
✅ function getPlural(count, one, two, five) {
  let n = Math.abs(count) % 100;
  let n1 = n % 10;
  if (n > 10 && n < 20) return five;
  if (n1 > 1 && n1 < 5) return two;
  if (n1 === 1) return one;
  return five;
}

// Тесты:
getPlural(1, "выбран", "выбрана", "выбрано") === "выбран"     ✓
getPlural(2, "выбран", "выбрана", "выбрано") === "выбрана"    ✓
getPlural(5, "выбран", "выбрана", "выбрано") === "выбрано"    ✓
getPlural(21, "выбран", "выбрана", "выбрано") === "выбран"    ✓
getPlural(105, "выбран", "выбрана", "выбрано") === "выбрано"  ✓
```

---

## 🔍 Критические проверки

### 1. Сумма считается правильно?
```javascript
// Правильно:
let sum = 0;
state.payments.forEach(payment => {
  if (state.selectedPayments.has(payment.id)) {
    sum += parseFloat(payment.amount) || 0;
  }
});

// Неправильно:
let sum = 0;
const selected = state.payments.filter(p => state.selectedPayments.has(p.id));
selected.forEach(p => sum += p.amount);  // если amount — строка, будет конкатенация
```

### 2. История добавляется для каждого платежа?
```javascript
// Правильно: async функция вызывается для каждого в цикле
for (const payment of state.payments) {
  if (ids.includes(payment.id)) {
    // ... обновить ...
    await addHistory({ ... });  // один раз для каждого
  }
}

// Неправильно: функция вызывается один раз для всех
await addHistory({ ids: ids, ... });  // история будет одна на всех
```

### 3. Выбор всех в колонке учитывает только видимые платежи?
```javascript
// Правильно: берет чекбоксы ИЗ КОЛОНКИ (только видимые там)
const columnElement = document.getElementById(`column-${columnStatus}`);
const checkboxes = columnElement.querySelectorAll(".card-checkbox");

// Неправильно: берет все чекбоксы из DOM (может быть неправильная колонка)
const checkboxes = document.querySelectorAll(".card-checkbox");
```

### 4. Сумма обновляется при отмене чекбокса?
```javascript
// Правильно: toggleSelection вызывает updateFloatingPanel()
function toggleSelection(paymentId, selected) {
  if (selected) {
    state.selectedPayments.add(paymentId);
  } else {
    state.selectedPayments.delete(paymentId);
  }
  updateFloatingPanel();  // ← пересчитает сумму
}
```

---

## 📊 Ожидаемый результат после успешной реализации

### До выбора платежей:
- Плавающая панель скрыта (display: none)
- Чекбоксы все пусты

### При выборе одного платежа на 50 000 ₽:
- Панель видна
- Текст: "1 выбран"
- Сумма: "Сумма: 50,000 ₽"

### При выборе трех платежей (100 000 + 50 000 + 25 000):
- Панель видна
- Текст: "3 выбраны" (правильное склонение!)
- Сумма: "Сумма: 175,000 ₽"

### При нажатии "Выбрать все" в колонке (допустим, 5 платежей):
- Все 5 чекбоксов отмечены
- Панель обновляется
- Сумма рассчена для всех 5

### При нажатии кнопки статуса:
- API запрос отправлен (action=batchUpdate)
- История добавляется для каждого платежа (5 строк в таблице History)
- Платежи перемещаются в новую колонку
- Панель исчезает
- Чекбоксы очищаются

---

## 🎯 Итоговая проверка агентом

Если ВСЕ пункты выше отмечены как ✅ — **реализация полная и готова к тестированию пользователем**.

Если какой-то пункт ❌ — **найдите и исправьте перед запуском тестирования**.
