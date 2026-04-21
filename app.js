/**
 * app.js - основной скрипт управления канбан-доской
 * Слой API и отрисовка карточек
 */

// ============================================================
// КОНФИГУРАЦИЯ
// ============================================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXIgk5NzFVim3VPaQ6bnlul6kH9N-Vd1erB35SQX2M52xhfOVwg6_CrayXkAfadZ3jNA/exec";

// ============================================================
// ЭЛЕМЕНТЫ DOM
// ============================================================

const spinner = document.getElementById("spinner");
const addBtn = document.getElementById("addBtn");
const refreshBtn = document.getElementById("refreshBtn");

const paymentModal = document.getElementById("paymentModal");
const modalTitle = document.getElementById("modalTitle");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const paymentForm = document.getElementById("paymentForm");
const formCancelBtn = document.getElementById("formCancelBtn");

const floatingPanel = document.getElementById("floatingPanel");
const selectedCountElement = document.getElementById("selectedCount");
const selectedSumElement = document.getElementById("selectedSum");
const approveSelectedBtn = document.getElementById("approveSelectedBtn");
const placedSelectedBtn = document.getElementById("placedSelectedBtn");
const paidSelectedBtn = document.getElementById("paidSelectedBtn");
const rejectSelectedBtn = document.getElementById("rejectSelectedBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const cancelSelectedBtn = document.getElementById("cancelSelectedBtn");

const filterCounterpartyInput = document.getElementById("filterCounterparty");
const filterPrioritySelect = document.getElementById("filterPriority");
const filterOverdueCheckbox = document.getElementById("filterOverdue");
const filterDateFromInput = document.getElementById("filterDateFrom");
const filterDateToInput = document.getElementById("filterDateTo");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

// DOM элементы для формы
const submitBtn = document.getElementById("submitBtn");
const deleteBtn = document.getElementById("deleteBtn");
const paymentTemplate = document.getElementById("paymentCardTemplate");

// DOM элементы для confirm-модала
const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
const confirmTitle = document.getElementById("confirmTitle");
const confirmOkBtn = document.getElementById("confirmOkBtn");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");

// DOM элементы для поп-апа отклонения
const rejectModal = document.getElementById("rejectModal");
const rejectForm = document.getElementById("rejectForm");
const rejectionReasonField = document.getElementById("rejectionReason");
const rejectSubmitBtn = document.getElementById("rejectSubmitBtn");
const rejectCancelBtn = document.getElementById("rejectCancelBtn");
const rejectModalCloseBtn = document.getElementById("rejectModalCloseBtn");

// ============================================================
// СОСТОЯНИЕ
// ============================================================

const state = {
  payments: [],
  selectedPayments: new Set(),
  rejectingPaymentId: null, // ID платежа при отклонении
  activeTab: "draft",       // активная вкладка на мобильном
  filters: {
    query: "",
    priorities: [],
    overdueOnly: false,
    dateFrom: "",
    dateTo: ""
  },
  sortDirections: {
    draft: null,
    approved: null,
    placed: null,
    paid: null
  }
};

// Резолвер для confirm-модала
let confirmResolve = null;

// Компатибильность с кодом ниже
const allPayments = state.payments;
const selectedPayments = state.selectedPayments;

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  setupTabBar();
  setupFilterToggle();
  setupDragDrop();
  fetchAllPayments();
});

// ============================================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================

