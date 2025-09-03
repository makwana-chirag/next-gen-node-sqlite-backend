require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");
const db = require("./db");

const app = express();
const corsOptions = {
  origin: [
    "https://next-gen-website-ten.vercel.app/",
    "https://next-gen-admin-penal.vercel.app/",
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

const SECRET_KEY = process.env.SECRET_KEY;
const PORT = process.env.PORT || 4000;

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

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

app.get("/admins", (req, res) => {
  db.all("SELECT * FROM admins", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

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

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
