import { useState, useEffect } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080";

function App() {
  /* ================= AUTH ================= */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");

  // signup fields
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

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Low");
  const [dueDate, setDueDate] = useState("");

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
      JSON.stringify({
        token: data.token,
        role: data.role,
        email: username
      })
    );

    setIsLoggedIn(true);
    setRole(data.role);
    setUsername(username.split("@")[0]);
    setPassword("");
    fetchTasks(data.token);
  };

  const signup = async (e) => {
  e.preventDefault();

  if (!signupName || !signupEmail || !signupPassword) {
    alert("All fields required");
    return;
  }

  try {
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

    if (!res.ok) {
      alert(data.message || "Signup failed");
      return;
    }

    alert("Signin successful. Please login.");
    setIsSignup(false);

    // reset
    setSignupName("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupRole("intern");
  } catch {
    alert("Network error");
  }
};


  /* ================= LOGOUT ================= */
  const logout = () => {
    localStorage.removeItem("loggedUser");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setTasks([]);
  };

  /* ================= TASK APIs ================= */
  const fetchTasks = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
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
      body: JSON.stringify({
        title,
        description: desc,
        priority,
        dueDate
      })
    });

    const data = await res.json();
    setTasks(prev => [...prev, data]);
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
    setTasks(tasks.map(t => (t.id === id ? updated : t)));
  };

  /* ================= LOGIN / SIGNIN PAGE ================= */
  if (!isLoggedIn) {
    return (
      <div className="login-box">
        <h2>{isSignup ? "Sign In" : "Login"}</h2>

        {isSignup ? (
          <form onSubmit={signup}>
            <input
              placeholder="Name"
              value={signupName}
              onChange={e => setSignupName(e.target.value)}
            />
            <input
              placeholder="Email"
              value={signupEmail}
              onChange={e => setSignupEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={signupPassword}
              onChange={e => setSignupPassword(e.target.value)}
            />
            <select
              value={signupRole}
              onChange={e => setSignupRole(e.target.value)}
            >
              <option value="intern">Intern</option>
              <option value="admin">Admin</option>
            </select>

            <button className="btn primary">Sign In</button>
          </form>
        ) : (
          <form onSubmit={login}>
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
            <button className="btn primary">Login</button>
          </form>
        )}

        <p
          style={{ marginTop: "14px", cursor: "pointer", color: "#4f46e5" }}
          onClick={() => setIsSignup(!isSignup)}
        >
          {isSignup
            ? "Already have an account? Login"
            : "New user? Sign In"}
        </p>
      </div>
    );
  }

  /* ================= FILTERED TASKS ================= */
  const filteredTasks = tasks
    .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    .filter(t => statusFilter === "All" || t.status === statusFilter)
    .filter(t => priorityFilter === "All" || t.priority === priorityFilter)
    .filter(t =>
      role === "admin"
        ? ownerFilter === "All" || t.owner?.startsWith(ownerFilter)
        : true
    );

  /* ================= MAIN PAGE ================= */
  return (
    <>
      <div className="header">
        <h1>Task Dashboard</h1>

        <div className="welcome">
          Welcome <b>{username}</b> ({role})
        </div>

        <button className="btn logout" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="page">
        <div className="left">
          <h2>Add Task</h2>

          <input
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <textarea
            placeholder="Description"
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

          <button className="btn add" onClick={addTask}>
            + Add Task
          </button>
        </div>

        <div className="right">
          <h2>Task List</h2>

          {/* FILTER BAR */}
          <div className="filters">
            <input
              placeholder="Search task..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            {role === "admin" && (
              <select
                value={ownerFilter}
                onChange={e => setOwnerFilter(e.target.value)}
              >
                <option value="All">All Users</option>
                {Array.from(
                  new Set(tasks.map(t => t.owner?.split("@")[0]).filter(Boolean))
                ).map(owner => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
            >
              <option value="All">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
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
              <div className="cell created">
                {new Date(task.createdAt).toLocaleString()}
              </div>
              <div className="cell updated">
                {new Date(task.updatedAt).toLocaleString()}
              </div>
              <div className="cell status">{task.status}</div>
              <div className="cell actions">
                {task.status !== "Completed" && (
                  <button
                    className="btn done"
                    onClick={() => markDone(task.id)}
                  >
                    Done
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