function setupEventListeners() {
  // Кнопки шапки
  addBtn.addEventListener("click", openAddModal);
  refreshBtn.addEventListener("click", fetchAllPayments);

  // Модальное окно
  modalCloseBtn.addEventListener("click", closeModal);
  formCancelBtn.addEventListener("click", closeModal);
  paymentForm.addEventListener("submit", handleFormSubmit);
  deleteBtn.addEventListener("click", handleDelete);

  // Плавающая панель
  cancelSelectedBtn.addEventListener("click", clearSelection);
  approveSelectedBtn.addEventListener("click", () => batchUpdateSelected("approved"));
  placedSelectedBtn.addEventListener("click", () => batchUpdateSelected("placed"));
  paidSelectedBtn.addEventListener("click", () => batchUpdateSelected("paid"));
  rejectSelectedBtn.addEventListener("click", () => batchUpdateSelected("rejected"));
  deleteSelectedBtn.addEventListener("click", () => deleteSelected());

  // Фильтры
  filterCounterpartyInput.addEventListener("input", (e) => {
    state.filters.query = e.target.value.trim();
    renderBoard();
  });

  filterPrioritySelect.addEventListener("change", () => {
    state.filters.priorities = Array.from(filterPrioritySelect.selectedOptions).map(opt => opt.value);
    renderBoard();
  });

  filterOverdueCheckbox.addEventListener("change", (e) => {
    state.filters.overdueOnly = e.target.checked;
    renderBoard();
  });

  filterDateFromInput.addEventListener("change", (e) => {
    state.filters.dateFrom = e.target.value;
    renderBoard();
  });

  filterDateToInput.addEventListener("change", (e) => {
    state.filters.dateTo = e.target.value;
    renderBoard();
  });

  clearFiltersBtn.addEventListener("click", () => {
    filterCounterpartyInput.value = "";
    filterPrioritySelect.selectedIndex = -1;
    filterOverdueCheckbox.checked = false;
    filterDateFromInput.value = "";
    filterDateToInput.value = "";
    state.filters = {
      query: "",
      priorities: [],
      overdueOnly: false,
      dateFrom: "",
      dateTo: ""
    };
    renderBoard();
  });

  // Кнопки сортировки в заголовках колонок
  document.querySelectorAll(".column-sort").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const column = e.currentTarget.dataset.column;
      toggleSort(column, e.currentTarget);
    });
  });

  // Кнопки "Выбрать все" в колонках
  document.querySelectorAll(".column-select-all").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const column = e.currentTarget.dataset.column;
      selectAllInColumn(column);
    });
  });

  // Поп-ап отклонения
  rejectModalCloseBtn.addEventListener("click", closeRejectModal);
  rejectCancelBtn.addEventListener("click", closeRejectModal);
  rejectForm.addEventListener("submit", handleRejectSubmit);
  rejectionReasonField.addEventListener("input", updateRejectSubmitBtn);

  // Confirm-модал
  confirmOkBtn.addEventListener("click", () => closeConfirmModal(true));
  confirmCancelBtn.addEventListener("click", () => closeConfirmModal(false));
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirmModal(false);
  });
}

// ============================================================
// ЗАГРУЗКА ДАННЫХ
// ============================================================

/**
 * Загружает все платежи с Apps Script Web App
 */
