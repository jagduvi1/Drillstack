const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");
const aiService = require("../services/ai");

// POST /api/ai/suggest-tags
router.post(
  "/suggest-tags",
  authenticate,
  [body("text").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const tags = await aiService.suggestTags(req.body.text);
      res.json({ tags });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/guided-questions
router.post(
  "/guided-questions",
  authenticate,
  [body("text").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const questions = await aiService.suggestGuidedQuestions(req.body.text);
      res.json({ questions });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/common-mistakes
router.post(
  "/common-mistakes",
  authenticate,
  [body("text").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const mistakes = await aiService.suggestMistakes(req.body.text);
      res.json({ mistakes });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/variations
router.post(
  "/variations",
  authenticate,
  [body("text").trim().notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const variations = await aiService.suggestVariations(req.body.text);
      res.json({ variations });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ai/summarize
router.post(
  "/summarize",
  authenticate,
  [body("drill").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const summary = await aiService.summarizeDrill(req.body.drill);
      res.json({ summary });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
