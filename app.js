const storageKey = "money-ledger-state-v1";
const todayIso = localIsoDate();

const categories = {
  expense: ["餐饮", "超市", "交通", "住房", "购物", "健身", "学习", "娱乐", "医疗", "旅行", "其他"],
  income: ["工资", "奖金", "报销", "礼金", "投资收益", "其他收入"]
};

const categoryHints = [
  ["餐饮", ["饭", "午餐", "晚餐", "早餐", "火锅", "咖啡", "restaurant", "food", "meal", "mcdonald", "kfc"]],
  ["超市", ["rewe", "lidl", "aldi", "edeka", "supermarket", "groceries", "超市", "菜"]],
  ["交通", ["uber", "taxi", "地铁", "公交", "火车", "bahn", "交通", "train", "bus"]],
  ["住房", ["房租", "rent", "水电", "电费", "网费", "internet"]],
  ["购物", ["amazon", "淘宝", "京东", "购物", "衣服", "clothes"]],
  ["健身", ["gym", "fitness", "健身", "蛋白粉"]],
  ["学习", ["课程", "书", "book", "course", "udemy", "学习"]],
  ["娱乐", ["movie", "netflix", "游戏", "steam", "电影", "娱乐"]],
  ["医疗", ["药", "doctor", "医院", "医疗", "pharmacy"]],
  ["旅行", ["hotel", "flight", "airbnb", "旅行", "机票", "酒店"]]
];

const defaults = {
  settings: {
    baseCurrency: "EUR",
    eurCnyRate: 7.8,
    closeDay: 1,
    accounts: ["现金", "银行卡", "支付宝", "微信", "券商"]
  },
  templates: [],
  recurring: [],
  records: [],
  investments: [],
  archives: []
};

let state = loadState();
let currentView = "dashboard";
let activeType = "expense";

const els = {
  viewTitle: document.querySelector("#viewTitle"),
  monthExpense: document.querySelector("#monthExpense"),
  monthExpenseCny: document.querySelector("#monthExpenseCny"),
  monthIncome: document.querySelector("#monthIncome"),
  monthNet: document.querySelector("#monthNet"),
  monthSaved: document.querySelector("#monthSaved"),
  saveRateText: document.querySelector("#saveRateText"),
  categoryDonut: document.querySelector("#categoryDonut"),
  donutLegend: document.querySelector("#donutLegend"),
  templateButtons: document.querySelector("#templateButtons"),
  recurringPreview: document.querySelector("#recurringPreview"),
  periodLabel: document.querySelector("#periodLabel"),
  categoryBars: document.querySelector("#categoryBars"),
  recentRecords: document.querySelector("#recentRecords"),
  recordList: document.querySelector("#recordList"),
  investmentList: document.querySelector("#investmentList"),
  baseCurrency: document.querySelector("#baseCurrency"),
  entryForm: document.querySelector("#entryForm"),
  amount: document.querySelector("#amount"),
  currency: document.querySelector("#currency"),
  date: document.querySelector("#date"),
  merchant: document.querySelector("#merchant"),
  category: document.querySelector("#category"),
  account: document.querySelector("#account"),
  note: document.querySelector("#note"),
  smartText: document.querySelector("#smartText"),
  parseButton: document.querySelector("#parseButton"),
  search: document.querySelector("#search"),
  investmentForm: document.querySelector("#investmentForm"),
  assetName: document.querySelector("#assetName"),
  assetAction: document.querySelector("#assetAction"),
  assetDate: document.querySelector("#assetDate"),
  assetAmount: document.querySelector("#assetAmount"),
  assetCurrency: document.querySelector("#assetCurrency"),
  assetNote: document.querySelector("#assetNote"),
  eurCnyRate: document.querySelector("#eurCnyRate"),
  saveRate: document.querySelector("#saveRate"),
  closeDay: document.querySelector("#closeDay"),
  saveCloseDay: document.querySelector("#saveCloseDay"),
  accountList: document.querySelector("#accountList"),
  newAccount: document.querySelector("#newAccount"),
  addAccount: document.querySelector("#addAccount"),
  recurringForm: document.querySelector("#recurringForm"),
  recurringType: document.querySelector("#recurringType"),
  recurringDay: document.querySelector("#recurringDay"),
  recurringName: document.querySelector("#recurringName"),
  recurringAmount: document.querySelector("#recurringAmount"),
  recurringCurrency: document.querySelector("#recurringCurrency"),
  recurringCategory: document.querySelector("#recurringCategory"),
  recurringAccount: document.querySelector("#recurringAccount"),
  recurringList: document.querySelector("#recurringList"),
  templateForm: document.querySelector("#templateForm"),
  templateType: document.querySelector("#templateType"),
  templateName: document.querySelector("#templateName"),
  templateCurrency: document.querySelector("#templateCurrency"),
  templateCategory: document.querySelector("#templateCategory"),
  templateAccount: document.querySelector("#templateAccount"),
  templateList: document.querySelector("#templateList"),
  exportMonthXls: document.querySelector("#exportMonthXls"),
  archiveList: document.querySelector("#archiveList")
};