async function fetchAllPayments() {
  if (!SCRIPT_URL) {
    console.warn("SCRIPT_URL не установлен!");
    showNotification("Ошибка: не указан URL Web App", "error");
    return;
  }

  showSpinner(true);

  try {
    const response = await fetch(`${SCRIPT_URL}?action=getAll`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    state.payments = data;
    renderBoard();
    showNotification(`Загружено ${data.length} платежей`, "success");
  } catch (error) {
    console.error("Ошибка при загрузке платежей:", error);
    showNotification("Ошибка при загрузке данных", "error");
  } finally {
    showSpinner(false);
  }
}

// ============================================================
// ОТРИСОВКА
// ============================================================

/**
 * Отрисовывает канбан-доску: распределяет платежи по колонкам и применяет стили
 */
function renderBoard() {
  // Очищаем все колонки
  const columns = document.querySelectorAll(".column-content");
  columns.forEach(col => col.innerHTML = "");

  const grouped = {
    draft: [],
    approved: [],
    placed: [],
    paid: []
  };

  const filteredPayments = applyFilters(state.payments);

  filteredPayments.forEach(payment => {
    const status = payment.status || "draft";

    if (status === "rejected") {
      grouped.draft.push(payment);
    } else if (grouped[status]) {
      grouped[status].push(payment);
    }
  });

  Object.entries(grouped).forEach(([status, payments]) => {
    const columnEl = document.getElementById(`column-${status}`);
    const countEl = document.getElementById(`count-${status}`);

    if (!columnEl) return;

    const sortDirection = state.sortDirections[status];
    if (sortDirection) {
      payments.sort((a, b) => compareDueDate(a, b, sortDirection));
    }

    countEl.textContent = payments.length;

    const tabCountEl = document.getElementById(`tab-count-${status}`);
    if (tabCountEl) tabCountEl.textContent = payments.length;

    payments.forEach(payment => {
      const cardEl = createPaymentCard(payment);
      columnEl.appendChild(cardEl);
    });
  });

  updateFloatingPanel();
}

/**
 * Применяет фильтры к массиву платежей
 */
function applyFilters(payments) {
  const { query, priorities, overdueOnly, dateFrom, dateTo } = state.filters;
  const normalizedQuery = query.trim().toLowerCase();
  const fromDate = dateFrom ? new Date(dateFrom) : null;
  const toDate = dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return payments.filter(payment => {
    const status = payment.status || "draft";
    const dueDate = payment.due_date ? new Date(payment.due_date) : null;

    if (status === "paid" && !isPaymentInCurrentWeek(payment)) {
      return false;
    }

    if (normalizedQuery) {
      const counterparty = (payment.counterparty || "").toLowerCase();
      if (!counterparty.includes(normalizedQuery)) {
        return false;
      }
    }

    if (priorities.length > 0 && !priorities.includes(payment.priority)) {
      return false;
    }

    if (overdueOnly) {
      if (!dueDate) {
        return false;
      }
      if (dueDate >= today) {
        return false;
      }
    }

    if (fromDate) {
      if (!dueDate || dueDate < fromDate) {
        return false;
      }
    }

    if (toDate) {
      if (!dueDate || dueDate > toDate) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Переключает сортировку колонки по due_date
 */
function toggleSort(column, button) {
  const currentDirection = state.sortDirections[column];
  const nextDirection = currentDirection === "asc" ? "desc" : "asc";

  Object.keys(state.sortDirections).forEach(key => {
    state.sortDirections[key] = null;
  });
  state.sortDirections[column] = nextDirection;

  document.querySelectorAll(".column-sort").forEach(btn => {
    const isActive = btn.dataset.column === column;
    btn.classList.toggle("active", isActive);
    btn.textContent = isActive ? (nextDirection === "asc" ? "↑" : "↓") : "⇅";
  });

  renderBoard();
}

/**
 * Сравнение due_date для сортировки
 */
function compareDueDate(a, b, direction) {
  const aValue = a.due_date ? new Date(a.due_date).getTime() : null;
  const bValue = b.due_date ? new Date(b.due_date).getTime() : null;

  if (aValue === null && bValue === null) return 0;
  if (aValue === null) return 1;
  if (bValue === null) return -1;

  return direction === "asc" ? aValue - bValue : bValue - aValue;
}

/**
 * Создаёт элемент карточки платежа
 */
function createPaymentCard(payment) {
  const clone = paymentTemplate.content.cloneNode(true);
  const card = clone.querySelector(".payment-card");

  // Устанавливаем data-id
  card.dataset.id = payment.id;

  // Drag & drop (только на десктопе — touch не триггерит drag-события)
  if (!("ontouchstart" in window)) {
    card.draggable = true;
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", payment.id);
      e.dataTransfer.effectAllowed = "move";
      // Задержка нужна, чтобы браузер успел сделать drag-снимок до изменения стиля
      setTimeout(() => card.classList.add("dragging"), 0);
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });
  }

  // Заполняем данные (formatMoney уже включает ₽, скрываем отдельный span)
  clone.querySelector(".amount-value").textContent = formatMoney(payment.amount);
  clone.querySelector(".currency").style.display = "none";
  clone.querySelector(".card-counterparty").textContent = payment.counterparty;
  clone.querySelector(".card-purpose").textContent = payment.purpose || "—";
  clone.querySelector(".card-budget-article").textContent = payment.budget_article
    ? `Статья: ${payment.budget_article}`
    : "";

  // Ссылка на счёт
  const cardLink = clone.querySelector(".card-link");
  if (payment.link) {
    cardLink.href = payment.link;
    cardLink.style.display = "block";
    cardLink.addEventListener("click", (e) => e.stopPropagation());
  }

  // Бейдж приоритета
  const badge = clone.querySelector(".priority-badge");
  badge.textContent = getPriorityLabel(payment.priority);
  badge.className = `priority-badge ${payment.priority || "medium"}`;

  // Даты
  const dueDate = clone.querySelector(".due-date");
  if (payment.due_date) {
    dueDate.textContent = `📅 ${formatDate(payment.due_date)}`;
  }

  const createdDate = clone.querySelector(".created-date");
  if (payment.created_at) {
    createdDate.textContent = `🕐 ${formatDate(payment.created_at)}`;
  }

  // Применяем цветовые стили по приоритету
  const colorClass = getCardColorClass(payment);
  if (colorClass) {
    card.classList.add(colorClass);
  }

  // Скрытые поля
  clone.querySelector(".card-id").textContent = payment.id;
  clone.querySelector(".card-status").textContent = payment.status;
  clone.querySelector(".card-approved").textContent = payment.approved;
  clone.querySelector(".card-rejection-reason").textContent = payment.rejection_reason;

  // Обработчики событий
  const approveBtn = clone.querySelector(".approve-btn");
  const rejectBtn = clone.querySelector(".reject-btn");
  const editBtn = clone.querySelector(".edit-btn");
  const deleteBtn = clone.querySelector(".delete-btn");
  const checkbox = clone.querySelector(".card-checkbox");

  // Показываем/скрываем кнопки согласования/отклонения
  if (payment.status === "draft") {
    approveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleApprove(payment.id);
    });
    rejectBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openRejectModal(payment.id);
    });
  } else {
    approveBtn.classList.add("hidden");
    rejectBtn.classList.add("hidden");
  }

  // Стопаем всплытие на интерактивных элементах, чтобы клик по карточке не срабатывал лишний раз
  editBtn.addEventListener("click", (e) => { e.stopPropagation(); openEditModal(payment); });
  deleteBtn.addEventListener("click", (e) => { e.stopPropagation(); deletePayment(payment.id); });
  checkbox.addEventListener("change", () => toggleSelection(payment.id, checkbox.checked));
  checkbox.addEventListener("click", (e) => e.stopPropagation());

  // Клик по телу карточки открывает редактирование (только если не выделяется текст)
  card.addEventListener("click", () => {
    if (window.getSelection().toString()) return;
    openEditModal(payment);
  });

  return clone;
}

