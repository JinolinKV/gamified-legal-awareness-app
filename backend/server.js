import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Story from "./models/Story.js";
import Quiz from "./models/Quiz.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

// ========================= 🔹 MongoDB Connection =========================
mongoose
  .connect("mongodb://127.0.0.1:27017/legalAwarenessDB")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const JWT_SECRET = "secretKey";
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASS = "Admin@123";

// ========================= 🔹 Root Test Route =========================
app.get("/", (req, res) => res.send("✅ Backend running successfully!"));

// ========================= 🔹 Auth Middleware =========================
const auth = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token)
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// ========================= 🔹 Auth Routes =========================

// Signup
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashed,
      role: "user",
      progress: { currentLevel: 1, lastScore: 0 },
    });

    await user.save();
    res.json({ success: true, message: "Signup successful" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Server error during signup" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Admin Login
    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
      const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "1d" });
      return res.json({ success: true, token, role: "admin" });
    }

    // User Login
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ success: false, message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ id: user._id, role: "user" }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ success: true, token, role: "user" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// ========================= 🔹 Story Routes =========================

// Add Story (Admin Only)
app.post("/addStory", auth, async (req, res) => {
  try {
    const { title, description, level, content } = req.body;
    if (!title || !description || !level || !content)
      return res.status(400).json({ message: "Missing story fields" });

    const existing = await Story.findOne({ level });
    if (existing)
      return res.status(400).json({ message: "Story for this level already exists" });

    const story = new Story({ title, description, level, content });
    await story.save();
    res.json({ success: true, story });
  } catch (err) {
    console.error("Add story error:", err);
    res.status(500).json({ message: "Server error while adding story" });
  }
});

// Get all stories
app.get("/stories", auth, async (req, res) => {
  try {
    const stories = await Story.find().sort({ level: 1 });
    res.json({ success: true, stories });
  } catch (err) {
    console.error("Fetch stories error:", err);
    res.status(500).json({ message: "Server error while fetching stories" });
  }
});

// Get story by level
app.get("/story/:level", auth, async (req, res) => {
  try {
    const story = await Story.findOne({ level: Number(req.params.level) });
    if (!story)
      return res.status(404).json({ success: false, message: "Story not found" });
    res.json({ success: true, story });
  } catch (err) {
    console.error("Fetch story error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ✅ Save user score and unlock next level if >= 80%
app.post("/user/score", auth, async (req, res) => {
  try {
    const { scorePercent, level } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // ✅ Update progress
    user.progress.lastScore = scorePercent;

    if (scorePercent >= 80 && user.progress.currentLevel === level) {
      user.progress.currentLevel = level + 1; // unlock next level
    }

    await user.save();

    res.json({
      success: true,
      message: "Score saved successfully",
      progress: user.progress,
    });
  } catch (err) {
    console.error("Error saving user score:", err);
    res.status(500).json({ success: false, message: "Server error while saving score" });
  }
});


// ========================= 🔹 Quiz Routes =========================

app.post("/addQuiz", auth, async (req, res) => {
  try {
    const { level, questions } = req.body;
    if (!level || !Array.isArray(questions) || !questions.length)
      return res.status(400).json({ message: "Missing quiz data" });

    const existing = await Quiz.findOne({ level });
    if (existing)
      return res.status(400).json({ message: "Quiz for this level already exists" });

    const quiz = new Quiz({ level, questions });
    await quiz.save();
    res.json({ success: true, quiz });
  } catch (err) {
    console.error("Add quiz error:", err);
    res.status(500).json({ message: "Server error while adding quiz" });
  }
});

// Get quiz by level
app.get("/quiz/:level", auth, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ level: Number(req.params.level) });
    if (!quiz)
      return res.status(404).json({ success: false, message: "Quiz not found" });
    res.json({ success: true, quiz });
  } catch (err) {
    console.error("Fetch quiz error:", err);
    res.status(500).json({ message: "Server error while fetching quiz" });
  }
});

// ========================= 🔹 Profile =========================
app.get("/user/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({
      success: true,
      name: user.name,
      email: user.email,
      progress: user.progress || { currentLevel: 1, lastScore: 0 },
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Server error while fetching profile" });
  }
});

// ✅ Get only user progress (used by Task.js)
app.get("/user/progress", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({
      success: true,
      progress: user.progress || { currentLevel: 1, lastScore: 0 },
    });
  } catch (err) {
    console.error("Progress fetch error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching progress" });
  }
});


// ========================= 🔹 Start Server =========================
app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));    