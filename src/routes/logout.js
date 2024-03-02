const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);

router.path = "/logout";

router.get("/", isNotFromShortener, isAuthenticated, (req, res, next) => {
  req.session.destroy(err => {
    if (err) {
      next(err);
    } else {
      res.redirect("/login");
    }
  });
});

module.exports = router;