/**
 * Определяет цветовой класс карточки на основе статуса и дедлайна
 * Приоритет: rejected > overdue > deadline-soon > (нет класса)
 */
function getCardColorClass(payment) {
  // Приоритет 1: Отклонена
  if (payment.status === "rejected") {
    return "rejected";
  }

  // Если нет дедлайна - стандартный стиль
  if (!payment.due_date) {
    return null;
  }

  const now = new Date();
  const dueDate = new Date(payment.due_date);
  const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

  // Приоритет 2: Просрочена
  if (daysUntilDue < 0) {
    return "overdue";
  }

  // Приоритет 3: Скоро дедлайн (в ближайшие 3 дня)
  if (daysUntilDue <= 3) {
    return "deadline-soon";
  }

  return null;
}

// ============================================================
// МОДАЛЬНОЕ ОКНО
// ============================================================

/**
 * Открывает модальное окно для добавления нового платежа
 */
function openAddModal() {
  modalTitle.textContent = "Добавить новый платёж";
  paymentForm.reset();
  paymentForm.dataset.paymentId = "";
  
  // Скрываем кнопку удаления при создании
  deleteBtn.style.display = "none";
  submitBtn.textContent = "Создать";
  
  paymentModal.style.display = "flex";
  document.body.classList.add("no-scroll");
  document.getElementById("counterparty").focus();
}

/**
 * Открывает модальное окно для редактирования платежа
 */
function openEditModal(payment) {
  modalTitle.textContent = "Редактировать платёж";
  paymentForm.dataset.paymentId = payment.id;

  document.getElementById("amount").value = payment.amount || "";
  document.getElementById("counterparty").value = payment.counterparty || "";
  document.getElementById("dueDate").value = payment.due_date || "";
  document.getElementById("purpose").value = payment.purpose || "";
  document.getElementById("link").value = payment.link || "";
  document.getElementById("priority").value = payment.priority || "medium";
  document.getElementById("budgetArticle").value = payment.budget_article || "";

  // Показываем кнопку удаления при редактировании
  deleteBtn.style.display = "block";
  submitBtn.textContent = "Обновить";
  
  paymentModal.style.display = "flex";
  document.body.classList.add("no-scroll");
}

