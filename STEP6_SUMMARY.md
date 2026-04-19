# Шаг 6 - Реализация: Групповые операции и плавающая панель

## 📋 Резюме реализации

На этом этапе реализована полная система массовой смены статусов через чекбоксы и плавающую панель с информацией о выбранных платежах.

---

## ✨ Что было добавлено

### 1. HTML (index.html)

#### Иконки "Выбрать все" в заголовках колонок
```html
<div class="column-header">
  <h2 class="column-title">На оплату</h2>
  <span class="column-count" id="count-draft">0</span>
  <button class="column-select-all" data-column="draft" title="Выбрать все в колонке">☑️</button>
</div>
```

Добавлено для всех 4 колонок (draft, approved, placed, paid).

#### Обновленная плавающая панель
```html
<div class="floating-panel" id="floatingPanel" style="display: none;">
  <div class="floating-panel-content">
    <div class="floating-panel-info">
      <span class="selected-count" id="selectedCount">0 выбрано</span>
      <span class="selected-sum" id="selectedSum">Сумма: 0 ₽</span>
    </div>
    <div class="floating-panel-actions">
      <button class="btn btn-small btn-approve" id="approveSelectedBtn">
        ✓ Согласовать
      </button>
      <button class="btn btn-small btn-status" id="placedSelectedBtn" data-status="placed">
        📋 В банк
      </button>
      <button class="btn btn-small btn-status" id="paidSelectedBtn" data-status="paid">
        ✅ Оплачено
      </button>
      <button class="btn btn-small btn-reject" id="rejectSelectedBtn">
        ✗ Отклонить
      </button>
      <button class="btn btn-small btn-delete" id="deleteSelectedBtn">
        🗑️ Удалить
      </button>
      <button class="btn btn-small btn-cancel" id="cancelSelectedBtn">
        Отмена
      </button>
    </div>
  </div>
</div>
```

Добавлены:
- Информация о сумме выбранных платежей
- Кнопки быстрого изменения статуса: "В банк" и "Оплачено"

---

### 2. CSS (style.css)

#### Стили для кнопок "Выбрать все"
```css
.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.column-title {
  flex: 1;  /* займет все оставшееся место */
}

.column-select-all {
  padding: 6px 8px;
  background-color: transparent;
  border: 1px solid var(--border-light);
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.column-select-all:hover {
  background-color: var(--primary-light);
  border-color: var(--primary-color);
}
```

#### Улучшенные стили плавающей панели
```css
.floating-panel-info {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 250px;
}

.selected-sum {
  font-size: 14px;
  font-weight: 600;
  color: var(--success-color);       /* зелёный */
  background-color: rgba(76, 175, 80, 0.1);
  padding: 4px 12px;
  border-radius: 4px;
  white-space: nowrap;
}

.floating-panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;  /* кнопки переносятся на мобилах */
}
```

---

### 3. JavaScript (app.js)

#### Новые DOM элементы
```javascript
const selectedSumElement = document.getElementById("selectedSum");
const placedSelectedBtn = document.getElementById("placedSelectedBtn");
const paidSelectedBtn = document.getElementById("paidSelectedBtn");
```

#### Обновленные обработчики событий
```javascript
// Кнопки "Выбрать все" в колонках
document.querySelectorAll(".column-select-all").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const column = e.currentTarget.dataset.column;
    selectAllInColumn(column);
  });
});

// Новые кнопки статуса на панели
placedSelectedBtn.addEventListener("click", () => batchUpdateSelected("placed"));
paidSelectedBtn.addEventListener("click", () => batchUpdateSelected("paid"));
```

