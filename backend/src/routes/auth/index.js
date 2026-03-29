const router = require("express").Router();
router.use("/", require("./core"));
router.use("/", require("./email"));
router.use("/", require("./password"));
module.exports = router;
