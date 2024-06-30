import jwt from "jsonwebtoken";

export const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ msg: "Authentication Invalid" });
    }

    const token = authHeader.split(" ")[1];

    const payload = jwt.verify(token, `${process.env.JWT_SECRET_KEY}`);

    req.user = { userId: payload.userId };

    next();
  } catch (error) {
    res.status(401).json({ msg: "Authentication Invalid" });
  }
};
