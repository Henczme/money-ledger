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
    accounts: ["现金", "银行卡", "支付宝", "微信", "券商"]
  },
  records: [
    {
      id: crypto.randomUUID(),
      type: "expense",
      amount: 18.7,
      currency: "EUR",
      date: todayIso,
      merchant: "LIDL",
      category: "超市",
      account: "银行卡",
      note: "晚餐食材"
    },
    {
      id: crypto.randomUUID(),
      type: "expense",
      amount: 48,
      currency: "CNY",
      date: todayIso,
      merchant: "支付宝",
      category: "餐饮",
      account: "支付宝",
      note: "午饭"
    },
    {
      id: crypto.randomUUID(),
      type: "income",
      amount: 1200,
      currency: "EUR",
      date: todayIso,
      merchant: "工资",
      category: "工资",
      account: "银行卡",
      note: ""
    }
  ],
  investments: [
    {
      id: crypto.randomUUID(),
      asset: "VWCE ETF",
      action: "buy",
      amount: 100,
      currency: "EUR",
      date: todayIso,
      note: "月度定投示例"
    }
  ]
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
  investmentCost: document.querySelector("#investmentCost"),
  investmentCount: document.querySelector("#investmentCount"),
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
  accountList: document.querySelector("#accountList"),
  newAccount: document.querySelector("#newAccount"),
  addAccount: document.querySelector("#addAccount")
};

init();

function init() {
  registerServiceWorker();
  els.date.value = todayIso;
  els.assetDate.value = todayIso;
  els.baseCurrency.value = state.settings.baseCurrency;
  els.eurCnyRate.value = state.settings.eurCnyRate;
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

  document.querySelectorAll("[data-example]").forEach((button) => {
    button.addEventListener("click", () => {
      els.smartText.value = button.dataset.example;
      parseSmartText();
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
  els.addAccount.addEventListener("click", addAccount);
  document.querySelector("#resetDemo").addEventListener("click", () => {
    state = structuredClone(defaults);
    fillSelects();
    saveState();
    render();
  });
  document.querySelector("#exportJson").addEventListener("click", exportJson);
  document.querySelector("#exportCsv").addEventListener("click", exportCsv);
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
  const month = todayIso.slice(0, 7);
  const monthly = state.records.filter((record) => record.date.startsWith(month));
  const expense = totalByType(monthly, "expense", "EUR");
  const income = totalByType(monthly, "income", "EUR");
  const net = income - expense;
  const investmentCost = state.investments.reduce((sum, item) => {
    const value = convert(item.amount, item.currency, "EUR");
    return item.action === "buy" ? sum + value : item.action === "sell" ? sum - value : sum;
  }, 0);

  els.monthExpense.textContent = formatMoney(expense, "EUR");
  els.monthExpenseCny.textContent = `≈ ${formatMoney(convert(expense, "EUR", "CNY"), "CNY")}`;
  els.monthIncome.textContent = formatMoney(income, "EUR");
  els.monthNet.textContent = `净额 ${formatMoney(net, "EUR")}`;
  els.investmentCost.textContent = formatMoney(investmentCost, "EUR");
  els.investmentCount.textContent = `${state.investments.length} 条记录`;

  renderCategoryBars(monthly);
  els.recentRecords.innerHTML = sortedRecords(state.records).slice(0, 5).map(renderRecordCard).join("") || empty("还没有流水。");
}

function renderCategoryBars(records) {
  const base = state.settings.baseCurrency;
  const grouped = new Map();
  records.filter((record) => record.type === "expense").forEach((record) => {
    grouped.set(record.category, (grouped.get(record.category) || 0) + convert(record.amount, record.currency, base));
  });
  const rows = [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 1;
  els.categoryBars.innerHTML = rows.length
    ? rows.map(([category, amount]) => `
      <div class="bar-row">
        <div class="bar-top"><span>${escapeHtml(category)}</span><strong>${formatMoney(amount, base)}</strong></div>
        <div class="bar-track"><div class="bar-fill" style="width: ${Math.max(5, (amount / max) * 100)}%"></div></div>
      </div>
    `).join("")
    : empty("本月还没有支出。");
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
}

function renderRecordCard(record) {
  const signed = record.type === "expense" ? "-" : "+";
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
        <button data-delete-record="${record.id}" type="button">删除</button>
      </div>
    </article>
  `;
}

document.addEventListener("click", (event) => {
  const recordButton = event.target.closest("[data-delete-record]");
  const investmentButton = event.target.closest("[data-delete-investment]");
  const accountButton = event.target.closest("[data-delete-account]");
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
  if (recordButton || investmentButton || accountButton) {
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

function normalizeNumber(value) {
  return Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
}

function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
      investments: parsed.investments || []
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
        investments: imported.investments || []
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