init();

function init() {
  registerServiceWorker();
  runMonthlyMaintenance();
  els.date.value = todayIso;
  els.assetDate.value = todayIso;
  els.baseCurrency.value = state.settings.baseCurrency;
  els.eurCnyRate.value = state.settings.eurCnyRate;
  els.closeDay.value = state.settings.closeDay;
  fillSelects();
  bindEvents();
  render();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll("[data-jump-add]").forEach((button) => {
    button.addEventListener("click", () => switchView("add"));
  });

  document.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      activeType = button.dataset.type;
      document.querySelectorAll("[data-type]").forEach((item) => item.classList.toggle("active", item === button));
      fillSelects();
    });
  });

  els.entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addRecord();
  });
  els.investmentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addInvestment();
  });
  els.parseButton.addEventListener("click", parseSmartText);
  els.search.addEventListener("input", renderRecords);
  els.baseCurrency.addEventListener("change", () => {
    state.settings.baseCurrency = els.baseCurrency.value;
    saveState();
    render();
  });
  els.saveRate.addEventListener("click", () => {
    state.settings.eurCnyRate = normalizeNumber(els.eurCnyRate.value) || state.settings.eurCnyRate;
    saveState();
    render();
  });
  els.saveCloseDay.addEventListener("click", () => {
    state.settings.closeDay = clampDay(els.closeDay.value);
    els.closeDay.value = state.settings.closeDay;
    runMonthlyMaintenance();
    saveState();
    render();
  });
  els.addAccount.addEventListener("click", addAccount);
  els.recurringForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addRecurring();
  });
  els.recurringType.addEventListener("change", fillRecurringCategory);
  els.templateForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTemplate();
  });
  els.templateType.addEventListener("change", fillTemplateCategory);
  document.querySelector("#exportJson").addEventListener("click", exportJson);
  document.querySelector("#exportCsv").addEventListener("click", exportCsv);
  els.exportMonthXls.addEventListener("click", () => exportMonthXls(currentMonthKey()));
  document.querySelector("#importJson").addEventListener("change", importJson);
}

function switchView(view) {
  currentView = view;
  const titles = { dashboard: "总览", add: "记一笔", records: "流水", invest: "投资", settings: "设置" };
  els.viewTitle.textContent = titles[view];
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  document.querySelector(`#${view}View`).classList.add("active");
  render();
}

function fillSelects() {
  els.category.innerHTML = categories[activeType].map((name) => `<option value="${name}">${name}</option>`).join("");
  els.account.innerHTML = state.settings.accounts.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  els.recurringAccount.innerHTML = state.settings.accounts.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  els.templateAccount.innerHTML = state.settings.accounts.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  fillRecurringCategory();
  fillTemplateCategory();
}

function fillRecurringCategory() {
  const type = els.recurringType?.value || "income";
  els.recurringCategory.innerHTML = categories[type].map((name) => `<option value="${name}">${name}</option>`).join("");
}

function fillTemplateCategory() {
  const type = els.templateType?.value || "expense";
  els.templateCategory.innerHTML = categories[type].map((name) => `<option value="${name}">${name}</option>`).join("");
}

function addRecord() {
  const amount = normalizeNumber(els.amount.value);
  if (!amount) return;
  state.records.push({
    id: crypto.randomUUID(),
    type: activeType,
    amount,
    currency: els.currency.value,
    date: els.date.value || todayIso,
    merchant: els.merchant.value.trim() || (activeType === "expense" ? "未命名支出" : "未命名收入"),
    category: els.category.value,
    account: els.account.value,
    note: els.note.value.trim()
  });
  saveState();
  els.entryForm.reset();
  els.date.value = todayIso;
  fillSelects();
  render();
  switchView("dashboard");
}

