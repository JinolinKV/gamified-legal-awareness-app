import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  answer: String
});

const quizSchema = new mongoose.Schema({
  level: { type: Number, unique: true },  // 👈 link by level
  questions: [questionSchema]
});

export default mongoose.model("Quiz", quizSchema);
