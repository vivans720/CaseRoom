const jwt = require("jsonwebtoken");

const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // check if token exists in headers

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header

      token = req.headers.authorization.split(" ")[1];

      //Verify token

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      //Get user from token and attah to request

      req.user = await User.findById(decoded.id).select("-passwordHash");

      if (!req.user) {
        const error = new Error(
          "User belonging to this token no longer exists",
        );
        error.statusCode = 401;
        throw error;
      }

      next(); //move to next middleware or controller
    } catch (error) {
      error.statusCode = 401;
      error.message = "Not authorized, token failed";
      return next(error);
    }
  }

  if (!token) {
    const error = new Error("Not authorized, no token");
    error.statusCode = 401;
    next(error);
  }
};

module.exports = { protect };
