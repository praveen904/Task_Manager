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

  const priorityOrder = { High: 1, Medium: 2, Low: 3 };

  /* ================= LOAD STORAGE ================= */
  useEffect(() => {
    const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
    const savedTasks = JSON.parse(localStorage.getItem("tasks")) || [];

    if (loggedUser) {
      setIsLoggedIn(true);
      setUsername(loggedUser.email || loggedUser.username);
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
      }
    }
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
  const addTask = () => {
    if (!title.trim()) return;

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
        createdAt: now,
        updatedAt: now
      }
    ]);

    setTitle("");
    setDesc("");
    setPriority("Low");
    setDueDate("");
  };

  const markDone = (id) => {
    const now = new Date().toLocaleString();
    setTasks(
      tasks.map(t =>
        t.id === id ? { ...t, status: "Completed", updatedAt: now } : t
      )
    );
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

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
        <div className="welcome">
          Welcome <b>{username}</b> ({role})
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

          <button onClick={addTask}>Add Task</button>
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

          {[...tasks]
            .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
            .filter(t => statusFilter === "All" || t.status === statusFilter)
            .filter(t => priorityFilter === "All" || t.priority === priorityFilter)
            .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
            .map(task => (
              <div key={task.id} className="task">
              <b>{task.title}</b>
              <p>{task.description}</p>

              <p><strong>Priority:</strong> {task.priority}</p>

              <p><strong>Due Date:</strong> {task.dueDate || "Not set"}</p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  className={`status ${
                    task.status === "Completed" ? "done" : "pending"
                  }`}
                >
                  {task.status}
                </span>
              </p>

              <small><strong>Created:</strong> {task.createdAt}</small><br />
              <small><strong>Updated:</strong> {task.updatedAt}</small><br />

              {role === "ADMIN" && (
                <>
                  <button onClick={() => markDone(task.id)}>Done</button>
                  <button className="delete" onClick={() => deleteTask(task.id)}>
                    Delete
                  </button>
                </>
              )}
            </div>

            ))}
        </div>
      </div>
    </>
  );
}

export default App;
