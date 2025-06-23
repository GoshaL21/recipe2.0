const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken } = require("./middleware/auth");
require("dotenv").config(); // Load .env file

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Secure route to get current user's data
app.get("/api/user/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.userEmail },
      select: {
        email: true,
        name: true,
        surname: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
