# TaskFlow — ToDo List App

A feature-rich **ToDo List Application** built with **Node.js**, **Express.js**, and **JSON** for data storage.

## 🚀 Features
- Add, Edit, View tasks with title, description, priority, due date & category
- Toggle tasks as complete / incomplete
- **Soft Delete** (Archive) — reversible, tasks can be restored
- **Hard Delete** — permanent removal with confirmation
- Search & filter by priority and status
- Live stats dashboard (total, completed, pending, overdue)
- Priority color coding: 🔴 High / 🟡 Medium / 🟢 Low
- Due date alerts (Overdue, Due Today, Due Tomorrow)
- Premium dark-mode UI with animations

## 🛠️ Tech Stack
- **Backend:** Node.js, Express.js
- **Storage:** JSON file (`data/tasks.json`)
- **Frontend:** HTML, CSS (Vanilla), JavaScript

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/ndlokesh/to-do-list.git
cd to-do-list

# Install dependencies
npm install

# Start the server
npm start
```

Open **http://localhost:3000** in your browser.

## ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Ctrl + N` | Open "Add Task" modal |
| `Ctrl + K` | Focus search bar |
| `Esc` | Close modal |

## 📁 Project Structure
```
to-do-list/
├── server.js          ← Express REST API
├── package.json
├── data/
│   └── tasks.json     ← Auto-created JSON storage
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## 📡 API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks` | Get all active tasks |
| GET | `/api/tasks?archived=true` | Get archived tasks |
| GET | `/api/tasks/:id` | Get single task |
| POST | `/api/tasks` | Create new task |
| PUT | `/api/tasks/:id` | Update task |
| PATCH | `/api/tasks/:id/toggle` | Toggle complete |
| DELETE | `/api/tasks/:id/soft` | Soft delete (archive) |
| PATCH | `/api/tasks/:id/restore` | Restore archived task |
| DELETE | `/api/tasks/:id/hard` | Hard delete (permanent) |
| GET | `/api/stats` | Get task statistics |
