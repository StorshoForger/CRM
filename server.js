const express = require("express");
require("dotenv").config();

const leadsRoutes = require("./routes/leads");
const authRoutes = require("./routes/auth");

const app = express();

app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/leads", leadsRoutes);

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});