const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to request
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

app.get("/", authenticateToken, async (req, res) => {

  // Authorization check
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admins only" });
    }
    
  try {
    const result = await pool.query("SELECT id, name, email, role, created_at FROM users");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database connection failed" });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, hashedPassword, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Generate JWT
const token = jwt.sign(
  { id: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

// 4. Send token
res.json({
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  },
});

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/leads", authenticateToken, async (req, res) => {
  try {
    let { name, email, phone } = req.body;

    // Trim inputs safely
    name = name?.trim();
    email = email?.trim();
    phone = phone?.trim();

    // Validate name
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Require at least one contact method
    if (!email && !phone) {
      return res.status(400).json({
        error: "Either email or phone number is required",
      });
    }

    // Validate email format (if provided)
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
    }

    // Validate phone format (basic check)
    if (phone) {
      const phoneRegex = /^[0-9]{8,15}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          error: "Phone must contain only digits (8–15 characters)",
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO leads (name, email, phone, assigned_user_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        name,
        email || null,
        phone || null,
        req.user.id,
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

app.get("/leads", authenticateToken, async (req, res) => {
  try {

    let result;

    if (req.user.role === "admin") {
      // Admin sees all leads
      result = await pool.query("SELECT * FROM leads ORDER BY created_at DESC");
    } else {
      // Staff sees only their leads
      result = await pool.query(
        "SELECT * FROM leads WHERE assigned_user_id = $1 ORDER BY created_at DESC",
        [req.user.id]
      );
    }

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

app.put("/leads/:id", authenticateToken, async (req, res) => {
  try {
    const leadId = req.params.id;
    const { status } = req.body;

    const allowedStatuses = ["new", "contacted", "won", "lost"];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    // Check if lead exists
    const leadResult = await pool.query(
      "SELECT * FROM leads WHERE id = $1",
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const lead = leadResult.rows[0];

    // Authorization check
    if (
      req.user.role !== "admin" &&
      lead.assigned_user_id !== req.user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Update status
    const updateResult = await pool.query(
      "UPDATE leads SET status = $1 WHERE id = $2 RETURNING *",
      [status, leadId]
    );

    res.json(updateResult.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update lead" });
  }
});

app.delete("/leads/:id", authenticateToken, async (req, res) => {
  try {
    const leadId = req.params.id;

    // Check if lead exists
    const leadResult = await pool.query(
      "SELECT * FROM leads WHERE id = $1",
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const lead = leadResult.rows[0];

    // Authorization check
    if (
      req.user.role !== "admin" &&
      lead.assigned_user_id !== req.user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Delete lead
    await pool.query(
      "DELETE FROM leads WHERE id = $1",
      [leadId]
    );

    res.json({ message: "Lead deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});