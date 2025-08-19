const express = require("express");
const router = express.Router();
const Poll = require("../models/Poll");

// helpers
function ensureAuth(req, res, next) {
  if (!req.isAuthenticated()) return res.redirect("/login");
  next();
}

// List all polls (anyone can view & vote)
router.get("/", async (req, res) => {
  const polls = await Poll.find().sort({ createdAt: -1 }).lean();
  res.render("index", { polls }); // same view, shows list if polls provided
});

// Create form
router.get("/new", ensureAuth, (req, res) => {
  res.render("poll", { mode: "create" });
});

// Create poll
router.post("/", ensureAuth, async (req, res) => {
  const { title, options } = req.body;
  const names = (options || "").split("\n").map(s => s.trim()).filter(Boolean);
  if (!title?.trim() || names.length < 2) return res.status(400).send("Need title + 2+ options");

  const poll = await Poll.create({
    title: title.trim(),
    options: names.map(name => ({ name })),
    createdBy: req.user._id
  });
  res.redirect(`/polls/${poll._id}`);
});

// Show single poll
router.get("/:id", async (req, res) => {
  const poll = await Poll.findById(req.params.id).lean();
  if (!poll) return res.status(404).send("Poll not found");
  res.render("poll", { mode: "view", poll });
});

// Vote (anyone)
router.post("/:id/vote", async (req, res) => {
  const { option } = req.body; // option index
  const poll = await Poll.findById(req.params.id);
  if (!poll) return res.status(404).send("Poll not found");

  const idx = Number(option);
  if (Number.isNaN(idx) || idx < 0 || idx >= poll.options.length) {
    return res.status(400).send("Invalid option");
  }
  poll.options[idx].votes += 1;
  await poll.save();
  res.redirect(`/polls/${poll._id}`);
});

// Add option (auth users can add new option if they don't like current ones)
router.post("/:id/options", ensureAuth, async (req, res) => {
  const { name } = req.body;
  const poll = await Poll.findById(req.params.id);
  if (!poll) return res.status(404).send("Poll not found");
  if (!name?.trim()) return res.status(400).send("Option name required");

  poll.options.push({ name: name.trim(), votes: 0 });
  await poll.save();
  res.redirect(`/polls/${poll._id}`);
});

// Delete poll (only owner)
router.post("/:id/delete", ensureAuth, async (req, res) => {
  const poll = await Poll.findById(req.params.id);
  if (!poll) return res.status(404).send("Poll not found");
  if (String(poll.createdBy) !== String(req.user._id)) {
    return res.status(403).send("Not allowed");
  }
  await poll.deleteOne();
  res.redirect("/polls/mine");
});

// My polls
router.get("/mine/list", ensureAuth, async (req, res) => {
  const polls = await Poll.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).lean();
  res.render("my-polls", { polls });
});

// Short link for convenience
router.get("/mine", ensureAuth, (req, res) => res.redirect("/polls/mine/list"));

module.exports = router;
