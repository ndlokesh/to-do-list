const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

function readTasks() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeTasks(tasks) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET all tasks (exclude hard-deleted; include/exclude soft-deleted via query)
app.get('/api/tasks', (req, res) => {
  try {
    const { archived } = req.query; // ?archived=true to see soft-deleted
    let tasks = readTasks().filter(t => !t.hardDeleted);
    if (archived === 'true') {
      // return only archived (soft-deleted)
      tasks = tasks.filter(t => t.deleted);
    } else {
      // return only active tasks
      tasks = tasks.filter(t => !t.deleted);
    }
    // Sort: high → medium → low, then by dueDate asc
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    tasks.sort((a, b) => {
      const pd = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
      if (pd !== 0) return pd;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single task by id
app.get('/api/tasks/:id', (req, res) => {
  try {
    const tasks = readTasks();
    const task = tasks.find(t => t.id === req.params.id && !t.hardDeleted);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create task
app.post('/api/tasks', (req, res) => {
  try {
    const { title, description, priority, dueDate, category } = req.body;
    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const tasks = readTasks();
    const newTask = {
      id: uuidv4(),
      title: title.trim(),
      description: (description || '').trim(),
      priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
      dueDate: dueDate || null,
      category: (category || 'General').trim(),
      completed: false,
      deleted: false,
      hardDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    writeTasks(tasks);
    res.status(201).json({ success: true, message: 'Task created successfully', data: newTask });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update task
app.put('/api/tasks/:id', (req, res) => {
  try {
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === req.params.id && !t.hardDeleted);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Task not found' });

    const { title, description, priority, dueDate, category, completed } = req.body;
    const task = tasks[idx];

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (priority !== undefined && ['high', 'medium', 'low'].includes(priority)) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (category !== undefined) task.category = category.trim();
    if (completed !== undefined) task.completed = Boolean(completed);
    task.updatedAt = new Date().toISOString();

    writeTasks(tasks);
    res.json({ success: true, message: 'Task updated successfully', data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH toggle completed
app.patch('/api/tasks/:id/toggle', (req, res) => {
  try {
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === req.params.id && !t.hardDeleted && !t.deleted);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Task not found' });
    tasks[idx].completed = !tasks[idx].completed;
    tasks[idx].updatedAt = new Date().toISOString();
    writeTasks(tasks);
    res.json({ success: true, message: `Task marked as ${tasks[idx].completed ? 'completed' : 'incomplete'}`, data: tasks[idx] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE soft delete (archive)
app.delete('/api/tasks/:id/soft', (req, res) => {
  try {
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === req.params.id && !t.hardDeleted);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Task not found' });
    tasks[idx].deleted = true;
    tasks[idx].deletedAt = new Date().toISOString();
    tasks[idx].updatedAt = new Date().toISOString();
    writeTasks(tasks);
    res.json({ success: true, message: 'Task archived successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH restore archived task
app.patch('/api/tasks/:id/restore', (req, res) => {
  try {
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === req.params.id && !t.hardDeleted && t.deleted);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Archived task not found' });
    tasks[idx].deleted = false;
    tasks[idx].deletedAt = null;
    tasks[idx].updatedAt = new Date().toISOString();
    writeTasks(tasks);
    res.json({ success: true, message: 'Task restored successfully', data: tasks[idx] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE hard delete (permanent)
app.delete('/api/tasks/:id/hard', (req, res) => {
  try {
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === req.params.id && !t.hardDeleted);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Task not found' });
    tasks[idx].hardDeleted = true;
    tasks[idx].hardDeletedAt = new Date().toISOString();
    writeTasks(tasks);
    res.json({ success: true, message: 'Task permanently deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET stats
app.get('/api/stats', (req, res) => {
  try {
    const tasks = readTasks().filter(t => !t.hardDeleted);
    const active = tasks.filter(t => !t.deleted);
    const archived = tasks.filter(t => t.deleted);
    res.json({
      success: true,
      data: {
        total: active.length,
        completed: active.filter(t => t.completed).length,
        pending: active.filter(t => !t.completed).length,
        archived: archived.length,
        high: active.filter(t => t.priority === 'high').length,
        medium: active.filter(t => t.priority === 'medium').length,
        low: active.filter(t => t.priority === 'low').length,
        overdue: active.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  ToDo List App running at: http://localhost:${PORT}`);
  console.log(`📁  Data file: ${DATA_FILE}\n`);
});
