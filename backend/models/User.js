import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },
  progress: {
    currentLevel: { type: Number, default: 1 },
    lastScore: { type: Number, default: 0 },
  },
});

export default mongoose.model("User", userSchema);
