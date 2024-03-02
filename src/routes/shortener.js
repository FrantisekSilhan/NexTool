const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require(shared.files.middlewares);
const crypto = require("crypto");

router.path = "/shortener";

router.get("/", isAuthenticated, async (req, res) => {
  const errorMessage = req.session.errorMessage;
  delete req.session.errorMessage;

  res.render("shortener", { errorMessage, urlLen: shared.config.shortener.maximumUrlLen, customUrlLen: shared.config.shortener.maximumCustomUrlLen });
});

router.post("/", isAuthenticated, async (req, res, next) => {

});

module.exports = router;