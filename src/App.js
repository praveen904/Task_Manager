import { useState } from "react";
import "./App.css";

function App() {
  const [tasks, setTasks] = useState([]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Low");
  const [dueDate, setDueDate] = useState("");


  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const priorityOrder = {
    High: 1,
    Medium: 2,
    Low: 3
  };

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

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const markDone = (id) => {
    const now = new Date().toLocaleString();
    setTasks(
      tasks.map(task =>
        task.id === id
          ? { ...task, status: "Completed", updatedAt: now }
          : task
      )
    );
  };

  return (
    <div className="page">
      <div className="left">
        <h2>Add Task</h2>

        <input
          type="text"
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

      <div className="right">
        <h2>Task List</h2>

        <div className="filters">
          <input
            type="text"
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

        {tasks.length === 0 && <p className="empty">No tasks added</p>}

        {[...tasks]
          .filter(task =>
            task.title.toLowerCase().includes(search.toLowerCase())
          )
          .filter(task =>
            statusFilter === "All" ? true : task.status === statusFilter
          )
          .filter(task =>
            priorityFilter === "All" ? true : task.priority === priorityFilter
          )
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

              <small>Created At: {task.createdAt}</small><br />
              <small>Updated At: {task.updatedAt}</small><br /><br />

              <button onClick={() => markDone(task.id)}>Done</button>
              <button className="delete" onClick={() => deleteTask(task.id)}>
                Delete
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

export default App;