function addInvestment() {
  const amount = normalizeNumber(els.assetAmount.value);
  if (!amount) return;
  state.investments.push({
    id: crypto.randomUUID(),
    asset: els.assetName.value.trim(),
    action: els.assetAction.value,
    amount,
    currency: els.assetCurrency.value,
    date: els.assetDate.value || todayIso,
    note: els.assetNote.value.trim()
  });
  saveState();
  els.investmentForm.reset();
  els.assetDate.value = todayIso;
  render();
}

function addRecurring() {
  const amount = normalizeNumber(els.recurringAmount.value);
  const name = els.recurringName.value.trim();
  if (!amount || !name) return;
  state.recurring.push({
    id: crypto.randomUUID(),
    type: els.recurringType.value,
    name,
    amount,
    currency: els.recurringCurrency.value,
    day: clampDay(els.recurringDay.value),
    category: els.recurringCategory.value,
    account: els.recurringAccount.value
  });
  saveState();
  els.recurringForm.reset();
  els.recurringDay.value = 1;
  fillRecurringCategory();
  applyRecurringForMonth(currentMonthKey());
  saveState();
  render();
}

function addTemplate() {
  const name = els.templateName.value.trim();
  if (!name) return;
  state.templates.push({
    id: crypto.randomUUID(),
    type: els.templateType.value,
    name,
    currency: els.templateCurrency.value,
    category: els.templateCategory.value,
    account: els.templateAccount.value
  });
  saveState();
  els.templateForm.reset();
  fillTemplateCategory();
  render();
}

function applyTemplate(templateId) {
  const template = state.templates.find((item) => item.id === templateId);
  if (!template) return;
  activeType = template.type;
  document.querySelectorAll("[data-type]").forEach((button) => button.classList.toggle("active", button.dataset.type === activeType));
  fillSelects();
  els.amount.value = "";
  els.currency.value = template.currency;
  els.merchant.value = template.name;
  els.category.value = template.category;
  els.account.value = template.account;
  els.note.value = "";
  switchView("add");
  els.amount.focus();
}

function parseSmartText() {
  const raw = els.smartText.value.trim();
  if (!raw) return;
  const lower = raw.toLowerCase();
  const amountMatch = raw.match(/(?:€|eur|rmb|cny|¥|元)?\s*(-?\d+(?:[.,]\d{1,2})?)/i);
  const amount = amountMatch ? normalizeNumber(amountMatch[1]) : 0;
  const currency = /¥|元|rmb|cny|人民币/i.test(raw) ? "CNY" : "EUR";
  const isIncome = /income|工资|收入|salary|bonus|报销/i.test(raw);
  activeType = isIncome ? "income" : "expense";
  document.querySelectorAll("[data-type]").forEach((button) => button.classList.toggle("active", button.dataset.type === activeType));
  fillSelects();
  els.amount.value = amount ? String(amount) : "";
  els.currency.value = currency;
  const category = isIncome ? guessIncomeCategory(raw) : guessExpenseCategory(lower);
  els.merchant.value = guessMerchant(raw, amountMatch?.[0] || "", category);
  els.category.value = category;
  els.account.value = guessAccount(lower);
  els.note.value = raw;
  switchView("add");
}

function guessMerchant(raw, amountText, category) {
  return raw
    .replace(amountText, "")
    .replace(category, "")
    .replace(/eur|cny|rmb|€|¥|元|income|支出|收入/gi, "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ") || "未命名";
}

function guessAccount(lower) {
  if (lower.includes("支付宝") && state.settings.accounts.includes("支付宝")) return "支付宝";
  if (lower.includes("微信") && state.settings.accounts.includes("微信")) return "微信";
  if ((lower.includes("cash") || lower.includes("现金")) && state.settings.accounts.includes("现金")) return "现金";
  if ((lower.includes("broker") || lower.includes("券商")) && state.settings.accounts.includes("券商")) return "券商";
  return state.settings.accounts[0] || "";
}

