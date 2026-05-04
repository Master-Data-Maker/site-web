/* ═══════════════════════════════════════════
   FlowMoney — data.js
   Gestion des transactions & budgets (localStorage)
═══════════════════════════════════════════ */

const Data = (() => {

  // ── Clés localStorage ──────────────────────
  const TX_KEY     = 'flowmoney_transactions';
  const BUDGET_KEY = 'flowmoney_budgets';

  // ── Icônes par catégorie ───────────────────
  const CAT_ICONS = {
    salaire:      '💼',
    alimentation: '🛒',
    logement:     '🏠',
    transport:    '🚗',
    loisirs:      '🎮',
    sante:        '💊',
    autre:        '📦'
  };

  // ── Couleurs par catégorie (pour les graphiques) ──
  const CAT_COLORS = {
    salaire:      '#34d399',
    alimentation: '#fb923c',
    logement:     '#4f8eff',
    transport:    '#a78bfa',
    loisirs:      '#f87171',
    sante:        '#00d4aa',
    autre:        '#8892aa'
  };

  // ════════════════════════════════════════════
  //  TRANSACTIONS
  // ════════════════════════════════════════════

  function getTransactions() {
    const user = Auth.currentUser();
    if (!user) return [];
    const all = JSON.parse(localStorage.getItem(TX_KEY) || '{}');
    return all[user.username] || [];
  }

  function saveTransactions(txs) {
    const user = Auth.currentUser();
    if (!user) return;
    const all = JSON.parse(localStorage.getItem(TX_KEY) || '{}');
    all[user.username] = txs;
    localStorage.setItem(TX_KEY, JSON.stringify(all));
  }

  function addTransaction({ type, description, amount, date, category }) {
    if (!type || !description || !amount || !date || !category) {
      return { ok: false, error: 'Tous les champs sont requis.' };
    }
    const amount_num = parseFloat(amount);
    if (isNaN(amount_num) || amount_num <= 0) {
      return { ok: false, error: 'Le montant doit être un nombre positif.' };
    }

    const txs = getTransactions();
    const tx = {
      id:          Date.now().toString(),
      type,
      description: description.trim(),
      amount:      amount_num,
      date,
      category,
      createdAt:   new Date().toISOString()
    };
    txs.unshift(tx); // plus récent en premier
    saveTransactions(txs);
    return { ok: true, tx };
  }

  function deleteTransaction(id) {
    const txs = getTransactions().filter(t => t.id !== id);
    saveTransactions(txs);
  }

  function updateTransaction(id, { type, description, amount, date, category }) {
    if (!type || !description || !amount || !date || !category) {
      return { ok: false, error: 'Tous les champs sont requis.' };
    }
    const amount_num = parseFloat(amount);
    if (isNaN(amount_num) || amount_num <= 0) {
      return { ok: false, error: 'Le montant doit être un nombre positif.' };
    }
    const txs = getTransactions();
    const idx = txs.findIndex(t => t.id === id);
    if (idx === -1) return { ok: false, error: 'Transaction introuvable.' };

    txs[idx] = {
      ...txs[idx],
      type,
      description: description.trim(),
      amount: amount_num,
      date,
      category,
      updatedAt: new Date().toISOString()
    };
    saveTransactions(txs);
    return { ok: true, tx: txs[idx] };
  }

  // ── Filtres ───────────────────────────────
  function filterTransactions({ type = '', category = '', month = '' } = {}) {
    let txs = getTransactions();
    if (type)     txs = txs.filter(t => t.type === type);
    if (category) txs = txs.filter(t => t.category === category);
    if (month)    txs = txs.filter(t => t.date.startsWith(month));
    return txs;
  }

  // ── Stats du mois courant ─────────────────
  function getMonthStats(month = null) {
    const m = month || new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const txs = getTransactions().filter(t => t.date.startsWith(m));

    const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    const saving  = income > 0 ? Math.round((balance / income) * 100) : 0;

    return { income, expense, balance, saving, txs };
  }

  // ── Solde total (toutes périodes) ─────────
  function getTotalBalance() {
    const txs = getTransactions();
    return txs.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0);
  }

  // ── Stats par catégorie (dépenses) ────────
  function getExpenseByCategory(month = null) {
    const m = month || new Date().toISOString().slice(0, 7);
    const txs = getTransactions()
      .filter(t => t.type === 'expense' && t.date.startsWith(m));

    const result = {};
    txs.forEach(t => {
      result[t.category] = (result[t.category] || 0) + t.amount;
    });
    return result;
  }

  // ── Flux sur N mois ───────────────────────
  function getFlowByMonths(n = 6) {
    const months = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }

    return months.map(m => {
      const stats = getMonthStats(m);
      const label = new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      return { month: m, label, income: stats.income, expense: stats.expense };
    });
  }

  // ════════════════════════════════════════════
  //  BUDGETS (enveloppes)
  // ════════════════════════════════════════════

  function getBudgets() {
    const user = Auth.currentUser();
    if (!user) return [];
    const all = JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}');
    return all[user.username] || [];
  }

  function saveBudgets(budgets) {
    const user = Auth.currentUser();
    if (!user) return;
    const all = JSON.parse(localStorage.getItem(BUDGET_KEY) || '{}');
    all[user.username] = budgets;
    localStorage.setItem(BUDGET_KEY, JSON.stringify(all));
  }

  function addBudget({ name, amount, category }) {
    if (!name || !amount || !category) {
      return { ok: false, error: 'Tous les champs sont requis.' };
    }
    const amount_num = parseFloat(amount);
    if (isNaN(amount_num) || amount_num <= 0) {
      return { ok: false, error: 'Le montant doit être un nombre positif.' };
    }

    const budgets = getBudgets();
    const budget = {
      id:       Date.now().toString(),
      name:     name.trim(),
      amount:   amount_num,
      category,
      createdAt: new Date().toISOString()
    };
    budgets.push(budget);
    saveBudgets(budgets);
    return { ok: true, budget };
  }

  function deleteBudget(id) {
    const budgets = getBudgets().filter(b => b.id !== id);
    saveBudgets(budgets);
  }

  // ── Calcul dépensé pour une enveloppe (mois courant) ──
  function getBudgetSpent(category) {
    const m = new Date().toISOString().slice(0, 7);
    return getTransactions()
      .filter(t => t.type === 'expense' && t.category === category && t.date.startsWith(m))
      .reduce((s, t) => s + t.amount, 0);
  }

  // ── Formatage monétaire ───────────────────
  function formatAmount(amount) {
    return amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }

  // ── Icône et couleur d'une catégorie ──────
  function getCatIcon(cat)  { return CAT_ICONS[cat]  || '📦'; }
  function getCatColor(cat) { return CAT_COLORS[cat] || '#8892aa'; }

  // API publique
  return {
    getTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    filterTransactions,
    getMonthStats,
    getTotalBalance,
    getExpenseByCategory,
    getFlowByMonths,
    getBudgets,
    addBudget,
    deleteBudget,
    getBudgetSpent,
    formatAmount,
    getCatIcon,
    getCatColor,
    CAT_COLORS
  };
})();


