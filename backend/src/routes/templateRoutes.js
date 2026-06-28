const express = require('express');
const {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/templateController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

// HR/Admin manage interview templates (interview kits)
router.post('/', protect, allow('hr', 'admin'), createTemplate);
router.get('/', protect, allow('hr', 'admin', 'interviewer'), listTemplates);
router.get('/:id', protect, allow('hr', 'admin', 'interviewer'), getTemplate);
router.put('/:id', protect, allow('hr', 'admin'), updateTemplate);
router.delete('/:id', protect, allow('hr', 'admin'), deleteTemplate);

module.exports = router;