function guessExpenseCategory(lower) {
  const match = categoryHints.find(([, words]) => words.some((word) => lower.includes(word)));
  return match ? match[0] : "其他";
}

function guessIncomeCategory(raw) {
  if (/工资|salary/i.test(raw)) return "工资";
  if (/bonus|奖金/i.test(raw)) return "奖金";
  if (/报销/i.test(raw)) return "报销";
  if (/dividend|分红/i.test(raw)) return "投资收益";
  return "其他收入";
}

function render() {
  renderDashboard();
  renderRecords();
  renderInvestments();
  renderSettings();
}

function renderDashboard() {
  const month = currentMonthKey();
  const base = state.settings.baseCurrency;
  const other = base === "EUR" ? "CNY" : "EUR";
  const monthly = state.records.filter((record) => record.date.startsWith(month));
  const expense = totalByType(monthly, "expense", base);
  const income = totalByType(monthly, "income", base);
  const net = income - expense;
  const saveRate = income > 0 ? Math.round((net / income) * 100) : 0;

  els.monthExpense.textContent = formatMoney(expense, base);
  els.monthExpenseCny.textContent = `≈ ${formatMoney(convert(expense, base, other), other)}`;
  els.monthIncome.textContent = formatMoney(income, base);
  els.monthNet.textContent = `净额 ${formatMoney(net, base)}`;
  els.monthSaved.textContent = formatMoney(net, base);
  els.saveRateText.textContent = `储蓄率 ${saveRate}%`;
  els.periodLabel.textContent = month;

  renderCategoryBars(monthly);
  renderIncomeDonut(income, expense, base);
  renderRecurringPreview();
  renderTemplateButtons();
  els.recentRecords.innerHTML = sortedRecords(state.records).slice(0, 5).map(renderRecordCard).join("") || empty("还没有流水。");
}

