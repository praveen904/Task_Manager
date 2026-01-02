import { useState, useEffect } from "react";
import "./App.css";

function App() {
  /* ================= AUTH ================= */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");

  /* ================= TASK ================= */
  const [tasks, setTasks] = useState([]);

  /* ================= FORM ================= */
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Low");
  const [dueDate, setDueDate] = useState("");

  /* ================= SEARCH & FILTER ================= */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const priorityOrder = {
    High: 1,
    Medium: 2,
    Low: 3
  };

  /* ================= LOAD FROM LOCALSTORAGE ================= */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const savedTasks = JSON.parse(localStorage.getItem("tasks")) || [];

    if (user) {
      setIsLoggedIn(true);
      setUsername(user.username);
      setRole(user.role);
    }

    setTasks(savedTasks);
  }, []);

  /* ================= SAVE TASKS ================= */
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  /* ================= LOGIN ================= */
  const login = () => {
    if (username === "" || role === "") return;
    localStorage.setItem("user", JSON.stringify({ username, role }));
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUsername("");
    setRole("");
  };

  /* ================= TASK ACTIONS ================= */
  const addTask = () => {
    if (title.trim() === "") return;

    const now = new Date().toLocaleString();

    const newTask = {
      id: Date.now(),
      title,
      description: desc,
      priority,
      dueDate,
      status: "Pending",
      createdAt: now,
      updatedAt: now
    };

    setTasks([...tasks, newTask]);
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

  /* ================= LOGIN PAGE ================= */
  if (!isLoggedIn) {
    return (
      <div className="login-box">
        <h2>Login</h2>

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Select Role</option>
          <option value="ADMIN">ADMIN</option>
          <option value="INTERN">INTERN</option>
        </select>

        <button onClick={login}>Login</button>
      </div>
    );
  }

  /* ================= MAIN PAGE ================= */
  return (
    <div className="page">
      {/* TOP BAR */}
      <div className="top-bar">
        <p>
          Welcome <b>{username}</b> ({role})
        </p>
        <button onClick={logout}>Logout</button>
      </div>

      {/* LEFT - ADD TASK */}
      <div className="left">
        <h2>Add Task</h2>

        <input
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Task description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />

        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <button onClick={addTask}>Add Task</button>
      </div>

      {/* RIGHT - TASK LIST */}
      <div className="right">
        <h2>Task List</h2>

        {/* SEARCH & FILTER */}
        <div className="filters">
          <input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {[...tasks]
          .filter(t =>
            t.title.toLowerCase().includes(search.toLowerCase())
          )
          .filter(t =>
            statusFilter === "All" ? true : t.status === statusFilter
          )
          .filter(t =>
            priorityFilter === "All" ? true : t.priority === priorityFilter
          )
          .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
          .map(task => (
            <div key={task.id} className="task">
              <b>{task.title}</b>
              <p>{task.description}</p>
              <p>Priority: {task.priority}</p>

              <p>
                Status:{" "}
                <span
                  className={`status ${
                    task.status === "Completed" ? "done" : "pending"
                  }`}
                >
                  {task.status}
                </span>
              </p>

              <small>Created: {task.createdAt}</small><br />
              <small>Updated: {task.updatedAt}</small><br />

              {/* ADMIN ONLY ACTIONS */}
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
  );
}

export default App;
