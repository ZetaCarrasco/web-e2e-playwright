const API_BASE = '/api';

const els = {
  loginView: document.getElementById('login-view'),
  tasksView: document.getElementById('tasks-view'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  logoutBtn: document.getElementById('logout-btn'),
  taskForm: document.getElementById('task-form'),
  taskTitle: document.getElementById('task-title'),
  taskPriority: document.getElementById('task-priority'),
  taskError: document.getElementById('task-error'),
  taskList: document.getElementById('task-list'),
  filters: document.querySelectorAll('.filter-btn'),
};

let currentFilter = 'all';

function getToken() {
  return sessionStorage.getItem('token');
}

function setToken(token) {
  if (token) sessionStorage.setItem('token', token);
  else sessionStorage.removeItem('token');
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

function showView(view) {
  els.loginView.hidden = view !== 'login';
  els.tasksView.hidden = view !== 'tasks';
}

function renderTasks(tasks) {
  const filtered = tasks.filter((t) => {
    if (currentFilter === 'pending') return !t.done;
    if (currentFilter === 'done') return t.done;
    return true;
  });

  els.taskList.innerHTML = '';
  for (const task of filtered) {
    const li = document.createElement('li');
    li.className = `task-item${task.done ? ' done' : ''}`;
    li.dataset.testid = `task-item-${task.id}`;

    li.innerHTML = `
      <input type="checkbox" data-testid="task-toggle-${task.id}" ${task.done ? 'checked' : ''} />
      <span class="task-title" data-testid="task-title-${task.id}">${escapeHtml(task.title)}</span>
      <span class="priority-badge priority-${task.priority}" data-testid="task-priority-${task.id}">${task.priority}</span>
      <button data-testid="task-delete-${task.id}">Eliminar</button>
    `;

    li.querySelector('input[type="checkbox"]').addEventListener('change', async (e) => {
      await api(`/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ done: e.target.checked }),
      });
      await loadTasks();
    });

    li.querySelector('button').addEventListener('click', async () => {
      await api(`/tasks/${task.id}`, { method: 'DELETE' });
      await loadTasks();
    });

    els.taskList.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadTasks() {
  const tasks = await api('/tasks');
  renderTasks(tasks);
}

els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.loginError.hidden = true;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  try {
    const { token } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(token);
    showView('tasks');
    await loadTasks();
  } catch (err) {
    els.loginError.textContent = err.message;
    els.loginError.hidden = false;
  }
});

els.logoutBtn.addEventListener('click', async () => {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch (_) {
    // ignore — token may already be invalid
  }
  setToken(null);
  showView('login');
});

els.taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  els.taskError.hidden = true;
  const title = els.taskTitle.value;
  const priority = els.taskPriority.value;
  try {
    await api('/tasks', { method: 'POST', body: JSON.stringify({ title, priority }) });
    els.taskTitle.value = '';
    await loadTasks();
  } catch (err) {
    els.taskError.textContent = err.message;
    els.taskError.hidden = false;
  }
});

els.filters.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    els.filters.forEach((b) => b.classList.toggle('active', b === btn));
    loadTasks();
  });
});

(async function init() {
  if (getToken()) {
    try {
      await loadTasks();
      showView('tasks');
      return;
    } catch (_) {
      setToken(null);
    }
  }
  showView('login');
})();