function renderCategoryBars(records) {
  const base = state.settings.baseCurrency;
  const colors = ["#0f5d63", "#1f8b68", "#b48726", "#c65445", "#586f9c", "#7a5b9a", "#4f7f52", "#a05f3d"];
  const grouped = new Map();
  records.filter((record) => record.type === "expense").forEach((record) => {
    grouped.set(record.category, (grouped.get(record.category) || 0) + convert(record.amount, record.currency, base));
  });
  const rows = [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 1;
  const total = rows.reduce((sum, [, amount]) => sum + amount, 0);
  els.categoryBars.innerHTML = rows.length
    ? rows.map(([category, amount], index) => `
      <div class="bar-row">
        <div class="bar-top">
          <span><i style="background:${colors[index % colors.length]}"></i>${escapeHtml(category)}</span>
          <strong>${formatMoney(amount, base)} · ${Math.round((amount / total) * 100)}%</strong>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width: ${Math.max(5, (amount / max) * 100)}%; background:${colors[index % colors.length]}"></div></div>
      </div>
    `).join("")
    : empty("本月还没有支出。");
}

function renderIncomeDonut(income, expense, base) {
  const spent = Math.max(0, expense);
  const remaining = Math.max(0, income - expense);
  const spentRate = income > 0 ? Math.min(100, Math.round((spent / income) * 100)) : 0;
  const remainingRate = income > 0 ? Math.max(0, 100 - spentRate) : 0;
  if (!income) {
    els.categoryDonut.style.background = "#e8ece6";
    els.categoryDonut.textContent = "无收入";
    els.donutLegend.innerHTML = empty("设置工资或记录收入后，这里会显示已花和剩余比例。");
    return;
  }

  els.categoryDonut.style.background = `conic-gradient(var(--red) 0deg ${spentRate * 3.6}deg, var(--green) ${spentRate * 3.6}deg 360deg)`;
  els.categoryDonut.textContent = `已花 ${spentRate}%`;
  els.donutLegend.innerHTML = `
    <div class="legend-row">
      <span><i style="background:var(--red)"></i>已花</span>
      <strong>${formatMoney(spent, base)} · ${spentRate}%</strong>
    </div>
    <div class="legend-row">
      <span><i style="background:var(--green)"></i>剩余 / 可存</span>
      <strong>${formatMoney(remaining, base)} · ${remainingRate}%</strong>
    </div>
  `;
}

function renderRecurringPreview() {
  const items = state.recurring.slice(0, 5);
  els.recurringPreview.innerHTML = items.length
    ? items.map((item) => `
      <article class="mini-card">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${item.type === "income" ? "收入" : "支出"} · 每月 ${item.day} 日 · ${escapeHtml(item.category)}</p>
        </div>
        <span class="amount ${item.type}">${item.type === "expense" ? "-" : "+"}${formatMoney(item.amount, item.currency)}</span>
      </article>
    `).join("")
    : empty("还没有固定收入或支出。");
}

function renderTemplateButtons() {
  els.templateButtons.innerHTML = state.templates.length
    ? state.templates.map((template) => `
      <button class="hint" data-template-id="${template.id}" type="button">
        ${escapeHtml(template.name)}
      </button>
    `).join("")
    : empty("在设置里添加常用超市、餐馆或收入模板。");
}

function renderRecords() {
  const query = els.search.value.trim().toLowerCase();
  const records = sortedRecords(state.records).filter((record) => {
    const text = `${record.merchant} ${record.category} ${record.account} ${record.note}`.toLowerCase();
    return !query || text.includes(query);
  });
  els.recordList.innerHTML = records.map(renderRecordCard).join("") || empty("没有匹配的流水。");
}

function renderInvestments() {
  const labels = { buy: "买入", sell: "卖出", dividend: "分红" };
  els.investmentList.innerHTML = [...state.investments]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((item) => `
      <article class="record-card">
        <div class="record-main">
          <div class="pill-row">
            <span class="pill">${escapeHtml(labels[item.action])}</span>
            <span class="pill">${escapeHtml(item.date)}</span>
          </div>
          <div class="record-title">${escapeHtml(item.asset)}</div>
          ${item.note ? `<div class="record-note">${escapeHtml(item.note)}</div>` : ""}
        </div>
        <div>
          <div class="amount ${item.action === "sell" || item.action === "dividend" ? "income" : "expense"}">${formatMoney(item.amount, item.currency)}</div>
          <button data-delete-investment="${item.id}" type="button">删除</button>
        </div>
      </article>
    `).join("") || empty("还没有投资记录。");
}

function renderSettings() {
  els.accountList.innerHTML = state.settings.accounts.map((account) => `
    <div class="chip">
      <span>${escapeHtml(account)}</span>
      <button data-delete-account="${escapeHtml(account)}" type="button">删除</button>
    </div>
  `).join("");
  els.recurringList.innerHTML = state.recurring.map((item) => `
    <div class="chip tall-chip">
      <span>${escapeHtml(item.name)} · 每月 ${item.day} 日 · ${item.type === "income" ? "收入" : "支出"} · ${formatMoney(item.amount, item.currency)}</span>
      <button data-delete-recurring="${item.id}" type="button">删除</button>
    </div>
  `).join("") || empty("还没有固定项。");
  els.templateList.innerHTML = state.templates.map((template) => `
    <div class="chip tall-chip">
      <span>${escapeHtml(template.name)} · ${template.type === "income" ? "收入" : "支出"} · ${escapeHtml(template.category)} · ${escapeHtml(template.currency)}</span>
      <button data-delete-template="${template.id}" type="button">删除</button>
    </div>
  `).join("") || empty("还没有模板。");
  els.archiveList.innerHTML = state.archives.length
    ? [...state.archives].sort((a, b) => b.month.localeCompare(a.month)).map((archive) => `
      <div class="chip tall-chip">
        <span>${escapeHtml(archive.month)} · 收入 ${formatMoney(archive.summary.income, "EUR")} · 支出 ${formatMoney(archive.summary.expense, "EUR")} · 结余 ${formatMoney(archive.summary.net, "EUR")}</span>
        <button data-export-archive="${archive.month}" type="button">导出</button>
      </div>
    `).join("")
    : empty("还没有月度归档。");
}

function renderRecordCard(record) {
  const signed = record.type === "expense" ? "-" : "+";
  const base = state.settings.baseCurrency;
  const converted = record.currency === base ? "" : `<div class="record-meta">≈ ${formatMoney(convert(record.amount, record.currency, base), base)}</div>`;
  return `
    <article class="record-card">
      <div class="record-main">
        <div class="pill-row">
          <span class="pill">${escapeHtml(record.date)}</span>
          <span class="pill">${escapeHtml(record.category)}</span>
          <span class="pill">${escapeHtml(record.account)}</span>
        </div>
        <div class="record-title">${escapeHtml(record.merchant)}</div>
        ${record.note ? `<div class="record-note">${escapeHtml(record.note)}</div>` : ""}
      </div>
      <div>
        <div class="amount ${record.type}">${signed}${formatMoney(record.amount, record.currency)}</div>
        ${converted}
        <button data-delete-record="${record.id}" type="button">删除</button>
      </div>
    </article>
  `;
}

document.addEventListener("click", (event) => {
  const recordButton = event.target.closest("[data-delete-record]");
  const investmentButton = event.target.closest("[data-delete-investment]");
  const accountButton = event.target.closest("[data-delete-account]");
  const recurringButton = event.target.closest("[data-delete-recurring]");
  const templateButton = event.target.closest("[data-delete-template]");
  const templateApplyButton = event.target.closest("[data-template-id]");
  const archiveButton = event.target.closest("[data-export-archive]");
  if (recordButton) {
    state.records = state.records.filter((record) => record.id !== recordButton.dataset.deleteRecord);
  }
  if (investmentButton) {
    state.investments = state.investments.filter((item) => item.id !== investmentButton.dataset.deleteInvestment);
  }
  if (accountButton) {
    state.settings.accounts = state.settings.accounts.filter((account) => account !== accountButton.dataset.deleteAccount);
    fillSelects();
  }
  if (recurringButton) {
    state.recurring = state.recurring.filter((item) => item.id !== recurringButton.dataset.deleteRecurring);
  }
  if (templateButton) {
    state.templates = state.templates.filter((item) => item.id !== templateButton.dataset.deleteTemplate);
  }
  if (templateApplyButton) {
    applyTemplate(templateApplyButton.dataset.templateId);
    return;
  }
  if (archiveButton) {
    exportMonthXls(archiveButton.dataset.exportArchive);
    return;
  }
  if (recordButton || investmentButton || accountButton || recurringButton || templateButton) {
    saveState();
    render();
  }
});

function addAccount() {
  const account = els.newAccount.value.trim();
  if (!account || state.settings.accounts.includes(account)) return;
  state.settings.accounts.push(account);
  els.newAccount.value = "";
  fillSelects();
  saveState();
  render();
}

function runMonthlyMaintenance() {
  applyRecurringForMonth(currentMonthKey());
  archivePreviousMonthIfNeeded();
  saveState();
}

function applyRecurringForMonth(month) {
  state.recurring.forEach((item) => {
    const existing = state.records.some((record) => record.recurringId === item.id && record.recurringMonth === month);
    if (existing) return;
    state.records.push({
      id: crypto.randomUUID(),
      type: item.type,
      amount: item.amount,
      currency: item.currency,
      date: `${month}-${String(item.day).padStart(2, "0")}`,
      merchant: item.name,
      category: item.category,
      account: item.account,
      note: "固定收支自动生成",
      recurringId: item.id,
      recurringMonth: month
    });
  });
}

function archivePreviousMonthIfNeeded() {
  const today = new Date();
  const closeDay = Number(state.settings.closeDay) || 1;
  if (today.getDate() < closeDay) return;
  const previous = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const month = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
  if (state.archives.some((archive) => archive.month === month)) return;
  const records = state.records.filter((record) => record.date.startsWith(month));
  if (!records.length) return;
  state.archives.push(buildArchive(month, records));
}

function buildArchive(month, records) {
  const income = totalByType(records, "income", "EUR");
  const expense = totalByType(records, "expense", "EUR");
  const byCategory = {};
  records.filter((record) => record.type === "expense").forEach((record) => {
    byCategory[record.category] = (byCategory[record.category] || 0) + convert(record.amount, record.currency, "EUR");
  });
  return {
    month,
    createdAt: new Date().toISOString(),
    summary: {
      income,
      expense,
      net: income - expense,
      saveRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
      byCategory
    }
  };
}

function totalByType(records, type, currency) {
  return records
    .filter((record) => record.type === type)
    .reduce((sum, record) => sum + convert(record.amount, record.currency, currency), 0);
}

function convert(amount, from, to) {
  if (from === to) return amount;
  const rate = Number(state.settings.eurCnyRate) || 7.8;
  if (from === "EUR" && to === "CNY") return amount * rate;
  if (from === "CNY" && to === "EUR") return amount / rate;
  return amount;
}

function sortedRecords(records) {
  return [...records].sort((a, b) => b.date.localeCompare(a.date));
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatNumber(amount) {
  return Number(amount || 0).toFixed(2);
}

function normalizeNumber(value) {
  return Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentMonthKey() {
  return todayIso.slice(0, 7);
}

function clampDay(value) {
  const day = Math.round(normalizeNumber(value) || 1);
  return Math.max(1, Math.min(28, day));
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return structuredClone(defaults);
  try {
    const parsed = JSON.parse(raw);
    return {
      settings: { ...defaults.settings, ...(parsed.settings || {}) },
      records: parsed.records || [],
      investments: parsed.investments || [],
      templates: parsed.templates || [],
      recurring: parsed.recurring || [],
      archives: parsed.archives || []
    };
  } catch {
    return structuredClone(defaults);
  }
}

function exportJson() {
  download("money-ledger-backup.json", JSON.stringify(state, null, 2), "application/json");
}

function exportCsv() {
  const header = ["type", "date", "amount", "currency", "merchant", "category", "account", "note"];
  const rows = state.records.map((record) => header.map((key) => csvCell(record[key])).join(","));
  download("money-ledger-records.csv", [header.join(","), ...rows].join("\n"), "text/csv");
}

function exportMonthXls(month) {
  const records = state.records.filter((record) => record.date.startsWith(month));
  const archive = state.archives.find((item) => item.month === month) || buildArchive(month, records);
  const categoryRows = Object.entries(archive.summary.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => `<tr><td>${escapeHtml(category)}</td><td>${formatNumber(amount)}</td></tr>`)
    .join("");
  const recordRows = records
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => `
      <tr>
        <td>${escapeHtml(record.date)}</td>
        <td>${record.type === "income" ? "收入" : "支出"}</td>
        <td>${escapeHtml(record.merchant)}</td>
        <td>${escapeHtml(record.category)}</td>
        <td>${escapeHtml(record.account)}</td>
        <td>${formatNumber(record.amount)}</td>
        <td>${escapeHtml(record.currency)}</td>
        <td>${formatNumber(convert(record.amount, record.currency, "EUR"))}</td>
        <td>${escapeHtml(record.note || "")}</td>
      </tr>
    `)
    .join("");
  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
          th, td { border: 1px solid #cfd7d1; padding: 8px; text-align: left; }
          th { background: #edf1ec; }
          .num { text-align: right; }
        </style>
      </head>
      <body>
        <h1>Money Ledger ${escapeHtml(month)} 月报</h1>
        <table>
          <tr><th>本月收入 EUR</th><th>本月支出 EUR</th><th>本月结余 EUR</th><th>储蓄率</th></tr>
          <tr>
            <td>${formatNumber(archive.summary.income)}</td>
            <td>${formatNumber(archive.summary.expense)}</td>
            <td>${formatNumber(archive.summary.net)}</td>
            <td>${archive.summary.saveRate}%</td>
          </tr>
        </table>
        <h2>分类支出</h2>
        <table>
          <tr><th>分类</th><th>金额 EUR</th></tr>
          ${categoryRows || "<tr><td colspan=\"2\">无支出</td></tr>"}
        </table>
        <h2>流水</h2>
        <table>
          <tr><th>日期</th><th>类型</th><th>商户/来源</th><th>分类</th><th>账户</th><th>原金额</th><th>币种</th><th>折算 EUR</th><th>备注</th></tr>
          ${recordRows || "<tr><td colspan=\"9\">无流水</td></tr>"}
        </table>
      </body>
    </html>
  `;
  download(`money-ledger-${month}.xls`, html, "application/vnd.ms-excel");
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const imported = JSON.parse(reader.result);
      state = {
        settings: { ...defaults.settings, ...(imported.settings || {}) },
        records: imported.records || [],
        investments: imported.investments || [],
        templates: imported.templates || [],
        recurring: imported.recurring || [],
        archives: imported.archives || []
      };
      saveState();
      fillSelects();
      render();
    } catch {
      alert("导入失败：JSON 文件格式不对。");
    }
  });
  reader.readAsText(file);
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function empty(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
