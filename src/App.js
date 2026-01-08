import { useState, useEffect } from "react";
import "./App.css";

const API_BASE = "https://task-manager-backend-2gmn.onrender.com";

function App() {
  /* ================= AUTH ================= */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState("intern");

  /* ================= TASK ================= */
  const [tasks, setTasks] = useState([]);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");

  // date filters
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  // sorting
  const [sortBy, setSortBy] = useState("");

  // add task
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Low");
  const [dueDate, setDueDate] = useState("");

  /* ================= ACTIVITY LOG (ONLY NEW FEATURE) ================= */
  const [activityLogs, setActivityLogs] = useState(
    JSON.parse(localStorage.getItem("activityLogs")) || []
  );

  /* ================= LOAD ================= */
  useEffect(() => {
    const logged = JSON.parse(localStorage.getItem("loggedUser"));
    if (logged?.token) {
      setIsLoggedIn(true);
      setRole(logged.role);
      setUsername(logged.email.split("@")[0]);
      fetchTasks(logged.token);
      

    }
  }, []);

  /* ================= ACTIVITY LOG HELPER ================= */
  const addLog = (action, taskTitle) => {
    const log = {
      id: Date.now(),
      user: username,
      role,
      action,
      taskTitle,
      time: new Date().toLocaleString()
    };

    const updated = [log, ...activityLogs];
    setActivityLogs(updated);
    localStorage.setItem("activityLogs", JSON.stringify(updated));
  };

  const checkOverdueTasks = (taskList) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // ignore time

  const updatedTasks = taskList.map(task => {
    if (
      task.dueDate &&
      new Date(task.dueDate) < today &&
      task.status !== "Completed" &&
      task.status !== "OVERDUE"
    ) {
      // activity log
      addLog("TASK OVERDUE", task.title);

      return { ...task, status: "OVERDUE" };
    }
    return task;
  });

  setTasks(updatedTasks);
};



  /* ================= LOGIN ================= */
  const login = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: username, password })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message);

    localStorage.setItem(
      "loggedUser",
      JSON.stringify({ token: data.token, role: data.role, email: username })
    );

    setIsLoggedIn(true);
    setRole(data.role);
    setUsername(username.split("@")[0]);
    setPassword("");
    fetchTasks(data.token);
  };

  /* ================= SIGNUP ================= */
  const signup = async (e) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPassword) {
      alert("All fields required");
      return;
    }

    const res = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: signupRole
      })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    alert("Signin successful. Please login.");
    setIsSignup(false);
  };

  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.removeItem("loggedUser");
    setIsLoggedIn(false);
    setTasks([]);
  };

  /* ================= TASK APIs ================= */
  const fetchTasks = async (token) => {
    const res = await fetch(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (Array.isArray(data)) {
  setTasks(data);
  checkOverdueTasks(data);   // 🔥 KEY LINE
} else {
  setTasks([]);
}

  };

  const addTask = async () => {
    if (!title.trim()) return alert("Task title required");
    const logged = JSON.parse(localStorage.getItem("loggedUser"));

    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${logged.token}`
      },
      body: JSON.stringify({ title, description: desc, priority, dueDate })
    });

    const data = await res.json();
    setTasks(prev => [...prev, data]);
    addLog("TASK ADDED", title);

    setTitle("");
    setDesc("");
    setPriority("Low");
    setDueDate("");
  };

  const markDone = async (id) => {
    const logged = JSON.parse(localStorage.getItem("loggedUser"));
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${logged.token}`
      },
      body: JSON.stringify({ status: "Completed" })
    });

    const updated = await res.json();
    const task = tasks.find(t => t.id === id);
    setTasks(tasks.map(t => (t.id === id ? updated : t)));
    addLog("TASK COMPLETED", task?.title);
  };

  const deleteTask = async (id) => {
  const logged = JSON.parse(localStorage.getItem("loggedUser"));
  const task = tasks.find(t => t.id === id);

  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${logged.token}`
    }
  });

  if (!res.ok) {
    alert("Delete failed");
    return;
  }

  setTasks(prev => prev.filter(t => t.id !== id));

  // Activity log (admin-only view already handled)
  addLog("TASK DELETED", task?.title);
};


  /* ================= FILTER + SORT ================= */
  const filteredTasks = tasks
    .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    .filter(t => statusFilter === "All" || t.status === statusFilter)
    .filter(t => priorityFilter === "All" || t.priority === priorityFilter)
    .filter(t =>
      role === "admin"
        ? ownerFilter === "All" || t.owner?.startsWith(ownerFilter)
        : true
    )
    .filter(t => {
      if (!dueFrom && !dueTo) return true;
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      if (dueFrom && d < new Date(dueFrom)) return false;
      if (dueTo && d > new Date(dueTo)) return false;
      return true;
    })
    .filter(t => {
      const c = new Date(t.createdAt);
      if (createdFrom && c < new Date(createdFrom)) return false;
      if (createdTo && c > new Date(createdTo)) return false;
      return true;
    })
    .sort((a, b) => {
      const order = { High: 1, Medium: 2, Low: 3 };
      if (sortBy === "dueAsc") return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
      if (sortBy === "dueDesc") return new Date(b.dueDate || 0) - new Date(a.dueDate || 0);
      if (sortBy === "createdAsc") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "createdDesc") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "priority") return order[a.priority] - order[b.priority];
      return 0;
    });

  /* ================= LOGIN / SIGNIN ================= */
  if (!isLoggedIn) {
    return (
      <div className="login-box">
        <h2>{isSignup ? "Sign In" : "Login"}</h2>

        {isSignup ? (
          <form onSubmit={signup}>
            <input placeholder="Name" value={signupName} onChange={e => setSignupName(e.target.value)} />
            <input placeholder="Email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} />
            <select value={signupRole} onChange={e => setSignupRole(e.target.value)}>
              <option value="intern">Intern</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn primary">Sign In</button>
          </form>
        ) : (
          <form onSubmit={login}>
            <input placeholder="Email" value={username} onChange={e => setUsername(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="btn primary">Login</button>
          </form>
        )}

        <p onClick={() => setIsSignup(!isSignup)}>
          {isSignup ? "Already have an account? Login" : "New user? Sign In"}
        </p>
      </div>
    );
  }

  /* ================= MAIN PAGE ================= */
  return (
    <>
      <div className="header">
        <h1>Task Dashboard</h1>
        <div className="welcome">Welcome <b>{username}</b> ({role})</div>
        <button className="btn logout" onClick={logout}>Logout</button>
      </div>

      <div className="page">
        <div className="left">
          <h2>Add Task</h2>
          <input placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <button className="btn add" onClick={addTask}>+ Add Task</button>

          {/* ================= ACTIVITY LOG (ADMIN ONLY) ================= */}
          {role === "admin" && (
            <div className="activity-log">
              <h2>Activity Log</h2>

              {activityLogs.length === 0 && <p>No activity yet</p>}

              {activityLogs.map(log => (
                <div key={log.id} className="log-item">
                  <b>{log.action}</b> – {log.taskTitle}<br />
                  <small>
                    {log.user} ({log.role}) • {log.time}
                  </small>
                </div>
              ))}
            </div>
          )}
          </div>

        <div className="right">
          <h2>Task List</h2>

          <div className="filters">
            <input placeholder="Search task" value={search} onChange={e => setSearch(e.target.value)} />

            {role === "admin" && (
              <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
                <option value="All">Owner (All)</option>
                {[...new Set(tasks.map(t => t.owner?.split("@")[0]))].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            )}

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="All">Status (All)</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="OVERDUE">OVERDUE</option>

            </select>

            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option value="All">Priority (All)</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <div className="date-filter">
              <span>Due From</span>
              <input type="date" value={dueFrom} onChange={e => setDueFrom(e.target.value)} />
            </div>

            <div className="date-filter">
              <span>Due To</span>
              <input type="date" value={dueTo} onChange={e => setDueTo(e.target.value)} />
            </div>

            <div className="date-filter">
              <span>Created From</span>
              <input type="date" value={createdFrom} onChange={e => setCreatedFrom(e.target.value)} />
            </div>

            <div className="date-filter">
              <span>Created To</span>
              <input type="date" value={createdTo} onChange={e => setCreatedTo(e.target.value)} />
            </div>

            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="">Sort By</option>
              <option value="dueAsc">Due Date ↑</option>
              <option value="dueDesc">Due Date ↓</option>
              <option value="priority">Priority</option>
              <option value="createdDesc">Created (Newest)</option>
              <option value="createdAsc">Created (Oldest)</option>
            </select>
          </div>

          <div className="task-header">
            <div className="cell title">Title</div>
            <div className="cell priority">Priority</div>
            <div className="cell owner">Owner</div>
            <div className="cell created">Created</div>
            <div className="cell updated">Updated</div>
            <div className="cell status">Status</div>
            <div className="cell actions">Actions</div>
          </div>

          {filteredTasks.map(task => (
            <div key={task.id} className="task-row">
              <div className="cell title">{task.title}</div>
              <div className="cell priority">{task.priority}</div>
              <div className="cell owner">{task.owner.split("@")[0]}</div>
              <div className="cell created">{new Date(task.createdAt).toLocaleString()}</div>
              <div className="cell updated">{new Date(task.updatedAt).toLocaleString()}</div>
              <div
  className={`cell status ${
    task.status === "OVERDUE" ? "overdue-text" : ""
  }`}
>
  {task.status}
</div>

              <div className="cell actions">
                <div className="cell actions">
                  {task.status !== "Completed" && (
                    <button
                      className="btn done"
                      onClick={() => markDone(task.id)}
                    >
                      Done
                    </button>
                  )}

                  <button
                    className="btn delete"
                    onClick={() => deleteTask(task.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      
    </>
  );
}

export default App;