/**
 * Закрывает модальное окно
 */
function closeModal() {
  paymentModal.style.display = "none";
  document.body.classList.remove("no-scroll");
  paymentForm.reset();
  paymentForm.dataset.paymentId = "";
  submitBtn.disabled = false;
  deleteBtn.disabled = false;
}

// ============================================================
// СОГЛАСОВАНИЕ И ОТКЛОНЕНИЕ
// ============================================================

/**
 * Открывает поп-ап отклонения платежа
 */
function openRejectModal(paymentId) {
  state.rejectingPaymentId = paymentId;
  rejectForm.reset();
  rejectionReasonField.focus();
  updateRejectSubmitBtn();
  rejectModal.style.display = "flex";
  document.body.classList.add("no-scroll");
}

/**
 * Закрывает поп-ап отклонения
 */
function closeRejectModal() {
  rejectModal.style.display = "none";
  document.body.classList.remove("no-scroll");
  state.rejectingPaymentId = null;
  rejectForm.reset();
}

/**
 * Обновляет состояние кнопки "Отклонить" (активна только если поле не пусто)
 */
function updateRejectSubmitBtn() {
  const reason = rejectionReasonField.value.trim();
  rejectSubmitBtn.disabled = !reason;
}

/**
 * Обработчик согласования платежа
 */
async function handleApprove(paymentId) {
  if (!await showConfirm("Вы уверены, что хотите согласовать этот платёж?", {
    okText: "Согласовать", okClass: "btn-approve"
  })) {
    return;
  }

  try {
    showSpinner(true);

    // Обновляем на бэкенде
    const result = await updatePayment(paymentId, {
      status: "approved",
      approved: true
    });

    if (result.success) {
      // Обновляем локально
      const payment = state.payments.find(p => p.id === paymentId);
      if (payment) {
        payment.status = "approved";
        payment.approved = true;
        payment.updated_at = new Date().toISOString();
      }

      // Добавляем запись в историю
      await addHistory({
        payment_id: paymentId,
        action: "approved",
        old_value: "draft",
        new_value: "approved",
        user: "user"
      });

      renderBoard();
      showNotification("Платёж согласован", "success");
    }
  } catch (error) {
    console.error("Ошибка при согласовании:", error);
    showNotification("Ошибка при согласовании платежа", "error");
  } finally {
    showSpinner(false);
  }
}

/**
 * Обработчик отправки формы отклонения
 */
async function handleRejectSubmit(e) {
  e.preventDefault();

  const paymentId = state.rejectingPaymentId;
  const rejectionReason = rejectionReasonField.value.trim();

  if (!rejectionReason) {
    showNotification("Укажите причину отклонения", "error");
    return;
  }

  rejectSubmitBtn.disabled = true;

  try {
    showSpinner(true);

    // Обновляем на бэкенде
    const result = await updatePayment(paymentId, {
      status: "rejected",
      approved: false,
      rejection_reason: rejectionReason
    });

    if (result.success) {
      // Обновляем локально
      const payment = state.payments.find(p => p.id === paymentId);
      if (payment) {
        payment.status = "rejected";
        payment.approved = false;
        payment.rejection_reason = rejectionReason;
        payment.updated_at = new Date().toISOString();
      }

      // Добавляем запись в историю
      await addHistory({
        payment_id: paymentId,
        action: "rejected",
        old_value: "draft",
        new_value: "rejected",
        user: "user"
      });

      renderBoard();
      closeRejectModal();
      showNotification("Платёж отклонен", "success");
    }
  } catch (error) {
    console.error("Ошибка при отклонении:", error);
    showNotification("Ошибка при отклонении платежа", "error");
  } finally {
    showSpinner(false);
    rejectSubmitBtn.disabled = false;
  }
}

/**
 * Валидирует данные формы
 */
