import mongoose from "mongoose";

const Schema = mongoose.Schema;

const lessonCodeSchema = new Schema({
  userId: String,
  lessonId: String,
  code: String,
});

lessonCodeSchema.index({ userId: 1, lessonId: 1 }, { unique: true });

export const LessonCode = mongoose.model("LessonCode", lessonCodeSchema);
