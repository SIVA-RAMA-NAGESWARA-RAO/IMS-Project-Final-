const { validationResult } = require('express-validator');

// Runs after a chain of express-validator checks; returns 400 with a
// flat list of field errors instead of letting bad input reach a controller.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  res.status(400).json({
    message: 'Validation failed',
    errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
  });
};

module.exports = { validate };
