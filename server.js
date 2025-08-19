const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const methodOverride = require("method-override");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("./models/User");
const Poll = require("./models/Poll"); // <-- add this

const app = express();



// DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("Mongo error:", err));

// Views & static
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || "change-me",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// Passport (Local)
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await User.findOne({ username });
    if (!user) return done(null, false, { message: "User not found" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return done(null, false, { message: "Invalid credentials" });
    return done(null, user);
  } catch (e) { return done(e); }
}));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); }
  catch (e) { done(e); }
});

app.use(passport.initialize());
app.use(passport.session());

// Globals for views
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

// Routes
const authRoutes = require("./routes/auth");
const pollRoutes = require("./routes/polls");
app.use(authRoutes);
app.use("/polls", pollRoutes);

// Home route - fetch polls and pass to index.ejs
app.get("/", async (req, res) => {
  try {
    const polls = await Poll.find().sort({ createdAt: -1 }); // latest first
    res.render("index", { polls, user: req.user }); // pass polls & user
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Not found
app.use((req, res) => res.status(404).send("Not found"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
