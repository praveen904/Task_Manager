const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

// ================= CONFIG =================
const PORT = process.env.PORT || 8080;
const JWT_SECRET = "mysecretkey";

// ================= FILE PATHS =================
const usersFile = path.join(__dirname, "user.json");
const tasksFile = path.join(__dirname, "tasks.json");


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

// ================= SIGNUP =================
app.post("/signup", (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  const users = getUsers();

  if (users.find(u => u.email === email)) {
    return res.status(409).json({ message: "User already exists" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const newUser = {
    id: Date.now(),
    name,
    email,
    password: hashedPassword,
    role: role || "intern"
  };

  users.push(newUser);

  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

  res.status(201).json({ message: "Signup successful" });
});


// ================= LOGIN =================
app.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const user = getUsers().find(u => u.email === email);
  if (!user) return res.status(401).json({ message: "Invalid email" });

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

  if (!token) return res.status(401).json({ message: "No token provided" });

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

// ================= TASKS =================
app.get("/tasks", authenticate, (req, res) => {
  const tasks = getTasks();
  if (req.user.role === "admin") return res.json(tasks);
  res.json(tasks.filter(t => t.owner === req.user.email));
});

app.post("/tasks", authenticate, (req, res) => {
  const { title, description, priority, dueDate } = req.body || {};
  if (!title) return res.status(400).json({ message: "Title required" });

  const tasks = getTasks();
  const now = new Date().toISOString();

  const task = {
    id: Date.now(),
    title,
    description: description || "",
    priority: priority || "Low",
    dueDate: dueDate || "",
    status: "Pending",
    owner: req.user.email,

    // 👇 CREATED & UPDATED
    createdAt: now,
    updatedAt: now
  };

  tasks.push(task);
  saveTasks(tasks);
  res.status(201).json(task);
});

// ================= UPDATE TASK =================
app.patch("/tasks/:id", authenticate, (req, res) => {
  const tasks = getTasks();
  const taskId = Number(req.params.id);
  const task = tasks.find(t => t.id === taskId);

  if (!task) return res.status(404).json({ message: "Task not found" });

  if (req.user.role !== "admin" && task.owner !== req.user.email) {
    return res.status(403).json({ message: "Not allowed" });
  }

  if (req.body.status) task.status = req.body.status;
  task.updatedAt = new Date().toISOString(); // 👈 UPDATE TIME

  saveTasks(tasks);
  res.json(task);
});

// ================= DELETE =================
app.delete("/tasks/:id", authenticate, (req, res) => {
  let tasks = getTasks();
  tasks = tasks.filter(t => t.id !== Number(req.params.id));
  saveTasks(tasks);
  res.json({ success: true });
});

// ================= START =================


app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
