import { useState, useEffect } from "react";
import "./App.css";

const API_BASE = "http://localhost:8080";

function App() {
  /* ================= AUTH ================= */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

    try {
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
    } catch {
      alert("Network error");
    }
  };

  const logout = () => {
    localStorage.removeItem("loggedUser");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
    setTasks([]);
  };

  /* ================= TASK APIs ================= */
  const fetchTasks = async (token) => {
    const res = await fetch(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setTasks(data);
  };

  const addTask = async () => {
    if (!title.trim()) return alert("Task title required");

    const logged = JSON.parse(localStorage.getItem("loggedUser"));

    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${logged.token}`
        },
        body: JSON.stringify({ title, description: desc, priority, dueDate })
      });

      const data = await res.json();
      if (!res.ok) return alert(data.message);

      setTasks(prev => [...prev, data]);
      setTitle("");
      setDesc("");
      setPriority("Low");
      setDueDate("");
    } catch {
      alert("Network error");
    }
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

  const deleteTask = async (id) => {
    const logged = JSON.parse(localStorage.getItem("loggedUser"));
    if (!window.confirm("Delete this task?")) return;

    await fetch(`${API_BASE}/tasks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${logged.token}` }
    });

    setTasks(tasks.filter(t => t.id !== id));
  };

  const owners = Array.from(
    new Set(tasks.map(t => t.owner?.split("@")[0]).filter(Boolean))
  );

  

  /* ================= LOGIN PAGE ================= */
  if (!isLoggedIn) {
    return (
      <div className="login-box">
        <h2>Task Manager Login</h2>

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

          <button type="submit" className="btn primary">Login</button>
        </form>
      </div>
    );
  }

  /* ================= MAIN ================= */
  return (
    <>
      <div className="header">
        <h1>Task Dashboard</h1>
        <div className="welcome">
          Welcome <b>{username}</b> ({role})
        </div>
        <button className="btn logout" onClick={logout}>Logout</button>
      </div>

      <div className="page">
        <div className="left">
          <h2>Add Task</h2>
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />

          <select value={priority} onChange={e => setPriority(e.target.value)}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>

          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />

          <button className="btn add" onClick={addTask}>+ Add Task</button>
        </div>

        <div className="right">
          <h2>Task List</h2>
         

          <div className="filters">
            <input placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />

            {role === "admin" && (
              <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
                <option>All</option>
                {owners.map(o => <option key={o}>{o}</option>)}
              </select>
            )}

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>All</option>
              <option>Pending</option>
              <option>Completed</option>
            </select>

            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </div>
               <div className="task-header">
  <div className="cell title">Title</div>
  <div className="cell priority">Priority</div>
  <div className="cell due">Due Date</div>
  <div className="cell owner">Owner</div>
  <div className="cell status">Status</div>
  <div className="cell actions">Actions</div>
</div>
          {[...tasks]
            .filter(t => role === "admin" ? ownerFilter === "All" || t.owner?.startsWith(ownerFilter) : true)
            .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
            .filter(t => statusFilter === "All" || t.status === statusFilter)
            .filter(t => priorityFilter === "All" || t.priority === priorityFilter)
            .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
            .map(task => (
              <div key={task.id} className="task-row">
                  <div className="cell title">{task.title}</div>
                  <div className="cell priority">{task.priority}</div>
                  <div className="cell due">{task.dueDate || "—"}</div>
                  <div className="cell owner">{task.owner?.split("@")[0]}</div>
                  <div className="cell status">{task.status}</div>
                  <div className="cell actions">
                    {task.status !== "Completed" && (
                      <button className="btn done" onClick={() => markDone(task.id)}>
                        Done
                      </button>
                    )}
                    <button className="btn delete" onClick={() => deleteTask(task.id)}>
                      Delete
                    </button>
                  </div>
                </div>

            ))}
        </div>
      </div>
    </>
  );
}

export default App;
