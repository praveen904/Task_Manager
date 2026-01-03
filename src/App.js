import { useState, useEffect } from "react";
import "./App.css";

function App() {
  /* ================= AUTH ================= */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  /* ================= TASK ================= */
  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Low");
  const [dueDate, setDueDate] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");

  const priorityOrder = { High: 1, Medium: 2, Low: 3 };

  /* ================= LOAD STORAGE ================= */
  useEffect(() => {
    const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
    // localStorage fallback only for quick demo or when backend not available
    const savedTasks = JSON.parse(localStorage.getItem("tasks")) || [];

    if (loggedUser) {
      setIsLoggedIn(true);
      setUsername(loggedUser.name || loggedUser.email || loggedUser.username);
      setRole(loggedUser.role);

      // Verify token and fetch profile if token exists
      if (loggedUser.token) {
        fetch("http://localhost:5001/me", {
          headers: { Authorization: `Bearer ${loggedUser.token}` }
        })
          .then(r => r.json())
          .then(data => {
            if (!data || data.message) {
              console.warn('Failed to fetch profile', data);
            } else {
              setUsername(data.name || data.email);
              setRole(data.role);
            }
          })
          .catch(err => console.error('Profile fetch error:', err));

        // fetch tasks from backend
        fetchTasks();
      }
    }

    // initial fallback
    setTasks(savedTasks);
  }, []);

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  /* ================= SIGNUP ================= */
  const signup = () => {
    if (!username || !password || !role) return;
    // keep local signup for quick demo (role saved in lowercase)
    localStorage.setItem(
      "user",
      JSON.stringify({ username, password, role: role.toLowerCase() })
    );
    alert("Signup successful. Please login.");
    setShowLogin(true);
    setPassword("");
  };

  /* ================= LOGIN ================= */
  const login = async () => {
    if (!username || !password) return alert('Email and password required');

    try {
      const res = await fetch("http://localhost:5001/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Login failed');
        return;
      }

      // save token and role
      localStorage.setItem(
        "loggedUser",
        JSON.stringify({ email: username, token: data.token, role: data.role })
      );

      setRole(data.role);
      setIsLoggedIn(true);
      setPassword("");

      // fetch profile to get the user's name and update UI/storage
      try {
        const profileRes = await fetch("http://localhost:5001/me", {
          headers: { Authorization: `Bearer ${data.token}` }
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUsername(profile.name || profile.email);
          // update stored loggedUser with name
          localStorage.setItem(
            "loggedUser",
            JSON.stringify({ email: username, token: data.token, role: data.role, name: profile.name })
          );
        }
      } catch (err) {
        console.error('Profile fetch after login error', err);
      }
    } catch (err) {
      console.error('Login error', err);
      alert('Network error');
    }
  };

  const logout = () => {
    localStorage.removeItem("loggedUser");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setRole("");
    setShowLogin(false);
  };

  /* ================= TASK LOGIC ================= */
  const addTask = async () => {
    if (!title.trim()) return;

    const logged = JSON.parse(localStorage.getItem('loggedUser')) || {};

    // If logged in with backend token, POST there
    if (logged.token) {
      try {
        const res = await fetch('http://localhost:5001/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${logged.token}` },
          body: JSON.stringify({ title, description: desc, priority, dueDate })
        });
        if (!res.ok) {
          let errMsg = res.statusText;
          try { const errBody = await res.json(); errMsg = errBody.message || JSON.stringify(errBody); } catch(e){}
          console.error('addTask failed', res.status, errMsg);
          return alert('Failed to add task: ' + errMsg);
        }
        const newTask = await res.json();
        setTasks(prev => [...prev, newTask]);
      } catch (err) {
        console.error('addTask POST error', err);
        alert('Network error');
      }
    } else {
      // fallback local-only behavior
      const now = new Date().toLocaleString();
      setTasks([
        ...tasks,
        {
          id: Date.now(),
          title,
          description: desc,
          priority,
          dueDate,
          status: "Pending",
          owner: username,
          ownerRole: role,
          createdAt: now,
          updatedAt: now
        }
      ]);
    }

    setTitle("");
    setDesc("");
    setPriority("Low");
    setDueDate("");
  };

  const markDone = async (id) => {
    const logged = JSON.parse(localStorage.getItem('loggedUser')) || {};

    if (logged.token) {
      try {
        const res = await fetch(`http://localhost:5001/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${logged.token}` },
          body: JSON.stringify({ status: 'Completed' })
        });
        if (!res.ok) return alert('Failed to update task');
        const updated = await res.json();
        setTasks(tasks.map(t => (t.id === id ? updated : t)));
      } catch (err) {
        console.error('markDone PATCH error', err);
        alert('Network error');
      }
    } else {
      const now = new Date().toLocaleString();
      setTasks(
        tasks.map(t => (t.id === id ? { ...t, status: "Completed", updatedAt: now } : t))
      );
    }
  };

  const deleteTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const isOwner = task.owner === username;
    const isAdmin = role === 'admin';
    const adminDeletingOtherAdmin = isAdmin && task.ownerRole === 'admin' && task.owner !== username;

    if (!isOwner && !(isAdmin && !adminDeletingOtherAdmin)) {
      return alert('You are not allowed to delete this task.');
    }

    if (!window.confirm('Delete this task?')) return;

    const logged = JSON.parse(localStorage.getItem('loggedUser')) || {};
    if (logged.token) {
      try {
        const res = await fetch(`http://localhost:5001/tasks/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${logged.token}` }
        });
        if (!res.ok) return alert((await res.json()).message || 'Failed to delete');
        setTasks(tasks.filter(t => t.id !== id));
      } catch (err) {
        console.error('deleteTask DELETE error', err);
        alert('Network error');
      }
    } else {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  // helper: fetch tasks from backend
  const fetchTasks = async () => {
    try {
      const logged = JSON.parse(localStorage.getItem('loggedUser')) || {};
      if (!logged.token) return;
      const res = await fetch('http://localhost:5001/tasks', {
        headers: { Authorization: `Bearer ${logged.token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error('fetchTasks error', err);
    }
  };

  // derived owners for admin filter
  const owners = Array.from(new Set(tasks.map(t => t.owner).filter(Boolean)));

  /* ================= AUTH PAGE ================= */
  if (!isLoggedIn) {
    return (
      <div className="login-box">
        <h2>{showLogin ? "Login" : "Sign Up"}</h2>

        <input
          placeholder="Email"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {!showLogin && (
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="">Select Role</option>
            <option value="admin">admin</option>
            <option value="intern">intern</option>
          </select>
        )}

        <button onClick={showLogin ? login : signup}>
          {showLogin ? "Login" : "Sign Up"}
        </button>

        <p className="link" onClick={() => setShowLogin(!showLogin)}>
          {showLogin
            ? "New user? Sign up"
            : "Already have an account? Login"}
        </p>
      </div>
    );
  }

  /* ================= MAIN APP ================= */
  return (
    <>
      {/* HEADER */}
      <div className="header">
        <div className="brand">
          <div className="logo">TM</div>
          <div className="app-name">Task Manager</div>
        </div>

        <div className="welcome">
          Welcome <b>{username}</b> <span className="role-badge">{role}</span>
        </div>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>

      {/* CONTENT BELOW WELCOME */}
      <div className="page">
        {/* ADD TASK */}
        <div className="left">
          <h2>Add Task</h2>

          <input
            placeholder="Task title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <textarea
            placeholder="Task description"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />

          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>

          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />

          <button className="btn btn--add" onClick={addTask}>
            <span className="btn-icon">+</span>
            Add Task
          </button>
        </div>

        {/* TASK LIST */}
        <div className="right">
          <h2>Task List</h2>

          <div className="filters">
            <input
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            {role === 'admin' && (
              <select
                value={ownerFilter}
                onChange={e => setOwnerFilter(e.target.value)}
              >
                <option>All</option>
                {owners.map(o => <option key={o}>{o}</option>)}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option>All</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
            >
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div> 

          <div className="task-list-header">
            <div className="col title">Title</div>
            <div className="col priority">Priority</div>
            <div className="col due">Due</div>
            <div className="col owner">Owner</div>
            <div className="col created">Created</div>
            <div className="col updated">Updated</div>
            <div className="col status">Status</div>
            <div className="col actions">Actions</div>
          </div>

          {[...tasks]
            .filter(t => {
              if (role === 'admin') {
                return ownerFilter === "All" || t.owner === ownerFilter;
              } else {
                return t.owner === username;
              }
            })
            .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
            .filter(t => statusFilter === "All" || t.status === statusFilter)
            .filter(t => priorityFilter === "All" || t.priority === priorityFilter)
            .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
            .map(task => (
              <div key={task.id} className="task">
                <div className="cell title">
                  <b>{task.title}</b>
                  <p>{task.description}</p>
                </div>

                <div className="cell priority">{task.priority}</div>

                <div className="cell due">{task.dueDate || "Not set"}</div>

                <div className="cell owner">{task.owner || '—'}</div>

                <div className="cell created">{task.createdAt || '—'}</div>
                <div className="cell updated">{task.updatedAt || '—'}</div>

                <div className="cell status">
                  <span className={`status ${task.status === "Completed" ? "done" : "pending"}`}>
                    {task.status}
                  </span>
                </div>

                <div className="cell actions">
                  {((role === 'admin' && task.ownerRole !== 'admin') || task.owner === username) && task.status !== "Completed" && (
                    <button className="btn" onClick={() => markDone(task.id)}>
                      Mark Done
                    </button>
                  )}
                  {((role === 'admin' && task.ownerRole !== 'admin') || task.owner === username) && (
                    <button className="btn btn--danger" onClick={() => deleteTask(task.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

export default App;