/* ═══════════════════════════════════════════
   UI — Transactions & Budget
═══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ════════ MODAL TRANSACTION ════════

  const modalTx   = document.getElementById('modalTx');
  const txError   = document.getElementById('txError');
  let currentType = 'income';
  let editingId   = null;   // null = création, sinon id de la tx en cours d'édition

  // Helper : ouvrir la modale en mode création
  function openModalCreate() {
    editingId = null;
    document.getElementById('txDesc').value   = '';
    document.getElementById('txAmount').value = '';
    document.getElementById('txDate').value   = new Date().toISOString().slice(0, 10);
    document.getElementById('txCat').value    = 'salaire';
    currentType = 'income';
    document.getElementById('typeIncome').classList.add('active');
    document.getElementById('typeExpense').classList.remove('active');
    document.getElementById('modalTxTitle').textContent  = 'Ajouter une transaction';
    document.getElementById('submitTx').textContent      = 'Enregistrer';
    txError.classList.add('hidden');
    modalTx.classList.remove('hidden');
  }

  // Helper : ouvrir la modale en mode édition
  function openModalEdit(tx) {
    editingId = tx.id;
    document.getElementById('txDesc').value   = tx.description;
    document.getElementById('txAmount').value = tx.amount;
    document.getElementById('txDate').value   = tx.date;
    document.getElementById('txCat').value    = tx.category;
    currentType = tx.type;
    document.getElementById('typeIncome').classList.toggle('active',  tx.type === 'income');
    document.getElementById('typeExpense').classList.toggle('active', tx.type === 'expense');
    document.getElementById('modalTxTitle').textContent  = 'Modifier la transaction';
    document.getElementById('submitTx').textContent      = 'Mettre à jour';
    txError.classList.add('hidden');
    modalTx.classList.remove('hidden');
  }

  // Exposer openModalEdit pour renderTransactions
  window._openTxModalEdit = openModalEdit;

  // Ouvrir la modale (bouton +Ajouter)
  document.getElementById('btnAddTx')?.addEventListener('click', () => {
    openModalCreate();
  });

  // Fermer la modale
  ['closeTx', 'closeTxBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      modalTx.classList.add('hidden');
      txError.classList.add('hidden');
    });
  });

  // Toggle revenu / dépense
  document.getElementById('typeIncome')?.addEventListener('click', () => {
    currentType = 'income';
    document.getElementById('typeIncome').classList.add('active');
    document.getElementById('typeExpense').classList.remove('active');
  });
  document.getElementById('typeExpense')?.addEventListener('click', () => {
    currentType = 'expense';
    document.getElementById('typeExpense').classList.add('active');
    document.getElementById('typeIncome').classList.remove('active');
  });

  // Soumettre une transaction (création ou modification)
  document.getElementById('submitTx')?.addEventListener('click', () => {
    txError.classList.add('hidden');

    const payload = {
      type:        currentType,
      description: document.getElementById('txDesc').value,
      amount:      document.getElementById('txAmount').value,
      date:        document.getElementById('txDate').value,
      category:    document.getElementById('txCat').value
    };

    let result;
    if (editingId) {
      result = Data.updateTransaction(editingId, payload);
    } else {
      result = Data.addTransaction(payload);
    }

    if (!result.ok) {
      txError.textContent = result.error;
      txError.classList.remove('hidden');
      return;
    }

    // Reset + ferme
    document.getElementById('txDesc').value   = '';
    document.getElementById('txAmount').value = '';
    editingId = null;
    modalTx.classList.add('hidden');

    showToast(editingId !== null ? 'Transaction modifiée ✓' : (result.tx ? 'Transaction ajoutée ✓' : 'Transaction mise à jour ✓'));
    if (typeof window.renderTransactions === 'function') window.renderTransactions();
    if (typeof window.updateDashboard    === 'function') window.updateDashboard();
  });

  // ════════ MODAL BUDGET ════════

  const modalBudget = document.getElementById('modalBudget');

  document.getElementById('btnAddBudget')?.addEventListener('click', () => {
    modalBudget.classList.remove('hidden');
  });

  ['closeBudget', 'closeBudgetBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      modalBudget.classList.add('hidden');
    });
  });

  document.getElementById('submitBudget')?.addEventListener('click', () => {
    const result = Data.addBudget({
      name:     document.getElementById('budgetName').value,
      amount:   document.getElementById('budgetAmount').value,
      category: document.getElementById('budgetCat').value
    });

    if (!result.ok) {
      showToast('Erreur : ' + result.error);
      return;
    }

    document.getElementById('budgetName').value   = '';
    document.getElementById('budgetAmount').value = '';
    modalBudget.classList.add('hidden');

    showToast('Enveloppe créée ✓');
    if (typeof window.renderBudgets === 'function') window.renderBudgets();
  });

  // ════════ FILTRES TRANSACTIONS ════════

  ['filterType', 'filterCat', 'filterMonth'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (typeof window.renderTransactions === 'function') window.renderTransactions();
    });
  });

  document.getElementById('btnClearFilter')?.addEventListener('click', () => {
    document.getElementById('filterType').value  = '';
    document.getElementById('filterCat').value   = '';
    document.getElementById('filterMonth').value = '';
    if (typeof window.renderTransactions === 'function') window.renderTransactions();
  });

  // ════════ RENDER TRANSACTIONS (page Transactions) ════════

  window.renderTransactions = function () {
    const container = document.getElementById('txList');
    if (!container) return;

    const type     = document.getElementById('filterType')?.value  || '';
    const category = document.getElementById('filterCat')?.value   || '';
    const month    = document.getElementById('filterMonth')?.value  || '';

    const txs = Data.filterTransactions({ type, category, month });

    if (!txs.length) {
      container.innerHTML = '<p class="empty-state">Aucune transaction trouvée.</p>';
      return;
    }

    container.innerHTML = txs.map(tx => `
      <div class="tx-item tx-item-editable" data-id="${tx.id}" title="Cliquer pour modifier" style="cursor:pointer">
        <div class="tx-icon">${Data.getCatIcon(tx.category)}</div>
        <div class="tx-info">
          <div class="tx-desc">${tx.description}</div>
          <div class="tx-date">${new Date(tx.date).toLocaleDateString('fr-FR')} · ${tx.category}</div>
        </div>
        <span class="tx-amount ${tx.type}">
          ${tx.type === 'income' ? '+' : '−'}${Data.formatAmount(tx.amount)}
        </span>
        <button class="tx-edit" data-id="${tx.id}" title="Modifier">✏️</button>
        <button class="tx-delete" data-id="${tx.id}" title="Supprimer">🗑</button>
      </div>
    `).join('');

    // Édition au clic sur la ligne (sauf sur les boutons)
    container.querySelectorAll('.tx-item-editable').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.tx-delete') || e.target.closest('.tx-edit')) return;
        const tx = Data.getTransactions().find(t => t.id === row.dataset.id);
        if (tx && typeof window._openTxModalEdit === 'function') window._openTxModalEdit(tx);
      });
    });

    // Édition via bouton crayon
    container.querySelectorAll('.tx-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tx = Data.getTransactions().find(t => t.id === btn.dataset.id);
        if (tx && typeof window._openTxModalEdit === 'function') window._openTxModalEdit(tx);
      });
    });

    // Suppression
    container.querySelectorAll('.tx-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Data.deleteTransaction(btn.dataset.id);
        showToast('Transaction supprimée.');
        if (typeof window.renderTransactions === 'function') window.renderTransactions();
        if (typeof window.updateDashboard    === 'function') window.updateDashboard();
      });
    });
  };

  // ════════ RENDER TRANSACTIONS RÉCENTES (dashboard) ════════

  window.renderRecentTx = function () {
    const container = document.getElementById('recentTx');
    if (!container) return;

    const txs = Data.getTransactions().slice(0, 5);

    if (!txs.length) {
      container.innerHTML = '<p class="empty-state">Aucune transaction pour l\'instant.</p>';
      return;
    }

    container.innerHTML = txs.map(tx => `
      <div class="tx-item">
        <div class="tx-icon">${Data.getCatIcon(tx.category)}</div>
        <div class="tx-info">
          <div class="tx-desc">${tx.description}</div>
          <div class="tx-date">${new Date(tx.date).toLocaleDateString('fr-FR')}</div>
        </div>
        <span class="tx-amount ${tx.type}">
          ${tx.type === 'income' ? '+' : '−'}${Data.formatAmount(tx.amount)}
        </span>
      </div>
    `).join('');
  };

  // ════════ RENDER BUDGETS ════════

  window.renderBudgets = function () {
    const container = document.getElementById('budgetList');
    const empty     = document.getElementById('budgetEmpty');
    if (!container) return;

    const budgets = Data.getBudgets();

    if (!budgets.length) {
      container.innerHTML = '';
      empty?.classList.remove('hidden');
      return;
    }

    empty?.classList.add('hidden');

    container.innerHTML = budgets.map(b => {
      const spent   = Data.getBudgetSpent(b.category);
      const pct     = Math.min(Math.round((spent / b.amount) * 100), 100);
      const color   = pct >= 100 ? '#f87171' : pct >= 75 ? '#fb923c' : '#34d399';
      return `
        <div class="budget-envelope">
          <div class="budget-env-header">
            <div>
              <div class="budget-env-name">${b.name}</div>
              <div class="budget-env-cat">${b.category}</div>
            </div>
            <button class="tx-delete" data-id="${b.id}" title="Supprimer">🗑</button>
          </div>
          <div class="budget-env-amounts">
            <span>${Data.formatAmount(spent)} dépensé</span>
            <span>sur ${Data.formatAmount(b.amount)}</span>
          </div>
          <div class="budget-env-bar-wrap">
            <div class="budget-env-bar" style="width:${pct}%; background:${color}"></div>
          </div>
          <div style="text-align:right; font-size:0.8rem; color:var(--text-secondary); margin-top:6px">${pct}%</div>
        </div>
      `;
    }).join('');

    // Suppression enveloppe
    container.querySelectorAll('.tx-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        Data.deleteBudget(btn.dataset.id);
        showToast('Enveloppe supprimée.');
        if (typeof window.renderBudgets === 'function') window.renderBudgets();
      });
    });
  };

  // ════════ UPDATE DASHBOARD KPIs ════════

  window.updateDashboard = function () {
    const stats   = Data.getMonthStats();
    const balance = Data.getTotalBalance();

    const fmt = Data.formatAmount;

    const kpiBalance = document.getElementById('kpiBalance');
    const kpiIncome  = document.getElementById('kpiIncome');
    const kpiExpense = document.getElementById('kpiExpense');
    const kpiSaving  = document.getElementById('kpiSaving');

    if (kpiBalance) kpiBalance.textContent = fmt(balance);
    if (kpiIncome)  kpiIncome.textContent  = fmt(stats.income);
    if (kpiExpense) kpiExpense.textContent  = fmt(stats.expense);
    if (kpiSaving)  kpiSaving.textContent   = stats.saving + '%';

    renderRecentTx();

    // Mise à jour des graphiques si charts.js est chargé
    if (typeof drawCharts === 'function') drawCharts();
  };

  // ── Expose showToast globalement si pas déjà fait ──
  if (!window.showToast) {
    window.showToast = function (msg) {
      const toast = document.getElementById('toast');
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.remove('hidden');
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 400);
      }, 3000);
    };
  }

});
