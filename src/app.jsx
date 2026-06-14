// ============================================================
// CENTS — Main Application
// React 18 + Chart.js · Vanilla CSS Design System
// ============================================================

const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } = React;

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
const fmt = (n, cur = '$') => `${cur}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (n, cur = '$') => {
  if (Math.abs(n) >= 1000) return `${cur}${(n / 1000).toFixed(1)}k`;
  return `${cur}${Math.abs(n).toFixed(0)}`;
};
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (d) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const dayLabel = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
const todayStr = () => new Date().toISOString().split('T')[0];
const uuidv4 = () => (typeof uuidv4 !== 'undefined' && window.uuidv4) ? window.uuidv4() : 'id-' + Math.random().toString(36).slice(2) + Date.now();

// ─────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: 'cat-food',    name: 'Food & Dining',   icon: '🍜', limit: 500,  minAlert: 350, maxAlert: 480 },
  { id: 'cat-trans',   name: 'Transport',        icon: '🚌', limit: 200,  minAlert: 140, maxAlert: 190 },
  { id: 'cat-shop',    name: 'Shopping',         icon: '🛍️', limit: 300,  minAlert: 220, maxAlert: 290 },
  { id: 'cat-health',  name: 'Health',           icon: '💊', limit: 150,  minAlert: 100, maxAlert: 145 },
  { id: 'cat-ent',     name: 'Entertainment',    icon: '🎬', limit: 120,  minAlert: 80,  maxAlert: 115 },
  { id: 'cat-subs',    name: 'Subscriptions',    icon: '📱', limit: 80,   minAlert: 60,  maxAlert: 78  },
  { id: 'cat-misc',    name: 'Miscellaneous',    icon: '📦', limit: 200,  minAlert: 140, maxAlert: 190 },
];

const EMOJI_OPTIONS = [
  '🍜','🍕','☕','🛒','🚌','🚗','✈️','🏠','💊','🏋️','🎬','🎮',
  '📱','💻','👗','👟','🛍️','📦','💡','🎓','💰','🏦','🎁','🌿',
  '🐾','🧴','🍺','🎵','📚','🔧','🌍','❤️',
];

// ─────────────────────────────────────────────────────────────
// STORE (localStorage)
// ─────────────────────────────────────────────────────────────
const STORE_KEY = 'cents_v1';

const defaultStore = () => ({
  version: '1.0',
  currency: '$',
  categories: DEFAULT_CATEGORIES,
  budgets: { [monthKey(new Date())]: 2000 },
  expenses: [],
});

const loadStore = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultStore();
    return JSON.parse(raw);
  } catch { return defaultStore(); }
};

const saveStore = (data) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {}
};

// ─────────────────────────────────────────────────────────────
// APP CONTEXT
// ─────────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

// ─────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────
const ToastCtx = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((type, title, msg) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, title, msg }]);
    setTimeout(() => {
      setToasts(t => t.map(x => x.id === id ? { ...x, removing: true } : x));
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 280);
    }, 3200);
  }, []);
  const icons = { warn: '⚠️', danger: '🔴', success: '✅', info: 'ℹ️' };
  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}${t.removing ? ' removing' : ''}`}>
            <span className="toast-icon">{icons[t.type] || 'ℹ️'}</span>
            <div className="toast-text">
              <div className="toast-title">{t.title}</div>
              {t.msg && <div className="toast-msg">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

// ─────────────────────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────────────────────
const Icon = {
  Home: ({ s = 22 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  List: ({ s = 22 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  BarChart: ({ s = 22 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Settings: ({ s = 22 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  Plus: ({ s = 24 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  X: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  ChevL: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevR: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  ChevRight: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Trash: ({ s = 15 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  ),
  Download: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Upload: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Edit: ({ s = 15 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
// BUDGET RING
// ─────────────────────────────────────────────────────────────
function BudgetRing({ spent, budget, currency }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const pct = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const offset = circ - pct * circ;
  const ringClass = pct >= 1 ? 'danger' : pct >= 0.8 ? 'warn' : '';
  const remaining = Math.max(budget - spent, 0);

  return (
    <div className="budget-hero">
      <div className="budget-ring-wrap">
        <svg className="budget-ring-svg" width="160" height="160" viewBox="0 0 160 160">
          <circle className="ring-track" cx="80" cy="80" r={r} />
          <circle
            className={`ring-fill ${ringClass}`}
            cx="80" cy="80" r={r}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div className="ring-center">
          <div className="ring-amount">{fmtShort(spent, currency)}</div>
          <div className="ring-label">of {fmtShort(budget, currency)}</div>
        </div>
      </div>
      <div className="budget-stats">
        <div className="stat-cell">
          <div className="stat-value">{fmt(spent, currency)}</div>
          <div className="stat-label">Spent</div>
        </div>
        <div className="stat-cell">
          <div className={`stat-value ${pct >= 1 ? 'text-danger' : pct >= 0.8 ? 'text-warn' : ''}`}>
            {fmt(remaining, currency)}
          </div>
          <div className="stat-label">Left</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{Math.round(pct * 100)}%</div>
          <div className="stat-label">Used</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CATEGORY CARD
// ─────────────────────────────────────────────────────────────
function CategoryCard({ cat, spent, currency, onClick }) {
  const pct = cat.limit > 0 ? spent / cat.limit : 0;
  const pctClamped = Math.min(pct, 1);
  const minPct = cat.limit > 0 ? (cat.minAlert / cat.limit) * 100 : 0;
  const maxPct = cat.limit > 0 ? (cat.maxAlert / cat.limit) * 100 : 0;
  const state = spent >= cat.maxAlert ? 'danger' : spent >= cat.minAlert ? 'warn' : '';

  return (
    <div className={`category-card ${state ? state + '-state' : ''}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="category-top">
        <div className="category-info">
          <div className="category-icon">{cat.icon}</div>
          <div>
            <div className="category-name">{cat.name}</div>
            <div className="category-sub">{Math.round(pct * 100)}% of limit</div>
          </div>
        </div>
        <div className="category-amounts">
          <div className={`category-spent ${state === 'danger' ? 'text-danger' : state === 'warn' ? 'text-warn' : ''}`}>
            {fmt(spent, currency)}
          </div>
          <div className="category-limit">of {fmt(cat.limit, currency)}</div>
        </div>
      </div>
      <div className="progress-wrap">
        <div className="progress-track">
          <div className={`progress-fill ${state}`} style={{ width: `${pctClamped * 100}%` }} />
          <div className="progress-marker min-marker" style={{ left: `${Math.min(minPct, 100)}%` }} title={`Min alert: ${fmt(cat.minAlert, currency)}`} />
          <div className="progress-marker max-marker" style={{ left: `${Math.min(maxPct, 100)}%` }} title={`Max alert: ${fmt(cat.maxAlert, currency)}`} />
        </div>
        <div className="progress-labels">
          <span className="progress-pct">{fmt(0, currency)}</span>
          <span className="progress-pct">{fmt(cat.limit, currency)}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPENSE ITEM
// ─────────────────────────────────────────────────────────────
function ExpenseItem({ expense, categories, currency, onDelete }) {
  const cat = categories.find(c => c.id === expense.categoryId);
  return (
    <div className="expense-item">
      <div className="expense-icon">{cat?.icon || '📦'}</div>
      <div className="expense-info">
        <div className="expense-note">{expense.note || cat?.name || 'Expense'}</div>
        <div className="expense-cat">{cat?.name || 'Uncategorized'}</div>
      </div>
      <div className="expense-amount">{fmt(expense.amount, currency)}</div>
      {onDelete && (
        <button className="expense-delete" onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }} aria-label="Delete">
          <Icon.Trash />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MONTH SELECTOR
// ─────────────────────────────────────────────────────────────
function MonthSelector({ current, onChange }) {
  const prev = () => {
    const d = new Date(current + '-01');
    d.setMonth(d.getMonth() - 1);
    onChange(monthKey(d));
  };
  const next = () => {
    const d = new Date(current + '-01');
    d.setMonth(d.getMonth() + 1);
    const now = monthKey(new Date());
    if (monthKey(d) <= now) onChange(monthKey(d));
  };
  const d = new Date(current + '-01');
  const isCurrentMonth = current === monthKey(new Date());
  return (
    <div className="month-selector">
      <button className="month-nav-btn" onClick={prev}><Icon.ChevL /></button>
      <span className="month-label">{d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
      <button className="month-nav-btn" onClick={next} style={{ opacity: isCurrentMonth ? 0.3 : 1, pointerEvents: isCurrentMonth ? 'none' : 'auto' }}>
        <Icon.ChevR />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BOTTOM SHEET
// ─────────────────────────────────────────────────────────────
function BottomSheet({ title, onClose, children }) {
  return (
    <>
      <div className="sheet-overlay" onClick={onClose} />
      <div className="sheet-container">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-title">{title}</div>
          <button className="icon-btn" onClick={onClose}><Icon.X /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD EXPENSE SHEET
// ─────────────────────────────────────────────────────────────
function AddExpenseSheet({ onClose, preselectedCat }) {
  const { data, addExpense } = useApp();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [catId, setCatId] = useState(preselectedCat || (data.categories[0]?.id || ''));
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayStr());

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { toast('warn', 'Invalid amount', 'Please enter a valid amount'); return; }
    if (!catId) { toast('warn', 'No category', 'Please select a category'); return; }
    addExpense({ id: uuidv4(), amount: num, categoryId: catId, note: note.trim(), date });
    toast('success', 'Expense added', `${fmt(num, data.currency)} recorded`);
    onClose();
  };

  return (
    <BottomSheet title="Add Expense" onClose={onClose}>
      <div className="form-group">
        <label className="form-label">Amount</label>
        <div className="amount-input-wrap">
          <span className="amount-prefix">{data.currency}</span>
          <input
            className="form-input amount"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Category</label>
        <div className="cat-pill-grid">
          {data.categories.map(c => (
            <button key={c.id} className={`cat-pill ${catId === c.id ? 'selected' : ''}`} onClick={() => setCatId(c.id)}>
              <span>{c.icon}</span>{c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Note (optional)</label>
        <input className="form-input" type="text" placeholder="What was this for?" value={note} onChange={e => setNote(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Date</label>
        <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} max={todayStr()} />
      </div>
      <button className="btn btn-primary" onClick={handleSubmit}><Icon.Plus s={18} />Add Expense</button>
    </BottomSheet>
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────
function DashboardPage({ onAddExpense }) {
  const { data, currentMonth, setCurrentMonth, getMonthExpenses, getCategorySpent } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const expenses = getMonthExpenses(currentMonth);
  const budget = data.budgets[currentMonth] || 0;
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const catSpent = useMemo(() => {
    const m = {};
    data.categories.forEach(c => { m[c.id] = getCategorySpent(c.id, currentMonth); });
    return m;
  }, [data, currentMonth]);

  // Alerts
  const alerts = useMemo(() => {
    return data.categories
      .map(c => ({ cat: c, spent: catSpent[c.id] || 0 }))
      .filter(({ cat, spent }) => spent >= cat.minAlert)
      .map(({ cat, spent }) => ({
        cat, spent,
        type: spent >= cat.maxAlert ? 'danger' : 'warn',
        msg: spent >= cat.maxAlert
          ? `${cat.name} has reached its max limit!`
          : `${cat.name} is approaching its limit`,
      }));
  }, [catSpent, data.categories]);

  // Recent expenses (last 5)
  const recent = useMemo(() =>
    [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
  [expenses]);

  return (
    <div className="page-content" ref={contentRef} id="page-dashboard">
      <div className={`app-header ${scrolled ? 'scrolled' : ''}`} style={{ position: 'sticky', top: 0 }}>
        <div className="header-logo">cents<span>.</span></div>
        <MonthSelector current={currentMonth} onChange={setCurrentMonth} />
      </div>

      <BudgetRing spent={totalSpent} budget={budget} currency={data.currency} />

      {alerts.length > 0 && (
        <div style={{ padding: '0 0 4px' }}>
          {alerts.map(a => (
            <div key={a.cat.id} className={`alert-banner ${a.type}`}>
              <span className="alert-banner-icon">{a.type === 'danger' ? '🔴' : '⚠️'}</span>
              <span className="alert-banner-text"><strong>{a.cat.name}</strong> — {a.msg} ({fmt(a.spent, data.currency)} / {fmt(a.cat.maxAlert, data.currency)})</span>
            </div>
          ))}
        </div>
      )}

      <div className="section-header">
        <span className="section-title">Categories</span>
      </div>
      <div className="category-list">
        {data.categories.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <div className="empty-title">No categories yet</div>
            <div className="empty-sub">Add categories in Settings to start tracking.</div>
          </div>
        ) : data.categories.map(cat => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            spent={catSpent[cat.id] || 0}
            currency={data.currency}
            onClick={() => onAddExpense(cat.id)}
          />
        ))}
      </div>

      <div className="section-header" style={{ marginTop: 20 }}>
        <span className="section-title">Recent</span>
        <button className="section-action">See all →</button>
      </div>
      <div className="expense-list">
        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <div className="empty-title">No expenses yet</div>
            <div className="empty-sub">Tap + to log your first expense.</div>
          </div>
        ) : recent.map(e => (
          <ExpenseItem key={e.id} expense={e} categories={data.categories} currency={data.currency} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HISTORY PAGE
// ─────────────────────────────────────────────────────────────
function HistoryPage() {
  const { data, currentMonth, setCurrentMonth, getMonthExpenses, deleteExpense } = useApp();
  const toast = useToast();
  const [filterCat, setFilterCat] = useState('all');

  const expenses = getMonthExpenses(currentMonth);
  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.categoryId === filterCat);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  // Group by day
  const grouped = useMemo(() => {
    const map = {};
    sorted.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [sorted]);

  const handleDelete = (id) => {
    deleteExpense(id);
    toast('info', 'Expense removed', '');
  };

  return (
    <div className="page-content" id="page-history">
      <div className="app-header">
        <div className="header-logo">History</div>
        <MonthSelector current={currentMonth} onChange={setCurrentMonth} />
      </div>

      <div className="filter-bar">
        <button className={`filter-chip ${filterCat === 'all' ? 'active' : ''}`} onClick={() => setFilterCat('all')}>All</button>
        {data.categories.map(c => (
          <button key={c.id} className={`filter-chip ${filterCat === c.id ? 'active' : ''}`} onClick={() => setFilterCat(c.id)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      <div className="expense-list">
        {grouped.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No expenses found</div>
            <div className="empty-sub">Try a different filter or month.</div>
          </div>
        ) : grouped.map(([date, exps]) => (
          <div key={date} className="expense-day-group">
            <div className="expense-day-header">{dayLabel(date)} · {fmt(exps.reduce((s, e) => s + e.amount, 0), data.currency)}</div>
            {exps.map(e => (
              <ExpenseItem key={e.id} expense={e} categories={data.categories} currency={data.currency} onDelete={handleDelete} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ANALYTICS PAGE
// ─────────────────────────────────────────────────────────────
const CHART_GREYS = [
  '#0A0A0A','#2E2E2E','#555555','#7A7A7A','#9E9E9E','#BCBCBC','#D5D5D5','#E8E8E8'
];

function AnalyticsPage() {
  const { data, currentMonth, setCurrentMonth, getMonthExpenses, getCategorySpent } = useApp();
  const donutRef = useRef(null);
  const barRef = useRef(null);
  const donutChart = useRef(null);
  const barChart = useRef(null);

  const expenses = getMonthExpenses(currentMonth);
  const budget = data.budgets[currentMonth] || 0;
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const catData = useMemo(() =>
    data.categories.map((c, i) => ({
      cat: c,
      spent: getCategorySpent(c.id, currentMonth),
      color: CHART_GREYS[i % CHART_GREYS.length],
    })).filter(d => d.spent > 0),
  [data, currentMonth]);

  // Daily spending
  const dailyData = useMemo(() => {
    const d = new Date(currentMonth + '-01');
    const days = [];
    const now = new Date();
    while (d.getMonth() === new Date(currentMonth + '-01').getMonth()) {
      if (d > now) break;
      const key = d.toISOString().split('T')[0];
      days.push({
        label: d.getDate().toString(),
        value: expenses.filter(e => e.date === key).reduce((s, e) => s + e.amount, 0),
      });
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [expenses, currentMonth]);

  // Stats
  const avgPerDay = dailyData.length > 0 ? totalSpent / dailyData.filter(d => d.value > 0).length || 0 : 0;
  const maxDay = dailyData.reduce((m, d) => d.value > m.value ? d : m, { label: '-', value: 0 });
  const topCat = catData.reduce((m, d) => d.spent > m.spent ? d : m, { cat: { name: '-' }, spent: 0 });

  // Build/update donut chart
  useEffect(() => {
    if (!donutRef.current) return;
    if (donutChart.current) donutChart.current.destroy();
    if (catData.length === 0) return;
    donutChart.current = new Chart(donutRef.current, {
      type: 'doughnut',
      data: {
        labels: catData.map(d => d.cat.name),
        datasets: [{
          data: catData.map(d => d.spent),
          backgroundColor: catData.map(d => d.color),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverBorderWidth: 3,
        }]
      },
      options: {
        cutout: '68%',
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${fmt(ctx.raw, data.currency)} (${Math.round(ctx.raw / totalSpent * 100)}%)`,
            },
            backgroundColor: '#0A0A0A',
            titleColor: '#fff',
            bodyColor: '#ccc',
            cornerRadius: 10,
            padding: 10,
          }
        }
      }
    });
    return () => { if (donutChart.current) { donutChart.current.destroy(); donutChart.current = null; } };
  }, [catData, totalSpent]);

  // Build/update bar chart
  useEffect(() => {
    if (!barRef.current) return;
    if (barChart.current) barChart.current.destroy();
    if (dailyData.length === 0) return;
    barChart.current = new Chart(barRef.current, {
      type: 'bar',
      data: {
        labels: dailyData.map(d => d.label),
        datasets: [{
          data: dailyData.map(d => d.value),
          backgroundColor: dailyData.map(d => d.value > 0 ? '#0A0A0A' : '#E8E8E8'),
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${fmt(ctx.raw, data.currency)}` },
            backgroundColor: '#0A0A0A',
            titleColor: '#fff',
            bodyColor: '#ccc',
            cornerRadius: 10,
            padding: 10,
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#A0A0A0', font: { size: 10, family: 'Inter' }, maxRotation: 0 },
            border: { display: false },
          },
          y: {
            grid: { color: '#F0F0F0', drawBorder: false },
            ticks: {
              color: '#A0A0A0',
              font: { size: 10, family: 'Inter' },
              callback: v => fmtShort(v, data.currency),
            },
            border: { display: false },
          }
        }
      }
    });
    return () => { if (barChart.current) { barChart.current.destroy(); barChart.current = null; } };
  }, [dailyData]);

  return (
    <div className="page-content" id="page-analytics">
      <div className="app-header">
        <div className="header-logo">Analytics</div>
        <MonthSelector current={currentMonth} onChange={setCurrentMonth} />
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Spent</div>
          <div className="stat-card-value">{fmt(totalSpent, data.currency)}</div>
          <div className="stat-card-sub">of {fmt(budget, data.currency)} budget</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg / Day</div>
          <div className="stat-card-value">{fmt(avgPerDay || 0, data.currency)}</div>
          <div className="stat-card-sub">on active days</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Biggest Day</div>
          <div className="stat-card-value">{fmt(maxDay.value, data.currency)}</div>
          <div className="stat-card-sub">Day {maxDay.label}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Top Category</div>
          <div className="stat-card-value" style={{ fontSize: 15 }}>{topCat.cat.name}</div>
          <div className="stat-card-sub">{fmt(topCat.spent, data.currency)}</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">Spending by Category</div>
        {catData.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <div className="empty-icon">📊</div>
            <div className="empty-sub">No expenses this month</div>
          </div>
        ) : (
          <>
            <div className="chart-wrap" style={{ maxHeight: 220 }}>
              <canvas ref={donutRef} />
            </div>
            <div className="donut-legend">
              {catData.map(d => (
                <div key={d.cat.id} className="legend-item">
                  <div className="legend-dot" style={{ background: d.color }} />
                  <span className="legend-name">{d.cat.icon} {d.cat.name}</span>
                  <span className="legend-val">{Math.round(d.spent / totalSpent * 100)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="chart-card">
        <div className="chart-title">Daily Spending</div>
        {dailyData.every(d => d.value === 0) ? (
          <div className="empty-state" style={{ padding: '24px' }}>
            <div className="empty-icon">📈</div>
            <div className="empty-sub">No expenses this month</div>
          </div>
        ) : (
          <div className="chart-wrap" style={{ maxHeight: 200 }}>
            <canvas ref={barRef} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CATEGORY FORM (Settings)
// ─────────────────────────────────────────────────────────────
function CategoryForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || '📦');
  const [limit, setLimit] = useState(initial?.limit?.toString() || '');
  const [minAlert, setMinAlert] = useState(initial?.minAlert?.toString() || '');
  const [maxAlert, setMaxAlert] = useState(initial?.maxAlert?.toString() || '');
  const toast = useToast();

  const handleSave = () => {
    if (!name.trim()) { toast('warn', 'Name required', ''); return; }
    const lim = parseFloat(limit) || 0;
    const min = parseFloat(minAlert) || 0;
    const max = parseFloat(maxAlert) || 0;
    if (lim <= 0) { toast('warn', 'Set a limit', 'Limit must be greater than 0'); return; }
    onSave({ name: name.trim(), icon, limit: lim, minAlert: min, maxAlert: max });
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Category Name</label>
        <input className="form-input" placeholder="e.g., Food & Dining" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Icon</label>
        <div className="icon-grid">
          {EMOJI_OPTIONS.map(em => (
            <button key={em} className={`icon-option ${icon === em ? 'selected' : ''}`} onClick={() => setIcon(em)}>{em}</button>
          ))}
        </div>
      </div>
      <div className="cat-form-grid">
        <div className="form-group">
          <label className="form-label">Limit</label>
          <input className="form-input" type="number" placeholder="500" value={limit} onChange={e => setLimit(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Min Alert</label>
          <input className="form-input" type="number" placeholder="350" value={minAlert} onChange={e => setMinAlert(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Max Alert (hard limit)</label>
        <input className="form-input" type="number" placeholder="480" value={maxAlert} onChange={e => setMaxAlert(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>Save Category</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────
function SettingsPage() {
  const { data, updateBudget, addCategory, updateCategory, deleteCategory, currentMonth, exportData, importData, setCurrency } = useApp();
  const toast = useToast();
  const [budgetInput, setBudgetInput] = useState((data.budgets[currentMonth] || '').toString());
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setBudgetInput((data.budgets[currentMonth] || '').toString());
  }, [currentMonth, data.budgets]);

  const handleBudgetSave = () => {
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val <= 0) { toast('warn', 'Invalid budget', ''); return; }
    updateBudget(currentMonth, val);
    toast('success', 'Budget updated', `${fmt(val, data.currency)} for ${new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
  };

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cents_export_${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
    toast('success', 'Exported!', 'Your data has been downloaded.');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = importData(ev.target.result);
        if (result) toast('success', 'Imported!', 'Your data has been restored.');
        else toast('danger', 'Import failed', 'Invalid file format.');
      } catch { toast('danger', 'Import failed', 'Could not read file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = importData(ev.target.result);
        if (result) toast('success', 'Imported!', 'Your data has been restored.');
        else toast('danger', 'Import failed', 'Invalid file format.');
      } catch { toast('danger', 'Import failed', 'Could not read file.'); }
    };
    reader.readAsText(file);
  };

  const CURRENCIES = ['$', '€', '£', '¥', '₹', '₩', 'CHF', 'A$', 'C$'];

  return (
    <div className="page-content" id="page-settings">
      <div className="app-header">
        <div className="header-logo">Settings</div>
      </div>

      {/* Budget */}
      <div className="settings-section">
        <div className="settings-section-title">Budget — {new Date(currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <div className="settings-list">
          <div className="settings-row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="settings-row-icon">💰</div>
            <div className="settings-row-info">
              <div className="settings-row-label">Monthly Budget</div>
            </div>
            <div className="amount-input-wrap" style={{ flex: 1, minWidth: 120 }}>
              <span className="amount-prefix" style={{ fontSize: 14, top: '50%', left: 10 }}>{data.currency}</span>
              <input
                className="form-input"
                type="number"
                style={{ paddingLeft: 24, paddingTop: 8, paddingBottom: 8, fontSize: 14 }}
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                placeholder="2000"
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleBudgetSave}>Save</button>
          </div>
          <div className="settings-row" style={{ cursor: 'pointer' }} onClick={() => setShowCurrencySheet(true)}>
            <div className="settings-row-icon">💱</div>
            <div className="settings-row-info">
              <div className="settings-row-label">Currency</div>
              <div className="settings-row-sub">Currently: {data.currency}</div>
            </div>
            <div className="settings-row-action"><Icon.ChevRight /></div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="settings-section">
        <div className="settings-section-title">Categories</div>
        <div className="settings-list">
          {data.categories.map(cat => (
            <div key={cat.id} className="cat-manage-item">
              <div className="category-icon" style={{ width: 32, height: 32, fontSize: 15 }}>{cat.icon}</div>
              <div className="cat-manage-info">
                <div className="cat-manage-name">{cat.name}</div>
                <div className="cat-manage-limits">Limit: {fmt(cat.limit, data.currency)} · Min: {fmt(cat.minAlert, data.currency)} · Max: {fmt(cat.maxAlert, data.currency)}</div>
              </div>
              <button className="icon-btn" style={{ marginRight: 4 }} onClick={() => { setEditingCat(cat); setShowCatForm(true); }}>
                <Icon.Edit />
              </button>
              <button className="icon-btn" onClick={() => { deleteCategory(cat.id); toast('info', 'Category deleted', cat.name); }}>
                <Icon.Trash />
              </button>
            </div>
          ))}
          <div className="settings-row" style={{ cursor: 'pointer', justifyContent: 'center' }} onClick={() => { setEditingCat(null); setShowCatForm(true); }}>
            <Icon.Plus s={16} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Add Category</span>
          </div>
        </div>
      </div>

      {/* Data */}
      <div className="settings-section">
        <div className="settings-section-title">Data Portability</div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Icon.Download />Export JSON
          </button>
          <div
            className="drop-zone"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <div className="drop-zone-icon">📂</div>
            <div className="drop-zone-title">Import JSON</div>
            <div className="drop-zone-sub">Tap to browse or drag & drop your backup file</div>
          </div>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section">
        <div className="settings-section-title">Danger Zone</div>
        <div style={{ padding: '0 16px' }}>
          <button className="btn btn-danger" onClick={() => {
            if (confirm('Clear ALL data? This cannot be undone.')) {
              localStorage.removeItem(STORE_KEY);
              window.location.reload();
            }
          }}>
            🗑️ Clear All Data
          </button>
        </div>
      </div>

      <div style={{ height: 32 }} />

      {/* Category Form Sheet */}
      {showCatForm && (
        <BottomSheet
          title={editingCat ? 'Edit Category' : 'New Category'}
          onClose={() => { setShowCatForm(false); setEditingCat(null); }}
        >
          <CategoryForm
            initial={editingCat}
            onSave={(vals) => {
              if (editingCat) updateCategory({ ...editingCat, ...vals });
              else addCategory({ id: uuidv4(), ...vals });
              setShowCatForm(false); setEditingCat(null);
              toast('success', editingCat ? 'Category updated' : 'Category added', vals.name);
            }}
            onCancel={() => { setShowCatForm(false); setEditingCat(null); }}
          />
        </BottomSheet>
      )}

      {/* Currency Sheet */}
      {showCurrencySheet && (
        <BottomSheet title="Currency" onClose={() => setShowCurrencySheet(false)}>
          <div className="cat-pill-grid">
            {CURRENCIES.map(c => (
              <button
                key={c}
                className={`cat-pill ${data.currency === c ? 'selected' : ''}`}
                onClick={() => { setCurrency(c); setShowCurrencySheet(false); toast('success', 'Currency updated', c); }}
              >
                {c}
              </button>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home',    Icon: Icon.Home     },
  { id: 'history',   label: 'History', Icon: Icon.List     },
  { id: 'analytics', label: 'Charts',  Icon: Icon.BarChart },
  { id: 'settings',  label: 'Settings',Icon: Icon.Settings },
];

function BottomNav({ page, onNav, onAdd }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.slice(0, 2).map(n => (
        <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => onNav(n.id)}>
          <n.Icon s={21} />{n.label}
        </button>
      ))}
      <button className="nav-add" onClick={onAdd} aria-label="Add expense"><Icon.Plus s={22} /></button>
      {NAV_ITEMS.slice(2).map(n => (
        <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => onNav(n.id)}>
          <n.Icon s={21} />{n.label}
        </button>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
// APP PROVIDER
// ─────────────────────────────────────────────────────────────
function AppProvider({ children }) {
  const [data, setData] = useState(() => loadStore());
  const [currentMonth, setCurrentMonth] = useState(() => monthKey(new Date()));
  const toast = useToast();

  // Persist on change
  useEffect(() => { saveStore(data); }, [data]);

  // Alert check on expense add
  const prevAlerted = useRef(new Set());

  const getMonthExpenses = useCallback((month) =>
    data.expenses.filter(e => e.date.startsWith(month)),
  [data.expenses]);

  const getCategorySpent = useCallback((catId, month) =>
    data.expenses.filter(e => e.categoryId === catId && e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0),
  [data.expenses]);

  const addExpense = useCallback((expense) => {
    setData(d => {
      const newData = { ...d, expenses: [...d.expenses, expense] };
      // Check alerts
      const month = expense.date.slice(0, 7);
      d.categories.forEach(cat => {
        const spent = newData.expenses
          .filter(e => e.categoryId === cat.id && e.date.startsWith(month))
          .reduce((s, e) => s + e.amount, 0);
        const alertKey = `${cat.id}-${month}`;
        if (spent >= cat.maxAlert && !prevAlerted.current.has(alertKey + '-max')) {
          prevAlerted.current.add(alertKey + '-max');
          setTimeout(() => toast('danger', `${cat.icon} ${cat.name} — Max Limit!`, `You've spent ${fmt(spent, d.currency)} of ${fmt(cat.maxAlert, d.currency)}`), 100);
        } else if (spent >= cat.minAlert && !prevAlerted.current.has(alertKey + '-min')) {
          prevAlerted.current.add(alertKey + '-min');
          setTimeout(() => toast('warn', `${cat.icon} ${cat.name} — Approaching Limit`, `${fmt(spent, d.currency)} of ${fmt(cat.minAlert, d.currency)} threshold`), 100);
        }
      });
      return newData;
    });
  }, [toast]);

  const deleteExpense = useCallback((id) => {
    setData(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }));
  }, []);

  const updateBudget = useCallback((month, amount) => {
    setData(d => ({ ...d, budgets: { ...d.budgets, [month]: amount } }));
  }, []);

  const addCategory = useCallback((cat) => {
    setData(d => ({ ...d, categories: [...d.categories, cat] }));
  }, []);

  const updateCategory = useCallback((cat) => {
    setData(d => ({ ...d, categories: d.categories.map(c => c.id === cat.id ? cat : c) }));
  }, []);

  const deleteCategory = useCallback((id) => {
    setData(d => ({
      ...d,
      categories: d.categories.filter(c => c.id !== id),
      expenses: d.expenses.filter(e => e.categoryId !== id),
    }));
  }, []);

  const setCurrency = useCallback((cur) => {
    setData(d => ({ ...d, currency: cur }));
  }, []);

  const exportData = useCallback(() => JSON.stringify(data, null, 2), [data]);

  const importData = useCallback((jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.categories || !parsed.expenses) return false;
      setData({ ...defaultStore(), ...parsed });
      return true;
    } catch { return false; }
  }, []);

  const value = {
    data, currentMonth, setCurrentMonth,
    getMonthExpenses, getCategorySpent,
    addExpense, deleteExpense,
    updateBudget, addCategory, updateCategory, deleteCategory,
    setCurrency, exportData, importData,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

// ─────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────
function App() {
  const [page, setPage] = useState('dashboard');
  const [showAdd, setShowAdd] = useState(false);
  const [preselectedCat, setPreselectedCat] = useState(null);

  const handleAddExpense = (catId = null) => {
    setPreselectedCat(catId);
    setShowAdd(true);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage onAddExpense={handleAddExpense} />;
      case 'history':   return <HistoryPage />;
      case 'analytics': return <AnalyticsPage />;
      case 'settings':  return <SettingsPage />;
      default:          return <DashboardPage onAddExpense={handleAddExpense} />;
    }
  };

  return (
    <ToastProvider>
      <AppProvider>
        <div className="app-frame">
          {renderPage()}
          <BottomNav
            page={page}
            onNav={setPage}
            onAdd={() => handleAddExpense(null)}
          />
        </div>
        {showAdd && (
          <AddExpenseSheet
            onClose={() => { setShowAdd(false); setPreselectedCat(null); }}
            preselectedCat={preselectedCat}
          />
        )}
      </AppProvider>
    </ToastProvider>
  );
}

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
