const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ----------------- CONFIG -----------------
const PORT = process.env.PORT || 5000;
const JWT_SECRET = "mysecretkey";

// File paths
const usersFilePath = path.join(__dirname, "data", "user.json");
const tasksFilePath = path.join(__dirname, "data", "tasks.json");

// ----------------- MIDDLEWARE -----------------
app.use(cors());
app.use(express.json());

// ----------------- HELPERS -----------------
function getUsers() {
  const data = fs.readFileSync(usersFilePath, "utf-8");
  return JSON.parse(data);
}

function getTasks() {
  try {
    const data = fs.readFileSync(tasksFilePath, "utf-8");
    return JSON.parse(data || "[]");
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
}

// ----------------- TEST ROUTE -----------------
app.get("/", (req, res) => {
  res.send("Backend server is running");
});

// ----------------- LOGIN -----------------
app.post("/login", (req, res) => {
  console.log("BODY:", req.body); // 👈 ADD THIS

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const users = getUsers();
  const user = users.find(
    u => u.email.toLowerCase() === email.toLowerCase().trim()
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid email" });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid password" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    message: "Login successful",
    token,
    role: user.role
  });
});

// ----------------- AUTH MIDDLEWARE -----------------
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const users = getUsers();
    const user = users.find(u => u.id === payload.id);

    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ----------------- CURRENT USER -----------------
app.get("/me", authenticate, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ id, name, email, role });
});

// ----------------- TASKS -----------------

// GET tasks
app.get("/tasks", authenticate, (req, res) => {
  const tasks = getTasks();
  const user = req.user;

  if (user.role === "admin") {
    return res.json(tasks); // admin → all tasks
  }

  // intern → own tasks only
  const ownerId = user.name || user.email || user.id;
  res.json(tasks.filter(t => t.owner === ownerId));
});

// CREATE task
app.post("/tasks", authenticate, (req, res) => {
  const { title, description, priority, dueDate } = req.body || {};
  if (!title) {
    return res.status(400).json({ message: "Title required" });
  }

  const tasks = getTasks();
  const now = new Date().toLocaleString();
  const owner = req.user.name || req.user.email || req.user.id;

  const task = {
    id: Date.now(),
    title,
    description: description || "",
    priority: priority || "Low",
    dueDate: dueDate || "",
    status: "Pending",
    owner,
    ownerRole: req.user.role,
    createdAt: now,
    updatedAt: now
  };

  tasks.push(task);
  saveTasks(tasks);

  res.status(201).json(task);
});

// UPDATE task
app.patch("/tasks/:id", authenticate, (req, res) => {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === Number(req.params.id));

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const user = req.user;
  const isOwner =
    task.owner === user.name ||
    task.owner === user.email ||
    task.owner === user.id;

  if (!isOwner && user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed" });
  }

  const { title, description, priority, dueDate, status } = req.body || {};
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (status !== undefined) task.status = status;

  task.updatedAt = new Date().toLocaleString();
  saveTasks(tasks);

  res.json(task);
});

// DELETE task
app.delete("/tasks/:id", authenticate, (req, res) => {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === Number(req.params.id));

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  const user = req.user;
  const isOwner =
    task.owner === user.name ||
    task.owner === user.email ||
    task.owner === user.id;

  if (!isOwner && user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed" });
  }

  const remaining = tasks.filter(t => t.id !== task.id);
  saveTasks(remaining);

  res.json({ message: "Task deleted" });
});

// ----------------- START SERVER -----------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
