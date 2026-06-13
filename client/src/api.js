// In Docker, nginx proxies API requests, so API_BASE should be ''
// In local dev, VITE_API_BASE should be set to 'http://localhost:5134'
const API_BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res;
}

export async function login(username, password) {
  const res = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function register(username, password) {
  const res = await request('/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function logout() {
  return request('/logout', { method: 'POST' }).then(r => r.json());
}

export async function checkAuth() {
  return request('/check_auth').then(r => r.json());
}

export async function fetchTasks() {
  return request('/tasks').then(r => r.json());
}

export async function createTask(data) {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(r => r.json());
}

export async function updateTask(id, data) {
  return request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then(r => r.json());
}

export async function deleteTask(id) {
  return request(`/tasks/${id}`, { method: 'DELETE' }).then(r => r.json());
}

export async function fetchStreak() {
  return request('/streak').then(r => r.json());
}

export async function fetchNotes() {
  return request('/notes').then(r => r.json());
}

export async function createNote(data) {
  return request('/notes', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(r => r.json());
}

export async function updateNote(id, data) {
  return request(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then(r => r.json());
}

export async function deleteNote(id) {
  return request(`/notes/${id}`, { method: 'DELETE' }).then(r => r.json());
}

export async function downloadNotes() {
  const res = await request('/download-notes');
  const blob = await res.blob();
  const filename = getDownloadFilename(res) || 'notes.pdf';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function getDownloadFilename(response) {
  const disposition = response.headers?.get?.('content-disposition');
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) return match[1];
  }
  return 'notes.pdf';
}
