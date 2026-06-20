const express = require('express');
const { createOffer, respondToOffer, initiateOnboarding, listOffers } = require('../controllers/offerController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

router.post('/', protect, allow('hr'), createOffer);
router.get('/', protect, allow('hr'), listOffers);
router.patch('/:id/respond', protect, allow('candidate'), respondToOffer);
router.patch('/:id/onboard', protect, allow('hr'), initiateOnboarding);

module.exports = router;
