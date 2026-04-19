# Инструкция по развёртыванию Google Apps Script

## Шаг 1: Создание Google Sheets таблицы

1. Создайте новую Google Sheets таблицу (https://sheets.google.com)
2. Переименуйте первый лист в **"Payments"**
3. Добавьте второй лист **"History"**

## Шаг 2: Подготовка листа "Payments"

В листе **Payments** добавьте следующие заголовки в первую строку (A1:M1):

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| id | amount | counterparty | due_date | purpose | link | priority | budget_article | status | approved | rejection_reason | created_at | updated_at |

## Шаг 3: Подготовка листа "History"

В листе **History** добавьте заголовки в первую строку:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| id | payment_id | action | old_value | new_value | user | timestamp |

## Шаг 4: Добавление `Code.gs` в Apps Script

1. Откройте вашу Google Sheets таблицу
2. Перейдите в **Расширения» → «Apps Script»**
3. Скопируйте весь код из `Code.gs` в редактор
4. Сохраните проект (Ctrl+S)

## Шаг 5: Развёртывание как Web App

1. В Apps Script нажмите на кнопку **"Развернуть"** (Deploy)
2. Выберите **"Новое развёртывание"** (New deployment)
3. Выберите тип: **"Web app"**
4. Установите параметры:
   - **Execute as:** ваш аккаунт Google
   - **Who has access:** Anyone
5. Нажмите **"Deploy"**
6. Скопируйте URL Web App (выглядит так: `https://script.google.com/macros/d/{SCRIPT_ID}/userweb?...`)

## Шаг 6: Тестирование

### Получение всех платежей (GET)
```
https://ваш-url?action=getAll
```

Ожидаемый результат:
```json
[]
```
или (если уже есть данные)
```json
[
  {
    "id": "uuid-value",
    "amount": 1000,
    "counterparty": "ООО Компания",
    ...
  }
]
```

### Создание нового платежа (POST)
```bash
curl -X POST "https://ваш-url" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "amount": 5000,
    "counterparty": "ООО Тестовая компания",
    "due_date": "2026-05-16",
    "purpose": "Тестовый платёж",
    "priority": "high",
    "status": "draft"
  }'
```

Ожидаемый результат:
```json
{
  "success": true,
  "data": {
    "id": "generated-uuid",
    "message": "Record created successfully"
  }
}
```

## Проверка безопасности

✓ Используется `LockService.getScriptLock()` с timeout 30 секунд  
✓ UUID генерируется через `Utilities.getUuid()` для каждой новой записи  
✓ Все ответы в формате JSON  
✓ Защита от одновременного доступа 2-3 пользователей  
