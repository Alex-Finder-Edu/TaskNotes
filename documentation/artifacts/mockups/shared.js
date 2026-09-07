// Tiny bit of interactivity so these static mockups are easier to click
// through - not production logic, just enough to demo the intended behavior.

function initTabs() {
  document.querySelectorAll('[data-tabs]').forEach((group) => {
    const tabs = group.querySelectorAll('.tab');
    const panels = document.querySelectorAll(`[data-tab-panel][data-tab-group="${group.dataset.tabs}"]`);
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        panels.forEach((p) => {
          p.hidden = p.dataset.tabPanel !== tab.dataset.tab;
        });
      });
    });
  });
}

function initModals() {
  document.querySelectorAll('[data-open-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = document.getElementById(btn.dataset.openModal);
      if (modal) modal.hidden = false;
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const overlay = btn.closest('.modal-overlay');
      if (overlay) overlay.hidden = true;
    });
  });
}

function initChecks() {
  document.querySelectorAll('.task-check').forEach((box) => {
    box.addEventListener('click', () => {
      box.classList.toggle('checked');
      box.closest('.task-card')?.classList.toggle('done');
      box.innerHTML = box.classList.contains('checked')
        ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>'
        : '';
    });
  });
}

function initPills(selector = '.pill-option') {
  document.querySelectorAll(selector).forEach((group) => {
    // each pill toggles selection within its own repeat-options container
  });
  document.querySelectorAll('.repeat-options').forEach((group) => {
    group.querySelectorAll('.pill-option').forEach((pill) => {
      pill.addEventListener('click', () => {
        group.querySelectorAll('.pill-option').forEach((p) => p.classList.remove('selected'));
        pill.classList.add('selected');
      });
    });
  });
}

function initThemeCards() {
  document.querySelectorAll('.theme-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      const theme = card.dataset.theme;
      document.documentElement.setAttribute('data-theme', theme === 'light' ? '' : theme);
    });
  });
  document.querySelectorAll('.accent-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.accent-swatch').forEach((s) => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });
  });
  document.querySelectorAll('.switch').forEach((sw) => {
    sw.addEventListener('click', () => sw.classList.toggle('on'));
  });
}

function initCalendar() {
  // Generalized over data-new-modal/data-edit-modal (defaulting to the
  // original task modal ids) so the same click-a-slot behavior can drive
  // either the Tasks calendar or the Log calendar without duplicating this
  // function.
  document.querySelectorAll('.cal-day-col').forEach((col) => {
    const newModalId = col.dataset.newModal || 'new-task-modal';
    const editModalId = col.dataset.editModal || 'edit-task-modal';

    col.querySelectorAll('.cal-slot').forEach((slot) => {
      slot.addEventListener('click', () => {
        const modal = document.getElementById(newModalId);
        if (!modal) return;
        const label = modal.querySelector('[data-slot-time-label]');
        const startTime = modal.querySelector('[data-start-time]') || modal.querySelector('input[type="time"]');
        const startDate = modal.querySelector('[data-start-date]');
        if (startTime) startTime.value = slot.dataset.time;
        if (startDate && slot.dataset.date) startDate.value = slot.dataset.date;
        if (label) label.textContent = slot.dataset.timeLabel;
        modal.hidden = false;
      });
    });

    col.querySelectorAll('.cal-event').forEach((ev) => {
      ev.addEventListener('click', (e) => {
        e.stopPropagation();
        const modal = document.getElementById(editModalId);
        if (modal) modal.hidden = false;
      });
    });
  });
}

// Obsidian-style hierarchical tag input: chips + free-text field + a
// filtered dropdown of previously-used tag paths, sourced from a plain
// `window.MOCK_TAGS` array each page defines before shared.js loads.
function initTagInput() {
  const pool = window.MOCK_TAGS || [];

  document.querySelectorAll('.tag-input').forEach((wrap) => {
    const field = wrap.querySelector('.tag-input-field');
    const chipList = wrap.querySelector('.tag-chip-list');
    const list = wrap.querySelector('.tag-autocomplete');
    if (!field || !list || !chipList) return;
    let activeIndex = 0;

    function currentTags() {
      return Array.from(chipList.querySelectorAll('.tag-chip')).map((c) => c.dataset.tag);
    }

    function renderMatches() {
      const query = field.value.trim().toLowerCase();
      list.innerHTML = '';
      if (!query) {
        list.hidden = true;
        return;
      }
      const existing = currentTags();
      const matches = pool.filter((t) => !existing.includes(t) && t.toLowerCase().includes(query));

      if (matches.length === 0) {
        const li = document.createElement('li');
        li.className = 'tag-autocomplete-empty';
        li.textContent = `No matching tags - press Enter to create "${field.value.trim()}"`;
        list.appendChild(li);
        list.hidden = false;
        return;
      }

      matches.slice(0, 8).forEach((tag, i) => {
        const li = document.createElement('li');
        li.className = 'tag-autocomplete-item' + (i === activeIndex ? ' active' : '');
        li.textContent = tag;
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          addTag(tag);
        });
        list.appendChild(li);
      });
      list.hidden = false;
    }

    function addTag(rawValue) {
      const value = rawValue.trim();
      if (!value || currentTags().includes(value)) {
        field.value = '';
        list.hidden = true;
        return;
      }
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.dataset.tag = value;
      chip.innerHTML = `${value} <button type="button" class="tag-chip-remove" aria-label="Remove tag ${value}">&times;</button>`;
      chip.querySelector('.tag-chip-remove').addEventListener('click', () => chip.remove());
      chipList.appendChild(chip);
      field.value = '';
      activeIndex = 0;
      list.hidden = true;
    }

    field.addEventListener('input', () => {
      activeIndex = 0;
      renderMatches();
    });
    field.addEventListener('focus', renderMatches);
    field.addEventListener('keydown', (e) => {
      const items = list.querySelectorAll('.tag-autocomplete-item');
      if (e.key === 'ArrowDown' && items.length) {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        renderMatches();
      } else if (e.key === 'ArrowUp' && items.length) {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        renderMatches();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = items[activeIndex];
        addTag(active ? active.textContent : field.value);
      } else if (e.key === 'Backspace' && field.value === '') {
        const chips = chipList.querySelectorAll('.tag-chip');
        if (chips.length) chips[chips.length - 1].remove();
      } else if (e.key === 'Escape') {
        list.hidden = true;
      }
    });
    field.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 150));
  });
}

