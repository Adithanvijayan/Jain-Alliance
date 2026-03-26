(() => {
  'use strict';

  // ===== State =====
  let currentTab = 'girls';
  let searchQuery = '';

  // Filter definitions
  // type: 'numeric' | 'dropdown' | 'text'
  const FILTER_DEFS = [
    { key: 'age',        label: 'Age',         type: 'numeric', field: '_age',       operators: ['gt','lt','between','eq','empty','notEmpty'] },
    { key: 'salary',     label: 'Salary',      type: 'numeric', field: '_salaryNum', operators: ['gt','lt','between','eq','empty','notEmpty'] },
    { key: 'height',     label: 'Height (cm)', type: 'numeric', field: '_heightCm',  operators: ['gt','lt','between','eq','empty','notEmpty'] },
    { key: 'rashi',      label: 'Birth Rashi',  type: 'dropdown', field: 'birth_rashi' },
    { key: 'star',       label: 'Birth Star',   type: 'dropdown', field: 'birth_star' },
    { key: 'education',  label: 'Education',    type: 'text', field: 'education',  operators: ['eq','neq','contains','notContains','empty','notEmpty'] },
    { key: 'job',        label: 'Job',           type: 'text', field: 'job',        operators: ['eq','neq','contains','notContains','empty','notEmpty'] },
    { key: 'living',     label: 'Living In',     type: 'text', field: 'living',     operators: ['eq','neq','contains','notContains','empty','notEmpty'] },
    { key: 'fatherName', label: 'Father Name',   type: 'text', field: 'father_name',operators: ['eq','neq','contains','notContains','empty','notEmpty'] },
    { key: 'motherName', label: 'Mother Name',   type: 'text', field: 'mother_name',operators: ['eq','neq','contains','notContains','empty','notEmpty'] },
    { key: 'brothers',   label: 'Brothers',      type: 'text', field: 'brothers',   operators: ['eq','neq','contains','notContains','empty','notEmpty'] },
    { key: 'sisters',    label: 'Sisters',        type: 'text', field: 'sisters',   operators: ['eq','neq','contains','notContains','empty','notEmpty'] },
    { key: 'email',      label: 'Email',          type: 'text', field: 'email',     operators: ['eq','neq','contains','notContains','empty','notEmpty'] },
    { key: 'isNew',      label: 'NEW Tag',        type: 'dropdown', field: '_isNewLabel' },
  ];

  const OP_LABELS = {
    gt: 'Greater than', lt: 'Less than', between: 'Between', eq: 'Equals',
    neq: 'Not equals', contains: 'Contains', notContains: 'Not contains',
    empty: 'Is empty', notEmpty: 'Is not empty'
  };

  // Filter state: { [key]: { op, val, val2 } }
  let filters = {};

  // ===== DOM Elements =====
  const tabBtns = document.querySelectorAll('.tab-btn');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const filterToggleBtn = document.getElementById('filter-toggle');
  const filterPanel = document.getElementById('filter-panel');
  const filterBadge = document.getElementById('filter-badge');
  const resetFiltersBtn = document.getElementById('reset-filters');
  const filterRowsContainer = document.getElementById('filter-rows');
  const cardsGrid = document.getElementById('cards-grid');
  const noResults = document.getElementById('no-results');
  const resetAllBtn = document.getElementById('reset-all');
  const resultsCount = document.getElementById('results-count');
  const girlsCount = document.getElementById('girls-count');
  const boysCount = document.getElementById('boys-count');

  const { girls, boys, displayHeaders, mainFields, secondaryFields } = APP_DATA;

  // ===== Pre-compute derived fields =====
  function precompute(persons) {
    persons.forEach(p => {
      p._age = computeAge(p.dob);
      p._heightCm = parseHeightToCm(p.height);
      p._salaryNum = parseSalary(p.salary);
      p._isNewLabel = p.is_new ? 'NEW' : 'Existing';
    });
  }

  function computeAge(dobStr) {
    if (!dobStr || !dobStr.trim()) return null;
    const d = new Date(dobStr);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age >= 0 ? age : null;
  }

  function parseHeightToCm(h) {
    if (!h || !h.trim()) return null;
    const s = h.trim();

    // Time format like "05:08:00" → 5 feet 8 inches
    const timeMatch = s.match(/^(\d{2}):(\d{2}):\d{2}$/);
    if (timeMatch) {
      const feet = parseInt(timeMatch[1], 10);
      const inches = parseInt(timeMatch[2], 10);
      if (feet >= 4 && feet <= 7 && inches < 12) {
        return Math.round(feet * 30.48 + inches * 2.54);
      }
    }

    // "X feet Y inches" or "Xft Yinch" patterns
    const feetInchesMatch = s.match(/(\d+)\s*(?:feet|feer|ft|Ft|')\s*[&]?\s*(\d+)\s*(?:inch|inches|in|"|''|cms?)?/i);
    if (feetInchesMatch) {
      const feet = parseInt(feetInchesMatch[1], 10);
      const inches = parseInt(feetInchesMatch[2], 10);
      if (feet >= 3 && feet <= 8 && inches < 12) {
        return Math.round(feet * 30.48 + inches * 2.54);
      }
    }

    // "X' Y"" or X'Y patterns
    const primeMatch = s.match(/(\d+)\s*['′]\s*(\d+)/);
    if (primeMatch) {
      const feet = parseInt(primeMatch[1], 10);
      const inches = parseInt(primeMatch[2], 10);
      if (feet >= 3 && feet <= 8 && inches < 12) {
        return Math.round(feet * 30.48 + inches * 2.54);
      }
    }

    // Already in cm: extract number, if >= 100 and < 250
    const numMatch = s.match(/([\d.]+)/);
    if (numMatch) {
      const num = parseFloat(numMatch[1]);

      // Check if explicitly cm
      if (/cm|centimetre/i.test(s) && num >= 50 && num < 250) {
        return Math.round(num);
      }

      // Meters: 1.5 to 2.2
      if (num >= 1.2 && num <= 2.3 && /m(?!\w)|meter/i.test(s)) {
        return Math.round(num * 100);
      }

      // Already cm (100-250)
      if (num >= 100 && num < 250) {
        return Math.round(num);
      }

      // Meters without label (1.5-2.3 range, likely meters)
      if (num >= 1.5 && num < 2.3 && !s.includes("'") && !/feet|ft|inch/i.test(s)) {
        return Math.round(num * 100);
      }

      // Feet.inches format like "5.5" meaning 5 feet 5 inches (Indian convention)
      if (num >= 3 && num < 8) {
        const feet = Math.floor(num);
        const decPart = s.match(/\d+\.(\d+)/);
        let inches = 0;
        if (decPart) {
          const inchStr = decPart[1];
          inches = parseInt(inchStr, 10);
          if (inches >= 12) inches = Math.round((num - feet) * 12); // fallback for weird formats
        }
        if (inches < 12) {
          return Math.round(feet * 30.48 + inches * 2.54);
        }
      }
    }

    return null;
  }

  function parseSalary(s) {
    if (!s || !s.trim() || s.trim() === '-' || s.trim().toLowerCase() === 'na') return null;
    const str = s.trim().toLowerCase();

    // LPA (lakhs per annum) → monthly: lpa * 100000 / 12
    const lpaMatch = str.match(/([\d.]+)\s*(?:lpa|l\.p\.a)/i);
    if (lpaMatch) return Math.round(parseFloat(lpaMatch[1]) * 100000 / 12);

    // "X lakh per month" or "X lakhs"
    const lakhMonthMatch = str.match(/([\d.]+)\s*(?:lakh?s?|lac)\s*(?:per month|pm|p\.m)?/i);
    if (lakhMonthMatch) {
      const val = parseFloat(lakhMonthMatch[1]) * 100000;
      if (/per month|pm|p\.m|monthly/i.test(str)) return Math.round(val);
      if (/per annum|pa|p\.a|annual/i.test(str)) return Math.round(val / 12);
      return Math.round(val); // assume monthly context
    }

    // "L PER MONTH" like "1.25 L PER MONTH"
    const lMonthMatch = str.match(/([\d.]+)\s*l\s*(?:per month|pm)/i);
    if (lMonthMatch) return Math.round(parseFloat(lMonthMatch[1]) * 100000);

    // Range like "15,000 to 20,000" or "11000to 13000"→ take lower
    const rangeMatch = str.match(/([\d,]+)\s*(?:to|-)\s*([\d,]+)/);
    if (rangeMatch) return parseInt(rangeMatch[1].replace(/,/g, ''), 10);

    // Plain number with commas: "1,50,000"
    const plainNum = str.replace(/[,\s]/g, '').match(/^(\d+)/);
    if (plainNum) {
      const n = parseInt(plainNum[1], 10);
      if (n > 0) return n;
    }

    return null;
  }

  // ===== Init =====
  function init() {
    precompute(girls);
    precompute(boys);
    girlsCount.textContent = girls.length;
    boysCount.textContent = boys.length;
    buildFilterUI();
    bindEvents();
    render();
  }

  // ===== Build Filter UI =====
  function buildFilterUI() {
    filterRowsContainer.innerHTML = '';
    const data = currentTab === 'girls' ? girls : boys;

    FILTER_DEFS.forEach(def => {
      const row = document.createElement('div');
      row.className = 'filter-row';
      row.dataset.filterKey = def.key;

      let html = `<span class="filter-row-label">${escapeHtml(def.label)}</span>`;

      if (def.type === 'numeric') {
        html += `<select class="filter-operator" data-key="${def.key}">
          <option value="">-- No filter --</option>
          ${def.operators.map(op => `<option value="${op}">${OP_LABELS[op]}</option>`).join('')}
        </select>`;
        html += `<input type="number" class="filter-value" data-key="${def.key}" placeholder="Value" style="display:none;">`;
        html += `<span class="filter-sep" data-key="${def.key}" style="display:none;">and</span>`;
        html += `<input type="number" class="filter-value-to" data-key="${def.key}" placeholder="To" style="display:none;">`;
      } else if (def.type === 'dropdown') {
        const vals = [...new Set(data.map(p => p[def.field]).filter(v => v && String(v).trim()))].sort();
        html += `<select class="filter-value" data-key="${def.key}">
          <option value="">All</option>
          ${vals.map(v => `<option value="${escapeHtml(String(v))}">${escapeHtml(String(v))}</option>`).join('')}
        </select>`;
      } else if (def.type === 'text') {
        html += `<select class="filter-operator" data-key="${def.key}">
          <option value="">-- No filter --</option>
          ${def.operators.map(op => `<option value="${op}">${OP_LABELS[op]}</option>`).join('')}
        </select>`;
        html += `<input type="text" class="filter-value" data-key="${def.key}" placeholder="Value" style="display:none;">`;
      }

      html += `<button class="filter-clear-row" data-key="${def.key}" title="Clear this filter">&times;</button>`;
      row.innerHTML = html;
      filterRowsContainer.appendChild(row);
    });

    // Bind filter interactions
    bindFilterEvents();
  }

  function bindFilterEvents() {
    // Operator change: show/hide value inputs
    filterRowsContainer.querySelectorAll('.filter-operator').forEach(sel => {
      sel.addEventListener('change', () => {
        const key = sel.dataset.key;
        const op = sel.value;
        const row = sel.closest('.filter-row');
        const valInput = row.querySelector('.filter-value');
        const valTo = row.querySelector('.filter-value-to');
        const sep = row.querySelector('.filter-sep');

        if (op === 'empty' || op === 'notEmpty' || !op) {
          if (valInput) valInput.style.display = 'none';
          if (valTo) valTo.style.display = 'none';
          if (sep) sep.style.display = 'none';
        } else if (op === 'between') {
          if (valInput) valInput.style.display = '';
          if (valTo) valTo.style.display = '';
          if (sep) sep.style.display = '';
        } else {
          if (valInput) valInput.style.display = '';
          if (valTo) valTo.style.display = 'none';
          if (sep) sep.style.display = 'none';
        }

        updateFilterState();
        render();
      });
    });

    // Value changes
    filterRowsContainer.querySelectorAll('.filter-value, .filter-value-to').forEach(input => {
      const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
      let debounceTimer;
      input.addEventListener(eventType, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          updateFilterState();
          render();
        }, eventType === 'input' ? 250 : 0);
      });
    });

    // Clear row buttons
    filterRowsContainer.querySelectorAll('.filter-clear-row').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const row = btn.closest('.filter-row');
        row.querySelectorAll('select').forEach(s => s.value = '');
        row.querySelectorAll('input').forEach(i => { i.value = ''; i.style.display = 'none'; });
        const sep = row.querySelector('.filter-sep');
        if (sep) sep.style.display = 'none';
        delete filters[key];
        updateFilterBadge();
        render();
      });
    });
  }

  function updateFilterState() {
    filters = {};
    FILTER_DEFS.forEach(def => {
      const row = filterRowsContainer.querySelector(`[data-filter-key="${def.key}"]`);
      if (!row) return;

      if (def.type === 'dropdown') {
        const sel = row.querySelector('.filter-value');
        if (sel && sel.value) {
          filters[def.key] = { op: 'eq', val: sel.value };
        }
      } else {
        const opSel = row.querySelector('.filter-operator');
        if (!opSel || !opSel.value) return;
        const op = opSel.value;
        const valInput = row.querySelector('.filter-value');
        const valToInput = row.querySelector('.filter-value-to');
        const val = valInput ? valInput.value.trim() : '';
        const val2 = valToInput ? valToInput.value.trim() : '';

        if (op === 'empty' || op === 'notEmpty') {
          filters[def.key] = { op };
        } else if (op === 'between' && val && val2) {
          filters[def.key] = { op, val, val2 };
        } else if (op && val) {
          filters[def.key] = { op, val };
        }
      }
    });
    updateFilterBadge();
  }

  // ===== Bind Events =====
  function bindEvents() {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.body.classList.toggle('boys-active', currentTab === 'boys');
        filters = {};
        buildFilterUI();
        render();
      });
    });

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim().toLowerCase();
        clearSearchBtn.classList.toggle('visible', searchQuery.length > 0);
        render();
      }, 200);
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.remove('visible');
      render();
    });

    filterToggleBtn.addEventListener('click', () => {
      filterPanel.classList.toggle('open');
      filterToggleBtn.classList.toggle('active');
    });

    resetFiltersBtn.addEventListener('click', resetAll);
    resetAllBtn.addEventListener('click', resetAll);
  }

  function resetAll() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.remove('visible');
    filters = {};
    buildFilterUI();
    updateFilterBadge();
    render();
  }

  function updateFilterBadge() {
    const count = Object.keys(filters).length;
    filterBadge.style.display = count > 0 ? 'inline-block' : 'none';
    filterBadge.textContent = count;
  }

  // ===== Filter & Search Logic =====
  function getFilteredData() {
    let data = currentTab === 'girls' ? [...girls] : [...boys];

    // Search
    if (searchQuery) {
      data = data.filter(p => {
        const searchable = [
          p.name, p.dob, p.education, p.job, p.salary,
          p.height, p.living, p.birth_rashi, p.birth_star,
          p.father_name, p.mother_name, p.email,
          p.is_new ? 'new' : '',
          p._age != null ? String(p._age) : '',
          p._heightCm != null ? String(p._heightCm) : ''
        ].join(' ').toLowerCase();
        return searchable.includes(searchQuery);
      });
    }

    // Apply each filter
    Object.entries(filters).forEach(([key, f]) => {
      const def = FILTER_DEFS.find(d => d.key === key);
      if (!def) return;

      data = data.filter(p => {
        const rawVal = p[def.field];

        if (f.op === 'empty') {
          return rawVal == null || String(rawVal).trim() === '' || rawVal === 'NA' || rawVal === '-';
        }
        if (f.op === 'notEmpty') {
          return rawVal != null && String(rawVal).trim() !== '' && rawVal !== 'NA' && rawVal !== '-';
        }

        if (def.type === 'numeric') {
          const num = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
          if (num == null || isNaN(num)) return false;
          const target = parseFloat(f.val);
          if (isNaN(target)) return true;
          if (f.op === 'gt') return num > target;
          if (f.op === 'lt') return num < target;
          if (f.op === 'eq') return num === target;
          if (f.op === 'between') {
            const target2 = parseFloat(f.val2);
            if (isNaN(target2)) return true;
            return num >= Math.min(target, target2) && num <= Math.max(target, target2);
          }
        } else if (def.type === 'dropdown') {
          return String(rawVal).toLowerCase() === String(f.val).toLowerCase();
        } else if (def.type === 'text') {
          const sv = String(rawVal || '').toLowerCase();
          const tv = String(f.val || '').toLowerCase();
          if (f.op === 'eq') return sv === tv;
          if (f.op === 'neq') return sv !== tv;
          if (f.op === 'contains') return sv.includes(tv);
          if (f.op === 'notContains') return !sv.includes(tv);
        }
        return true;
      });
    });

    return data;
  }

  // ===== Render Cards =====
  function render() {
    const data = getFilteredData();
    resultsCount.textContent = `${data.length} profile${data.length !== 1 ? 's' : ''} found`;

    if (data.length === 0) {
      cardsGrid.style.display = 'none';
      noResults.style.display = 'block';
      return;
    }

    cardsGrid.style.display = 'grid';
    noResults.style.display = 'none';

    const fragment = document.createDocumentFragment();

    data.forEach((person, idx) => {
      const card = document.createElement('div');
      card.className = 'card';

      const initials = getInitials(person.name);
      const newTag = person.is_new ? '<span class="new-tag">NEW</span>' : '';
      const subtitle = [person.job, person.living].filter(v => v && v.trim()).join(' \u2022 ') || '\u2014';

      let mainHTML = '';
      mainFields.forEach(field => {
        if (field === 'name') return;
        const label = displayHeaders[field] || field;
        let value = person[field];
        let badge = '';

        // Age badge for DOB
        if (field === 'dob' && person._age != null) {
          badge = `<span class="computed-badge">${person._age} yrs</span>`;
        }

        // Height cm badge
        if (field === 'height' && person._heightCm != null) {
          badge = `<span class="computed-badge">${person._heightCm} cm</span>`;
        }

        const displayVal = value && String(value).trim()
          ? escapeHtml(String(value)) + badge
          : '<span class="empty">\u2014</span>';

        mainHTML += `
          <div class="detail-item">
            <span class="detail-label">${escapeHtml(label)}</span>
            <span class="detail-value${!value || !String(value).trim() ? ' empty' : ''}">${displayVal}</span>
          </div>`;
      });

      let secHTML = '';
      secondaryFields.forEach(field => {
        const label = displayHeaders[field] || field;
        const value = person[field];
        const displayVal = value && String(value).trim() ? escapeHtml(String(value)) : '<span class="empty">\u2014</span>';
        secHTML += `
          <div class="detail-item">
            <span class="detail-label">${escapeHtml(label)}</span>
            <span class="detail-value${!value || !String(value).trim() ? ' empty' : ''}">${displayVal}</span>
          </div>`;
      });

      card.innerHTML = `
        <div class="card-header">
          <div class="card-avatar">${escapeHtml(initials)}</div>
          <div class="card-title-area">
            <div class="card-name">${escapeHtml(person.name)} ${newTag}</div>
            <div class="card-subtitle">${escapeHtml(subtitle)}</div>
          </div>
        </div>
        <div class="card-main">${mainHTML}</div>
        <button class="card-secondary-toggle" data-idx="${idx}">
          <span class="toggle-arrow">\u25B6</span> More Details
        </button>
        <div class="card-secondary" data-sec="${idx}">
          <div class="card-secondary-inner">${secHTML}</div>
        </div>`;

      fragment.appendChild(card);
    });

    cardsGrid.innerHTML = '';
    cardsGrid.appendChild(fragment);

    // Bind toggle events
    cardsGrid.querySelectorAll('.card-secondary-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.idx;
        const sec = cardsGrid.querySelector(`[data-sec="${idx}"]`);
        btn.classList.toggle('open');
        sec.classList.toggle('open');
      });
    });
  }

  // ===== Helpers =====
  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0];
    return parts[0][0] + parts[parts.length - 1][0];
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Start =====
  init();
})();
