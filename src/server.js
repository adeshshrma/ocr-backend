import express from "express";
import multer, { memoryStorage } from "multer";
import { recognize } from "node-tesseract-ocr";
import { connect } from "mongoose";
import { User } from "./models/User.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { auth } from "./middleware/auth.js";
import { Ocr } from "./models/Ocr.js";
import cors from "cors";

dotenv.config();

const storage = memoryStorage();
const upload = multer({ storage: storage });

const app = express();
app.use(cors());
app.use(express.json());

app.post("/register", async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  }

  const user = await User.findOne({ email });

  if (user) {
    return res
      .status(400)
      .json({ success: false, message: "User already exists" });
  }

  const salt = bcrypt.genSaltSync(10);
  password = bcrypt.hashSync(password, salt);

  const newUser = new User({ email, password });
  await newUser.save();

  const token = jwt.sign(
    { userId: newUser.id },
    `${process.env.JWT_SECRET_KEY}`,
    { expiresIn: process.env.JWT_LIFETIME }
  );
  res.status(200).json({
    status: 200,
    message: "User created successfully",
    token: token,
    success: true,
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password are required" });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(400).json({ success: false, message: "User not found" });
  }

  const isPasswordCorrect = bcrypt.compareSync(password, user.password);

  if (!isPasswordCorrect) {
    return res
      .status(200)
      .json({ success: false, message: "Incorrect password" });
  }
  const token = jwt.sign({ userId: user.id }, `${process.env.JWT_SECRET_KEY}`, {
    expiresIn: process.env.JWT_LIFETIME,
  });

  return res
    .status(200)
    .json({ token: token, success: true, message: "Login successful" });
});

app.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    // File information is available in req.file
    const file = req.file;

    const img = file.buffer;

    const text = await recognize(img, {
      lang: "eng",
      oem: 1,
      psm: 3,
    });

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "File not found" });
    }

    const base64String = file.buffer.toString("base64");

    await Ocr.create({
      userId: req.user.userId,
      base64String,
      text,
    });

    res.status(200).send({ base64String, text, success: true });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error processing file");
  }
});

app.get("/getAllOcrData", auth, async (req, res) => {
  try {
    const ocrData = await Ocr.find({
      userId: req.user.userId,
    });
    res.status(200).send(ocrData);
  } catch (error) {
    console.log(error);
    res.status(500).send("something went wrong");
  }
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(3001, async () => {
  await connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");
  console.log("Server started on port 3001");
});
