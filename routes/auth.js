const express = require("express");
const router = express.Router();
const passport = require("passport");
const bcrypt = require("bcrypt");
const User = require("../models/User");

function ensureGuest(req, res, next) {
  if (req.isAuthenticated()) return res.redirect("/");
  next();
}

router.get("/register", ensureGuest, (req, res) => res.render("register"));
router.post("/register", ensureGuest, async (req, res) => {
  const { username, password } = req.body;
  if (!username?.trim() || !password) return res.status(400).send("Missing fields");

  const existingUser = await User.findOne({ username: username.trim() });
  if (existingUser) return res.status(400).send("User already exists");

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ username: username.trim(), passwordHash });
  res.redirect("/login");
});


router.get("/login", ensureGuest, (req, res) => res.render("login"));
router.post("/login",
  ensureGuest,
  passport.authenticate("local", {
    failureRedirect: "/login",
    successRedirect: "/"
  })
);


router.post("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect("/");
  });
});

module.exports = router;
