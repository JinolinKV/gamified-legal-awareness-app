import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
  title: String,
  description: String,
  level: { type: Number, unique: true },  // 👈 unique level
  content: String
});

export default mongoose.model("Story", storySchema);