function validatePaymentForm() {
  const amount = parseFloat(document.getElementById("amount").value);
  const counterparty = document.getElementById("counterparty").value.trim();

  if (!counterparty) {
    showNotification("Поле 'Контрагент' обязательно", "error");
    return false;
  }

  if (!amount || amount <= 0) {
    showNotification("Сумма должна быть больше 0", "error");
    return false;
  }

  return true;
}

/**
 * Обработчик отправки формы
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Валидация
  if (!validatePaymentForm()) {
    return;
  }

  const paymentId = paymentForm.dataset.paymentId;
  const formData = {
    amount: parseFloat(document.getElementById("amount").value),
    counterparty: document.getElementById("counterparty").value.trim(),
    due_date: document.getElementById("dueDate").value,
    purpose: document.getElementById("purpose").value.trim(),
    link: document.getElementById("link").value.trim(),
    priority: document.getElementById("priority").value,
    budget_article: document.getElementById("budgetArticle").value.trim()
  };

  // Блокируем кнопки
  submitBtn.disabled = true;
  deleteBtn.disabled = true;

  try {
    if (paymentId) {
      // Обновление
      const result = await updatePayment(paymentId, formData);
      if (result.success) {
        // Обновляем карточку локально
        updatePaymentLocally(paymentId, formData);
        showNotification("Платёж успешно обновлён", "success");
      }
    } else {
      // Создание
      const result = await createPayment(formData);
      if (result.success) {
        // Добавляем новый платёж локально
        const newPayment = {
          id: result.data.id,
          ...formData,
          status: "draft",
          approved: false,
          rejection_reason: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        state.payments.push(newPayment);
        showNotification("Платёж успешно создан", "success");
      }
    }
    
    closeModal();
    renderBoard(); // Перерисовываем доску локально
  } catch (error) {
    console.error("Ошибка при сохранении:", error);
    showNotification("Ошибка при сохранении платежа", "error");
  } finally {
    submitBtn.disabled = false;
    deleteBtn.disabled = false;
  }
}

/**
 * Обновляет платёж в локальном состоянии
 */
function updatePaymentLocally(paymentId, newData) {
  const payment = state.payments.find(p => p.id === paymentId);
  if (payment) {
    Object.assign(payment, newData);
    payment.updated_at = new Date().toISOString();
  }
}

/**
 * Обработчик удаления платежа
 */
async function handleDelete() {
  const paymentId = paymentForm.dataset.paymentId;
  if (!paymentId) return;

  if (!await showConfirm("Вы уверены, что хотите удалить этот платёж?", {
    okText: "Удалить", okClass: "btn-delete"
  })) {
    return;
  }

  deleteBtn.disabled = true;
  submitBtn.disabled = true;

  try {
    const result = await deletePayment(paymentId);
    if (result.success || result.data) {
      // Удаляем из локального состояния
      state.payments = state.payments.filter(p => p.id !== paymentId);
      showNotification("Платёж успешно удалён", "success");
      closeModal();
      renderBoard();
    }
  } catch (error) {
    console.error("Ошибка при удалении:", error);
    showNotification("Ошибка при удалении платежа", "error");
  } finally {
    deleteBtn.disabled = false;
    submitBtn.disabled = false;
  }
}

// ============================================================
// API ОПЕРАЦИИ
// ============================================================

