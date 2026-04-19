# Google Apps Script Web App для управления платежами

## 📋 Описание

Это бэкенд-приложение на базе Google Apps Script для управления платежами и историей изменений в Google Sheets.

**Основные функции:**
- ✅ Создание новых платежей (с автогенерацией UUID)
- ✅ Обновление отдельных платежей
- ✅ Массовое обновление нескольких платежей
- ✅ Получение списка всех платежей
- ✅ Логирование истории изменений
- ✅ Потокобезопасность для одновременной работы 2-3 пользователей

---

## 🏗️ Архитектура

### Структура данных

#### Лист "Payments" (Таблица платежей)

| Колонка | Назначение | Тип |
|---------|-----------|-----|
| A | id | UUID v4 |
| B | amount | Число |
| C | counterparty | Текст (контрагент) |
| D | due_date | Дата |
| E | purpose | Текст (назначение) |
| F | link | URL |
| G | priority | Текст (высокий/средний/низкий) |
| H | budget_article | Текст (статья бюджета) |
| I | status | Текст (draft/approved/rejected/paid) |
| J | approved | Булево |
| K | rejection_reason | Текст |
| L | created_at | ISO 8601 timestamp |
| M | updated_at | ISO 8601 timestamp |

#### Лист "History" (История изменений)

| Колонка | Назначение |
|---------|-----------|
| A | id |
| B | payment_id |
| C | action |
| D | old_value |
| E | new_value |
| F | user |
| G | timestamp |

---

## 🔌 API Endpoints

### GET запросы

#### `GET ?action=getAll`
Получает все платежи из листа Payments.

**Параметры:** нет

**Ответ:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 5000,
    "counterparty": "ООО Компания",
    "due_date": "2026-05-16",
    "purpose": "Платёж по счёту",
    "link": "",
    "priority": "high",
    "budget_article": "1.2.3",
    "status": "draft",
    "approved": false,
    "rejection_reason": "",
    "created_at": "2026-04-16T10:30:00.000Z",
    "updated_at": "2026-04-16T10:30:00.000Z"
  }
]
```

---

### POST запросы

#### `POST` с `action=create`
Создаёт новый платёж с автогенерируемым UUID.

**Body:**
```json
{
  "action": "create",
  "amount": 5000,
  "counterparty": "ООО Тестовая компания",
  "due_date": "2026-05-16",
  "purpose": "Тестовый платёж",
  "link": "https://example.com",
  "priority": "high",
  "budget_article": "1.2.3",
  "status": "draft",
  "approved": false
}
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

#### `POST` с `action=update`
Обновляет существующий платёж.

**Body:**
```json
{
  "action": "update",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "approved",
  "approved": true
}
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

#### `POST` с `action=batchUpdate`
Массовое обновление нескольких платежей.

**Body:**
```json
{
  "action": "batchUpdate",
  "ids": ["id1", "id2", "id3"],
  "status": "rejected"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "updated": ["id1", "id2"],
    "notFound": ["id3"],
    "message": "Batch update completed"
  }
}
```

---

#### `POST` с `action=addHistory`
Добавляет запись в лист History.

**Body:**
```json
{
  "action": "addHistory",
  "payment_id": "550e8400-e29b-41d4-a716-446655440000",
  "action_type": "status_changed",
  "old_value": "draft",
  "new_value": "approved",
  "user": "user@example.com"
}
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

## 🔒 Безопасность

### Средства защиты
1. **Lock Service (LockService)** — предотвращает одновременные записи
   - Timeout: 30 секунд
   - Автоматическое освобождение lock после операции

2. **UUID v4 генерация** — уникальные идентификаторы через `Utilities.getUuid()`

3. **JSON-only responses** — все ответы в формате JSON

4. **Error handling** — все ошибки возвращаются в структурированном формате

### Рекомендации
- Развёртывайте Web App с `Anyone` доступом только при необходимости
- Рассмотрите добавление аутентификации на фронтенде
- Регулярно проверяйте логи в истории изменений

---

## 📁 Файлы проекта

- **Code.gs** — основной код приложения
- **DEPLOYMENT.md** — инструкции по развёртыванию
- **API_TESTING.md** — примеры тестирования API
- **README.md** — этот файл

---

## 🚀 Быстрый старт

1. Создайте Google Sheets таблицу
2. Добавьте листы "Payments" и "History"
3. Добавьте заголовки (см. DEPLOYMENT.md)
4. Откройте Apps Script редактор
5. Скопируйте Code.gs в редактор
6. Разверните как Web App
7. Скопируйте URL
8. Тестируйте API (см. API_TESTING.md)

---

## 📞 Поддержка

При возникновении вопросов:
- Проверьте наличие листов "Payments" и "History"
- Убедитесь в наличии заголовков в первой строке
- Проверьте консоль Apps Script на ошибки (Ctrl+Enter)
- Используйте примеры из API_TESTING.md для диагностики
