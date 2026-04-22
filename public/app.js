/* ════════════════════════════════════════════════════════════════
   TaskFlow — Frontend Application Logic
   ════════════════════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────────────────────
let allTasks   = [];
let currentView = 'active'; // 'active' | 'archived'
let isSidebarOpen = true;

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
  loadStats();
  // Set today as the default minimum date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('task-due').min = today;
});

// ── API Helpers ───────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Load Tasks ────────────────────────────────────────────────────
async function loadTasks() {
  try {
    const url = currentView === 'archived' ? '/api/tasks?archived=true' : '/api/tasks';
    const data = await apiFetch(url);
    allTasks = data.data;
    renderTasks(allTasks);
  } catch (err) {
    showToast('Failed to load tasks: ' + err.message, 'error');
  }
}

// ── Load Stats ────────────────────────────────────────────────────
async function loadStats() {
  try {
    const data = await apiFetch('/api/stats');
    const s = data.data;
    document.getElementById('stat-total').textContent    = s.total;
    document.getElementById('stat-completed').textContent = s.completed;
    document.getElementById('stat-pending').textContent  = s.pending;
    document.getElementById('stat-overdue').textContent  = s.overdue;
    document.getElementById('stat-high').textContent     = s.high;
    document.getElementById('stat-medium').textContent   = s.medium;
    document.getElementById('stat-low').textContent      = s.low;
    document.getElementById('badge-active').textContent  = s.total;
    document.getElementById('badge-archived').textContent = s.archived;

    const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('progress-label').textContent = pct + '% Done';
  } catch (_) {}
}

// ── Render Tasks ──────────────────────────────────────────────────
function renderTasks(tasks) {
  const grid  = document.getElementById('task-grid');
  const empty = document.getElementById('empty-state');
  grid.innerHTML = '';

  if (tasks.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tasks.forEach(task => {
    grid.appendChild(createCard(task));
  });
}

function createCard(task) {
  const card = document.createElement('div');
  card.className = `task-card ${task.priority} ${task.completed ? 'completed-card' : ''}`;
  card.setAttribute('data-id', task.id);

  const dueBadge = getDueBadge(task);
  const isArchived = currentView === 'archived';

  card.innerHTML = `
    <div class="card-top">
      <div class="task-checkbox ${task.completed ? 'checked' : ''}"
           id="chk-${task.id}"
           onclick="toggleTask('${task.id}')"
           title="${task.completed ? 'Mark incomplete' : 'Mark complete'}"
           role="checkbox" aria-checked="${task.completed}">
      </div>
      <div class="card-title-wrap">
        <div class="task-title">${escHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escHtml(task.description)}</div>` : ''}
      </div>
    </div>

    <div class="card-meta">
      <span class="badge priority-${task.priority}">
        ${task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'} ${capitalize(task.priority)}
      </span>
      ${task.category ? `<span class="badge category">📁 ${escHtml(task.category)}</span>` : ''}
      ${dueBadge}
    </div>

    <div class="card-actions">
      ${!isArchived ? `
        <button class="card-btn edit"    onclick="openEditModal('${task.id}')">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        <button class="card-btn archive" onclick="archiveTask('${task.id}')">
          <svg viewBox="0 0 24 24"><path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5"/><path d="M10 12h4"/></svg>
          Archive
        </button>
      ` : `
        <button class="card-btn restore" onclick="restoreTask('${task.id}')">
          <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.65L1 10"/></svg>
          Restore
        </button>
      `}
      <button class="card-btn delete" onclick="confirmHardDelete('${task.id}', \`${escHtml(task.title).replace(/`/g, "'")}\`)">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        Delete
      </button>
    </div>
  `;
  return card;
}

function getDueBadge(task) {
  if (!task.dueDate) return '';
  const due  = new Date(task.dueDate);
  const now  = new Date();
  now.setHours(0,0,0,0);
  const diff = Math.ceil((due - now) / (1000*60*60*24));
  let cls = 'due';
  let label = formatDate(task.dueDate);
  if (!task.completed) {
    if (diff < 0)  { cls = 'due overdue';  label = '⚠ Overdue'; }
    else if (diff === 0) { cls = 'due due-soon'; label = '⏰ Due Today'; }
    else if (diff === 1) { cls = 'due due-soon'; label = '⏰ Due Tomorrow'; }
  }
  return `<span class="badge ${cls}">📅 ${label}</span>`;
}

// ── Filter & Search ───────────────────────────────────────────────
function filterTasks() {
  const q        = document.getElementById('search-input').value.toLowerCase();
  const priority = document.getElementById('filter-priority').value;
  const status   = document.getElementById('filter-status').value;

  const filtered = allTasks.filter(t => {
    const matchQ = !q || t.title.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q) || (t.category||'').toLowerCase().includes(q);
    const matchP = !priority || t.priority === priority;
    const matchS = !status || (status === 'completed' ? t.completed : !t.completed);
    return matchQ && matchP && matchS;
  });
  renderTasks(filtered);
}

// ── Switch View ───────────────────────────────────────────────────
function switchView(view) {
  currentView = view;
  document.getElementById('nav-active').classList.toggle('active', view === 'active');
  document.getElementById('nav-archived').classList.toggle('active', view === 'archived');
  document.getElementById('page-title').textContent = view === 'active' ? 'All Tasks' : 'Archived Tasks';
  document.getElementById('btn-add-task').style.display = view === 'archived' ? 'none' : '';
  document.getElementById('filter-status').style.display = view === 'archived' ? 'none' : '';
  // Reset filters
  document.getElementById('search-input').value = '';
  document.getElementById('filter-priority').value = '';
  document.getElementById('filter-status').value = '';
  loadTasks();
}

// ── Sidebar ───────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.querySelector('.main-content');
  isSidebarOpen = !isSidebarOpen;
  sidebar.classList.toggle('hidden', !isSidebarOpen);
  sidebar.classList.toggle('open', isSidebarOpen);
  main.classList.toggle('full', !isSidebarOpen);
}

// ── Modal ─────────────────────────────────────────────────────────
function openModal() {
  document.getElementById('task-id').value       = '';
  document.getElementById('task-title').value    = '';
  document.getElementById('task-desc').value     = '';
  document.getElementById('task-priority').value = 'medium';
  document.getElementById('task-category').value = '';
  document.getElementById('task-due').value      = '';
  document.getElementById('modal-title').textContent        = 'New Task';
  document.getElementById('form-submit-btn').textContent    = 'Create Task';
  document.getElementById('modal-overlay').classList.add('open');
  setTimeout(() => document.getElementById('task-title').focus(), 50);
}

async function openEditModal(id) {
  try {
    const data = await apiFetch(`/api/tasks/${id}`);
    const t = data.data;
    document.getElementById('task-id').value       = t.id;
    document.getElementById('task-title').value    = t.title;
    document.getElementById('task-desc').value     = t.description || '';
    document.getElementById('task-priority').value = t.priority;
    document.getElementById('task-category').value = t.category || '';
    document.getElementById('task-due').value      = t.dueDate ? t.dueDate.split('T')[0] : '';
    document.getElementById('modal-title').textContent     = 'Edit Task';
    document.getElementById('form-submit-btn').textContent = 'Save Changes';
    document.getElementById('modal-overlay').classList.add('open');
    setTimeout(() => document.getElementById('task-title').focus(), 50);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('open');
}

// ── Submit Task (Create / Update) ─────────────────────────────────
async function submitTask(e) {
  e.preventDefault();
  const id       = document.getElementById('task-id').value;
  const title    = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const priority = document.getElementById('task-priority').value;
  const category = document.getElementById('task-category').value.trim() || 'General';
  const dueDate  = document.getElementById('task-due').value;

  if (!title) { showToast('Title is required!', 'error'); return; }

  const btn = document.getElementById('form-submit-btn');
  btn.disabled = true;
  btn.textContent = id ? 'Saving…' : 'Creating…';

  try {
    if (id) {
      await apiFetch(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, description, priority, category, dueDate }),
      });
      showToast('Task updated successfully! ✏️', 'success');
    } else {
      await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, description, priority, category, dueDate }),
      });
      showToast('Task created successfully! 🎉', 'success');
    }
    document.getElementById('modal-overlay').classList.remove('open');
    await Promise.all([loadTasks(), loadStats()]);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = id ? 'Save Changes' : 'Create Task';
  }
}

// ── Toggle Task ───────────────────────────────────────────────────
async function toggleTask(id) {
  try {
    const data = await apiFetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' });
    const done = data.data.completed;
    showToast(done ? 'Task completed! ✅' : 'Task marked as pending', done ? 'success' : 'info');
    await Promise.all([loadTasks(), loadStats()]);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Archive (Soft Delete) ─────────────────────────────────────────
async function archiveTask(id) {
  try {
    await apiFetch(`/api/tasks/${id}/soft`, { method: 'DELETE' });
    showToast('Task archived 📦', 'warning');
    await Promise.all([loadTasks(), loadStats()]);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Restore ───────────────────────────────────────────────────────
async function restoreTask(id) {
  try {
    await apiFetch(`/api/tasks/${id}/restore`, { method: 'PATCH' });
    showToast('Task restored! 🔄', 'success');
    await Promise.all([loadTasks(), loadStats()]);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Hard Delete ───────────────────────────────────────────────────
function confirmHardDelete(id, title) {
  if (!confirm(`⚠️ Permanently delete "${title}"?\n\nThis cannot be undone.`)) return;
  hardDeleteTask(id);
}

async function hardDeleteTask(id) {
  try {
    await apiFetch(`/api/tasks/${id}/hard`, { method: 'DELETE' });
    showToast('Task permanently deleted 🗑️', 'error');
    await Promise.all([loadTasks(), loadStats()]);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${escHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

// ── Keyboard shortcuts ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('modal-overlay').classList.remove('open');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search-input').focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    if (currentView === 'active') openModal();
  }
});

// ── Utils ─────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
