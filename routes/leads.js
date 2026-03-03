const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const authenticateToken = require("../middleware/auth");

// CREATE LEAD
router.post("/", authenticateToken, async (req, res) => {
  try {
    let { name, email, phone } = req.body;

    name = name?.trim();
    email = email?.trim();
    phone = phone?.trim();

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (!email && !phone) {
      return res.status(400).json({
        error: "Either email or phone number is required",
      });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
    }

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
      [name, email || null, phone || null, req.user.id]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create lead" });
  }
});

// GET LEADS
router.get("/", authenticateToken, async (req, res) => {
  try {
    let result;

    if (req.user.role === "admin") {
      result = await pool.query(
        "SELECT * FROM leads ORDER BY created_at DESC"
      );
    } else {
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

// GET SINGLE LEAD
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const leadId = req.params.id;

    const result = await pool.query(
      "SELECT * FROM leads WHERE id = $1",
      [leadId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const lead = result.rows[0];

    // Ownership check
    if (
      req.user.role !== "admin" &&
      lead.assigned_user_id !== req.user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json(lead);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

// CREATE NOTE FOR A LEAD
router.post("/:id/notes", authenticateToken, async (req, res) => {
  try {
    const leadId = req.params.id;
    let { note_text } = req.body;

    note_text = note_text?.trim();

    if (!note_text) {
      return res.status(400).json({ error: "Note text is required" });
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

    // Ownership check
    if (
      req.user.role !== "admin" &&
      lead.assigned_user_id !== req.user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await pool.query(
      `INSERT INTO notes (lead_id, user_id, note_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [leadId, req.user.id, note_text]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create note" });
  }
});

// GET NOTES FOR A LEAD
router.get("/:id/notes", authenticateToken, async (req, res) => {
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

    // Ownership check
    if (
      req.user.role !== "admin" &&
      lead.assigned_user_id !== req.user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const notesResult = await pool.query(
      "SELECT * FROM notes WHERE lead_id = $1 ORDER BY created_at DESC",
      [leadId]
    );

    res.json(notesResult.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// DELETE NOTE
router.delete("/:leadId/notes/:noteId", authenticateToken, async (req, res) => {
  try {
    const { leadId, noteId } = req.params;

    const noteResult = await pool.query(
      "SELECT * FROM notes WHERE id = $1 AND lead_id = $2",
      [noteId, leadId]
    );

    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: "Note not found" });
    }

    const note = noteResult.rows[0];

    // Admin can delete any note
    // Staff can delete only their own notes
    if (
      req.user.role !== "admin" &&
      note.user_id !== req.user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query(
      "DELETE FROM notes WHERE id = $1",
      [noteId]
    );

    res.json({ message: "Note deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// UPDATE LEAD STATUS
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const leadId = req.params.id;
    const { status } = req.body;

    const allowedStatuses = ["new", "contacted", "won", "lost"];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const leadResult = await pool.query(
      "SELECT * FROM leads WHERE id = $1",
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const lead = leadResult.rows[0];

    if (
      req.user.role !== "admin" &&
      lead.assigned_user_id !== req.user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

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

// DELETE LEAD
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const leadId = req.params.id;

    const leadResult = await pool.query(
      "SELECT * FROM leads WHERE id = $1",
      [leadId]
    );

    if (leadResult.rows.length === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const lead = leadResult.rows[0];

    if (
      req.user.role !== "admin" &&
      lead.assigned_user_id !== req.user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

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

module.exports = router;