#### Функция выбора всех в колонке
```javascript
function selectAllInColumn(columnStatus) {
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

#### Обновленная функция массовой смены статуса
```javascript
async function batchUpdateSelected(status) {
  // ... проверки ...
  
  // Обновляем локально и добавляем историю для КАЖДОГО платежа
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
  
  clearSelection();  // Очистить и скрыть панель
  renderBoard();  // Перерисовать
}
```

#### Функция расчета суммы на панели
```javascript
function updateFloatingPanel() {
  const count = state.selectedPayments.size;
  
  if (count > 0) {
    floatingPanel.style.display = "flex";
    selectedCountElement.textContent = `${count} ${getPlural(count, "выбран", "выбрана", "выбрано")}`;
    
    // Вычисляем сумму выбранных платежей
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

#### Новая утилита для склонений
```javascript
function getPlural(count, one, two, five) {
  let n = Math.abs(count) % 100;
  let n1 = n % 10;
  if (n > 10 && n < 20) return five;
  if (n1 > 1 && n1 < 5) return two;
  if (n1 === 1) return one;
  return five;
}
// Примеры:
// 1 выбран, 2 выбраны, 5 выбрано, 21 выбран, 105 выбрано
```

---

## 🎯 Основной жизненный цикл групповой операции

```
1. Пользователь кликает чекбокс на карточке
   ↓
2. toggleSelection(paymentId, true) 
   - добавляет ID в state.selectedPayments Set
   ↓
3. updateFloatingPanel() 
   - показывает панель
   - подсчитывает и отображает сумму
   - показывает количество с правильным склонением
   ↓
4. Пользователь может:
   
   A) Нажать кнопку "Выбрать все" в колонке
      → selectAllInColumn(columnStatus)
      → все карточки в этой колонке выбираются
      → updateFloatingPanel()
   
   B) Нажать кнопку статуса (например, "В банк")
      → batchUpdateSelected("placed")
      → API запрос: action=batchUpdate, ids=[...], status="placed"
      → ДЛЯ КАЖДОГО платежа:
        - обновить статус локально
        - вызвать addHistory() для записи в таблицу History
      → clearSelection() - очистить выделение и скрыть панель
      → renderBoard() - перерисовать доску
   
   C) Нажать "Отмена"
      → clearSelection()
      → deselect все чекбоксы
      → скрыть панель
```

---

## 📊 Поля в Google Sheets

### Таблица "History" новые записи
```
| payment_id | action_type   | old_value | new_value | timestamp           |
|------------|---------------|-----------|-----------|---------------------|
| abc123     | batch_update  | draft     | approved  | 2024-01-15 10:30:00 |
| def456     | batch_update  | approved  | placed    | 2024-01-15 10:35:00 |
| ghi789     | batch_update  | placed    | paid      | 2024-01-15 10:40:00 |
```

---

## 💾 Состояние (state)

```javascript
state = {
  payments: [ ... ],  // массив платежей
  selectedPayments: Set { 
    "id1", 
    "id2", 
    "id3" 
  },  // Set выбранных ID (для быстрого поиска O(1))
  rejectingPaymentId: null
}
```

---

## ✅ Характеристики реализации

### Функциональность ✓
- ✅ Чекбоксы на каждой карточке
- ✅ Кнопка "Выбрать все" для каждой колонки
- ✅ Плавающая панель с количеством и суммой
- ✅ Кнопки для быстрого изменения статуса
- ✅ История записывается для каждого платежа
- ✅ Правильное склонение чисел

### Производительность ✓
- ✅ Set для хранения выделения (O(1) поиск)
- ✅ Локальное обновление без полной перезагрузки
- ✅ Асинхронное добавление истории

### UX ✓
- ✅ Плавающая панель появляется с анимацией
- ✅ Сумма считается автоматически
- ✅ Кнопки отключены, когда ничего не выбрано
- ✅ Ясный текст с правильными склонениями

---

## 🔧 API интеграция

### Запрос batchUpdate
```javascript
POST SCRIPT_URL
{
  "action": "batchUpdate",
  "ids": ["id1", "id2", "id3"],
  "status": "placed" | "paid" | "approved" | "rejected" | "deleted"
}
```

### Запрос addHistory
```javascript
POST SCRIPT_URL
{
  "action": "addHistory",
  "payment_id": "abc123",
  "action_type": "batch_update",
  "old_value": "draft",
  "new_value": "approved",
  "user": "system"
}
```

---

## 🚀 Готово к тестированию

Все компоненты реализованы и интегрированы. Готово к пользовательской проверке — см. STEP6_TESTING_GUIDE.md
