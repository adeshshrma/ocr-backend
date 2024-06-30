import mongoose from "mongoose";

const ocrSchema = new mongoose.Schema({
  userId: String,
  base64String: String,
  text: String,
});
export const Ocr = mongoose.model("Ocr", ocrSchema);
