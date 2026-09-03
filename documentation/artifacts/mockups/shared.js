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
  document.querySelectorAll('.cal-slot').forEach((slot) => {
    slot.addEventListener('click', () => {
      const modal = document.getElementById('new-task-modal');
      if (!modal) return;
      const timeInput = modal.querySelector('input[type="time"]');
      const label = modal.querySelector('[data-slot-time-label]');
      if (timeInput) timeInput.value = slot.dataset.time;
      if (label) label.textContent = slot.dataset.timeLabel;
      modal.hidden = false;
    });
  });

  document.querySelectorAll('.cal-event').forEach((ev) => {
    ev.addEventListener('click', (e) => {
      e.stopPropagation();
      const modal = document.getElementById('edit-task-modal');
      if (modal) modal.hidden = false;
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
});
