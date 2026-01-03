const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ================= CONFIG =================
const PORT = 8080;
const JWT_SECRET = "mysecretkey";

// ================= FILE PATHS =================
const usersFile = path.join(__dirname, "data", "user.json");
const tasksFile = path.join(__dirname, "data", "tasks.json");

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= HELPERS =================
const getUsers = () =>
  JSON.parse(fs.readFileSync(usersFile, "utf-8"));

const getTasks = () => {
  try {
    return JSON.parse(fs.readFileSync(tasksFile, "utf-8"));
  } catch {
    return [];
  }
};

const saveTasks = (tasks) =>
  fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));

// ================= TEST =================
app.get("/", (req, res) => {
  res.send("Backend server is running");
});

// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const user = getUsers().find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: "Invalid email" });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Invalid password" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token, role: user.role });
});

// ================= AUTH =================
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUsers().find(u => u.id === payload.id);
    if (!user) throw "";
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ================= PROFILE =================
app.get("/me", authenticate, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ id, name, email, role });
});

// ================= TASKS =================
app.get("/tasks", authenticate, (req, res) => {
  const tasks = getTasks();
  if (req.user.role === "admin") return res.json(tasks);
  res.json(tasks.filter(t => t.owner === req.user.email));
});

app.post("/tasks", authenticate, (req, res) => {
  const { title, description, priority, dueDate } = req.body || {};

  if (!title) {
    return res.status(400).json({ message: "Title required" });
  }

  const tasks = getTasks();

  const task = {
    id: Date.now(),
    title,
    description: description || "",
    priority: priority || "Low",
    dueDate: dueDate || "",
    status: "Pending",
    owner: req.user.email
  };

  tasks.push(task);
  saveTasks(tasks);

  res.status(201).json(task);
});

// ================= UPDATE TASK (MARK DONE) =================
app.patch("/tasks/:id", authenticate, (req, res) => {
  const tasks = getTasks();
  const taskId = Number(req.params.id);

  const task = tasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  // admin OR owner only
  if (
    req.user.role !== "admin" &&
    task.owner !== req.user.email
  ) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const { status } = req.body || {};
  if (status) {
    task.status = status;
  }

  saveTasks(tasks);
  res.json(task);
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