// "Now" buttons next to a start/end date+time pair.
function initNowButtons() {
  document.querySelectorAll('[data-set-now]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.datetime-row');
      if (!row) return;
      const dateInput = row.querySelector('input[type="date"]');
      const timeInput = row.querySelector('input[type="time"]');
      const now = new Date();
      if (dateInput) dateInput.value = now.toISOString().slice(0, 10);
      if (timeInput) timeInput.value = now.toTimeString().slice(0, 5);
    });
  });
}

// "Track time" stopwatch: reveals a Start/Stop timer that, on Stop, fills in
// the modal's end date/time fields with the elapsed-since-Start moment.
function initStopwatch() {
  document.querySelectorAll('[data-track-time]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = btn.parentElement?.querySelector('.stopwatch-panel');
      if (panel) panel.hidden = false;
      btn.hidden = true;
    });
  });

  document.querySelectorAll('.stopwatch-panel').forEach((panel) => {
    const display = panel.querySelector('.stopwatch-display');
    const startBtn = panel.querySelector('[data-stopwatch-start]');
    const stopBtn = panel.querySelector('[data-stopwatch-stop]');
    let startedAt = null;
    let timer = null;

    function tick() {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      display.textContent = `${h}:${m}:${s}`;
    }

    startBtn?.addEventListener('click', () => {
      startedAt = Date.now();
      display.textContent = '00:00:00';
      timer = setInterval(tick, 1000);
      startBtn.disabled = true;
      stopBtn.disabled = false;
    });

    stopBtn?.addEventListener('click', () => {
      clearInterval(timer);
      startBtn.disabled = false;
      stopBtn.disabled = true;
      const modal = panel.closest('.modal');
      const endDate = modal?.querySelector('[data-end-date]');
      const endTime = modal?.querySelector('[data-end-time]');
      const now = new Date();
      if (endDate) endDate.value = now.toISOString().slice(0, 10);
      if (endTime) endTime.value = now.toTimeString().slice(0, 5);
    });
  });
}

// Save-button validation for the Log Event modals: requires a title and an
// end date/time strictly after the start, showing a form-level error instead
// of closing the modal when invalid.
function initEventFormValidation() {
  document.querySelectorAll('[data-save-event]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (!modal) return;
      const title = modal.querySelector('[data-event-title]');
      const startDate = modal.querySelector('[data-start-date]');
      const startTime = modal.querySelector('[data-start-time]');
      const endDate = modal.querySelector('[data-end-date]');
      const endTime = modal.querySelector('[data-end-time]');
      const error = modal.querySelector('[data-form-error]');

      const start = new Date(`${startDate.value}T${startTime.value}`);
      const end = new Date(`${endDate.value}T${endTime.value}`);
      const valid =
        title.value.trim().length > 0 &&
        startDate.value &&
        startTime.value &&
        endDate.value &&
        endTime.value &&
        end > start;

      if (!valid) {
        if (error) error.hidden = false;
        return;
      }
      if (error) error.hidden = true;
      const overlay = modal.closest('.modal-overlay');
      if (overlay) overlay.hidden = true;
    });
  });
}

function initMiniCal() {
  document.querySelectorAll('.mini-cal-day').forEach((day) => {
    day.addEventListener('click', () => {
      if (day.classList.contains('muted')) return;
      document.querySelectorAll('.mini-cal-day').forEach((d) => d.classList.remove('selected'));
      day.classList.add('selected');
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModals();
  initChecks();
  initPills();
  initThemeCards();
  initCalendar();
  initMiniCal();
  initTagInput();
  initNowButtons();
  initStopwatch();
  initEventFormValidation();
});
