const fs = require("fs");
const path = require("path");

const usersFilePath = path.join(__dirname, "data", "user.json");

function getUsers() {
  const data = fs.readFileSync(usersFilePath, "utf-8");
  return JSON.parse(data);
}


const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Backend server is running");
});

// Port
const PORT = process.env.PORT || 5001;

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "mysecretkey"; // later .env use pannalaam

app.post("/login", (req, res) => {
  console.log('POST /login body:', req.body);
  const { email, password } = req.body || {};

  if (!email || !password) {
    console.log('Missing email or password', { email, password });
    return res.status(400).json({ message: 'Email and password required' });
  }

  const users = getUsers();
  console.log('Looking for email:', email);
  const user = users.find(u => u.email && u.email.toLowerCase() === String(email).toLowerCase().trim());

  if (!user) {
    console.log('Email not found in users');
    return res.status(401).json({ message: "Invalid email" });
  }

  const isMatch = bcrypt.compareSync(password, user.password);
  console.log('Password match:', isMatch);

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

// Dev-only: list users (id, name, email, role) for debugging
app.get('/debug/users', (req, res) => {
  try {
    const users = getUsers();
    const safeUsers = users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
    res.json(safeUsers);
  } catch (err) {
    console.error('Error reading users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Auth middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const users = getUsers();
    const user = users.find(u => u.id === payload.id);
    if (!user) return res.status(401).json({ message: 'Invalid token' });
    req.user = user;
    next();
  } catch (err) {
    console.error('JWT error:', err);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Protected route to return current user info
app.get('/me', authenticate, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ id, name, email, role });
});

// Server start
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});