async function createPayment(data) {
  const payload = {
    action: "create",
    ...data
  };

  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function updatePayment(id, data) {
  const payload = {
    action: "update",
    id,
    ...data
  };

  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function deletePayment(id) {
  // Используем update для пометки статуса "deleted"
  // или можно использовать обычное удаление через API
  const payload = {
    action: "update",
    id,
    status: "deleted"
  };

  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * Добавляет запись в историю изменений
 */
async function addHistory(data) {
  const payload = {
    action: "addHistory",
    payment_id: data.payment_id,
    action_type: data.action,
    old_value: data.old_value,
    new_value: data.new_value,
    user: data.user || "system"
  };

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    console.error("Ошибка при добавлении в историю:", error);
    // Не показываем ошибку пользователю, это некритичная операция
  }
}

async function batchUpdateSelected(status) {
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
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Обновляем локально и параллельно пишем историю
    const historyPromises = [];
    for (const payment of state.payments) {
      if (ids.includes(payment.id)) {
        const oldStatus = payment.status;
        payment.status = status;
        payment.updated_at = new Date().toISOString();

        historyPromises.push(addHistory({
          payment_id: payment.id,
          action: "batch_update",
          old_value: oldStatus,
          new_value: status,
          user: "system"
        }));
      }
    }
    await Promise.all(historyPromises);

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

async function deleteSelected() {
  if (state.selectedPayments.size === 0) return;
  
  if (!await showConfirm(`Удалить выбранные платежи (${state.selectedPayments.size} шт.)?`, {
    okText: "Удалить", okClass: "btn-delete"
  })) {
    return;
  }

  await batchUpdateSelected("deleted");
}

// ============================================================
// ВЫДЕЛЕНИЕ
// ============================================================

function toggleSelection(paymentId, selected) {
  if (selected) {
    state.selectedPayments.add(paymentId);
  } else {
    state.selectedPayments.delete(paymentId);
  }
  updateFloatingPanel();
}

function clearSelection() {
  state.selectedPayments.clear();
  document.querySelectorAll(".card-checkbox").forEach(cb => cb.checked = false);
  updateFloatingPanel();
}

/**
 * Выбирает все платежи видимой колонки
 */
function selectAllInColumn(columnStatus) {
  // Получаем все карточки в текущей колонке
  const columnElement = document.getElementById(`column-${columnStatus}`);
  const checkboxes = columnElement.querySelectorAll(".card-checkbox");
  
  checkboxes.forEach(checkbox => {
    const card = checkbox.closest(".payment-card");
    const paymentId = card.dataset.id;
    
    // Добавляем в выделение
    state.selectedPayments.add(paymentId);
    checkbox.checked = true;
  });
  
  updateFloatingPanel();
}

function updateFloatingPanel() {
  const count = state.selectedPayments.size;
  
  if (count > 0) {
    floatingPanel.style.display = "flex";
    selectedCountElement.textContent = `${count} ${getPlural(count, "выбран", "выбраны", "выбрано")}`;
    
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

// ============================================================
// УТИЛИТЫ
// ============================================================

/**
 * Проверяет, находится ли платёж в текущей календарной неделе
 * Неделя: понедельник-воскресенье
 */
function isPaymentInCurrentWeek(payment) {
  if (!payment.due_date) return true;

  const dueDate = new Date(payment.due_date);
  const now = new Date();

  // Получаем понедельник текущей недели
  const currentDate = new Date(now);
  const day = currentDate.getDay();
  const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Правильное вычисление понедельника
  const monday = new Date(currentDate.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  // Получаем воскресенье текущей недели
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // Проверяем, находится ли дата платежа в пределах текущей недели
  return dueDate >= monday && dueDate <= sunday;
}

function showSpinner(show) {
  spinner.style.display = show ? "flex" : "none";
}

function showNotification(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Анимация появления
  requestAnimationFrame(() => toast.classList.add("toast-visible"));

  // Автоудаление через 3 секунды
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 3000);
}

function formatNumber(num) {
  if (!num) return "0";
  return new Intl.NumberFormat("ru-RU").format(num);
}

/**
 * Форматирует сумму денег с разделителями и знаком ₽
 */
function formatMoney(amount) {
  const num = parseFloat(amount) || 0;
  const formatted = new Intl.NumberFormat("ru-RU").format(Math.round(num));
  return `${formatted} ₽`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

function getPriorityLabel(priority) {
  const labels = {
    high: "🔴 Высокий",
    medium: "🟠 Средний",
    low: "🟢 Низкий"
  };
  return labels[priority] || labels.medium;
}

/**
 * Возвращает правильное склонение числительного и слова
 * Пример: getPlural(1, "выбран", "выбраны", "выбрано") → "выбран"
 *         getPlural(2, "выбран", "выбраны", "выбрано") → "выбраны"
 *         getPlural(5, "выбран", "выбраны", "выбрано") → "выбрано"
 */
function getPlural(count, one, two, five) {
  let n = Math.abs(count) % 100;
  let n1 = n % 10;
  if (n > 10 && n < 20) return five;
  if (n1 > 1 && n1 < 5) return two;
  if (n1 === 1) return one;
  return five;
}

// ============================================================
// DRAG & DROP
// ============================================================

function setupDragDrop() {
  if ("ontouchstart" in window) return; // только на десктопе

  document.querySelectorAll(".column-content").forEach(colContent => {
    colContent.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      colContent.classList.add("drag-over");
    });

    colContent.addEventListener("dragleave", (e) => {
      // Игнорируем событие, если курсор перешёл на дочерний элемент
      if (!colContent.contains(e.relatedTarget)) {
        colContent.classList.remove("drag-over");
      }
    });

    colContent.addEventListener("drop", async (e) => {
      e.preventDefault();
      colContent.classList.remove("drag-over");

      const paymentId = e.dataTransfer.getData("text/plain");
      const newStatus = colContent.closest(".column").dataset.status;
      if (!paymentId || !newStatus) return;

      const payment = state.payments.find(p => p.id === paymentId);
      if (!payment || payment.status === newStatus) return;

      await dragMovePayment(payment, newStatus);
    });
  });
}

async function dragMovePayment(payment, newStatus) {
  const oldStatus = payment.status;

  try {
    showSpinner(true);
    const updateData = { status: newStatus };
    if (newStatus === "approved") updateData.approved = true;

    const result = await updatePayment(payment.id, updateData);
    if (result.success) {
      Object.assign(payment, updateData);
      payment.updated_at = new Date().toISOString();

      await addHistory({
        payment_id: payment.id,
        action: "drag_move",
        old_value: oldStatus,
        new_value: newStatus,
        user: "user"
      });

      renderBoard();
      showNotification(`Перемещено в «${getStatusLabel(newStatus)}»`, "success");
    }
  } catch (error) {
    console.error("Ошибка при перемещении:", error);
    showNotification("Ошибка при перемещении платежа", "error");
  } finally {
    showSpinner(false);
  }
}

function getStatusLabel(status) {
  const labels = {
    draft: "На оплату",
    approved: "Согласовано",
    placed: "В банке",
    paid: "Оплачено"
  };
  return labels[status] || status;
}

// ============================================================
// CONFIRM-МОДАЛ
// ============================================================

/**
 * Показывает кастомный confirm-диалог вместо window.confirm().
 * Возвращает Promise<boolean>.
 */
function showConfirm(message, { okText = "Подтвердить", okClass = "btn-primary", title = "Подтверждение" } = {}) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmOkBtn.textContent = okText;
  confirmOkBtn.className = `btn ${okClass}`;
  confirmModal.style.display = "flex";
  document.body.classList.add("no-scroll");
  confirmOkBtn.focus();

  return new Promise(resolve => {
    confirmResolve = resolve;
  });
}

function closeConfirmModal(result) {
  confirmModal.style.display = "none";
  document.body.classList.remove("no-scroll");
  if (confirmResolve) {
    confirmResolve(result);
    confirmResolve = null;
  }
}

// ============================================================
// МОБИЛЬНАЯ НАВИГАЦИЯ: ВКЛАДКИ
// ============================================================

function setupTabBar() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
  // Инициализируем активную вкладку
  switchTab(state.activeTab);
}

function switchTab(tab) {
  state.activeTab = tab;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  document.querySelectorAll(".column").forEach(col => {
    col.classList.toggle("tab-active", col.dataset.status === tab);
  });
}

// ============================================================
// МОБИЛЬНАЯ НАВИГАЦИЯ: ФИЛЬТРЫ
// ============================================================

function setupFilterToggle() {
  const btn = document.getElementById("filterToggleBtn");
  const panel = document.getElementById("filterPanel");
  if (!btn || !panel) return;

  btn.addEventListener("click", () => {
    panel.classList.toggle("filters-open");
  });
}

// ============================================================
// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА ПО ESCAPE
// ============================================================

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (confirmModal.style.display === "flex") closeConfirmModal(false);
  else if (paymentModal.style.display === "flex") closeModal();
});

// ============================================================
// ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА ПО КЛИКУ ВНЕ
// ============================================================

paymentModal.addEventListener("click", (e) => {
  if (e.target === paymentModal) {
    closeModal();
  }
});
