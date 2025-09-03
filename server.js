const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = "your_jwt_secret"; // 🔒 Change in production

// ===================== AUTH =====================
app.post("/admin/register", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO admins (username, password) VALUES (?, ?)",
    [username, hashed],
    (err) => {
      if (err) return res.status(400).json({ error: "User already exists" });
      res.json({ success: true, message: "Admin registered" });
    }
  );
});

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM admins WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        { id: user.id, username: user.username },
        SECRET_KEY,
        { expiresIn: "1h" }
      );
      res.json({ token });
    }
  );
});

// Middleware for JWT
function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// ===================== INQUIRIES =====================
// Post new inquiry (public API for Next.js form)
app.post("/inquiries", (req, res) => {
  const { name, email, message } = req.body;
  db.run(
    "INSERT INTO inquiries (name, email, message) VALUES (?, ?, ?)",
    [name, email, message],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Get all inquiries (protected, admin panel)
app.get("/inquiries", authenticate, (req, res) => {
  db.all(
    "SELECT * FROM inquiries ORDER BY created_at DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.listen(4000, () =>
  console.log("🚀 Server running on http://localhost:4000")
);
