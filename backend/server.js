// server.js  (CommonJS)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB (db: badminton)"))
  .catch((err) => console.error("MongoDB error:", err.message));

const userSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true },
    email:   { type: String, required: true, unique: true, index: true },
    phone:   { type: String, required: true },
    password:{ type: String, required: true } 
  },
  { timestamps: true, collection: "users" }
);

const User = mongoose.model("User", userSchema);


app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "กรอกข้อมูลให้ครบ name, email, phone, password" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: "อีเมลนี้มีผู้ใช้แล้ว" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, phone, password: hash });

    const { password: _, ...safeUser } = user.toObject();

    return res.status(201).json({ message: "สมัครสมาชิกสำเร็จ", user: safeUser });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "อีเมลนี้มีผู้ใช้แล้ว" });
    }
    console.error("Register error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the Badminton!" });
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}, { password: 0 }).lean();
  res.json(users);
});

// ---------- Start Server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
