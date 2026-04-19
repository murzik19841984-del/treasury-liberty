# API тестирование

## Готовые примеры для тестирования

Замените `YOUR_WEB_APP_URL` на реальный URL вашего Web App.

### 1. Получить все платежи

```bash
curl "YOUR_WEB_APP_URL?action=getAll"
```

**Ответ при пустой таблице:**
```json
[]
```

---

### 2. Создать новый платёж

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "amount": 150000,
    "counterparty": "ООО Поставщик А",
    "due_date": "2026-06-01",
    "purpose": "Оплата за услуги",
    "link": "https://example.com/invoice/123",
    "priority": "high",
    "budget_article": "4.1.2",
    "status": "draft"
  }'
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Record created successfully"
  }
}
```

---

### 3. Обновить существующий платёж

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update",
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "approved",
    "approved": true
  }'
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Record updated successfully"
  }
}
```

---

### 4. Массовое обновление (batchUpdate)

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "batchUpdate",
    "ids": [
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001"
    ],
    "status": "rejected"
  }'
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "updated": [
      "550e8400-e29b-41d4-a716-446655440000",
      "550e8400-e29b-41d4-a716-446655440001"
    ],
    "notFound": [],
    "message": "Batch update completed"
  }
}
```

---

### 5. Добавить запись в историю

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "addHistory",
    "payment_id": "550e8400-e29b-41d4-a716-446655440000",
    "action_type": "status_changed",
    "old_value": "draft",
    "new_value": "approved",
    "user": "user@example.com"
  }'
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "message": "History record added successfully"
  }
}
```

---

## Проверка безопасности (Self-check)

- [x] Используется `Utilities.getUuid()` для генерации уникальных ID
- [x] `LockService.getScriptLock()` установлен на waitLock с 30 сек timeout
- [x] Все ответы возвращаются в `ContentService.MimeType.JSON`
- [x] Обработка ошибок в формате JSON
- [x] Защита от одновременных запросов через Lock Service

---

## Тестирование через Postman

1. Импортируйте коллекцию или создайте запросы вручную
2. Установите переменную: `{{base_url}}` = ваш URL Web App
3. Проверьте каждый endpoint
