const asyncHandler = require('express-async-handler');
const Offer = require('../models/Offer');
const Application = require('../models/Application');
const notify = require('../utils/notify');
const { pushEvent } = require('../utils/analyticsClient');
const { logAction } = require('../utils/audit');
const { sendOfferReleasedEmail } = require('../services/emailService');

// @desc Generate / send an offer letter (Module 11)
// @route POST /api/offers
const createOffer = asyncHandler(async (req, res) => {
  const { applicationId, salary, designation, joiningDate, offerLetterUrl, isBackup } = req.body;

  const application = await Application.findById(applicationId).populate('candidate', 'name email').populate('job', 'title');
  if (!application) {
    res.status(404);
    throw new Error('Application not found');
  }

  const offer = await Offer.create({
    application: applicationId,
    salary,
    designation,
    joiningDate,
    offerLetterUrl,
    isBackup: !!isBackup,
  });

  application.status = 'Offer Released';
  application.statusHistory.push({ status: 'Offer Released' });
  await application.save();

  await notify({
    user: application.candidate._id,
    type: 'offer',
    title: 'Offer letter released',
    message: `Congratulations! An offer for "${designation}" has been sent to you.`,
    meta: { offerId: offer._id },
  });
  await sendOfferReleasedEmail(application.candidate.email, application.job.title, designation);

  await logAction({ req, action: 'offer_released', entityType: 'Offer', entityId: offer._id, metadata: { isBackup: !!isBackup } });
  await pushEvent('offer_released', { offerId: offer._id, applicationId, isBackup: !!isBackup });

  res.status(201).json(offer);
});

// @desc Candidate accepts or rejects an offer (Module 1 & 11)
// @route PATCH /api/offers/:id/respond
const respondToOffer = asyncHandler(async (req, res) => {
  const { decision } = req.body; // 'accepted' | 'rejected'
  if (!['accepted', 'rejected'].includes(decision)) {
    res.status(400);
    throw new Error('decision must be "accepted" or "rejected"');
  }

  const offer = await Offer.findById(req.params.id);
  if (!offer) {
    res.status(404);
    throw new Error('Offer not found');
  }

  offer.status = decision;
  offer.respondedAt = new Date();
  await offer.save();

  await pushEvent('offer_response', { offerId: offer._id, decision });

  res.json(offer);
});

// @desc Mark onboarding as initiated once an offer is accepted (Module 11)
// @route PATCH /api/offers/:id/onboard
const initiateOnboarding = asyncHandler(async (req, res) => {
  const offer = await Offer.findById(req.params.id);
  if (!offer) {
    res.status(404);
    throw new Error('Offer not found');
  }
  if (offer.status !== 'accepted') {
    res.status(400);
    throw new Error('Onboarding can only be initiated for accepted offers');
  }

  offer.onboardingInitiated = true;
  await offer.save();

  await pushEvent('onboarding_initiated', { offerId: offer._id });

  res.json(offer);
});

// @desc List offers, optionally filtered by application or status
// @route GET /api/offers
const listOffers = asyncHandler(async (req, res) => {
  const { applicationId, status } = req.query;
  const filter = {};
  if (applicationId) filter.application = applicationId;
  if (status) filter.status = status;

  const offers = await Offer.find(filter).populate({
    path: 'application',
    populate: [{ path: 'candidate', select: 'name email' }, { path: 'job', select: 'title' }],
  });

  res.json(offers);
});

module.exports = { createOffer, respondToOffer, initiateOnboarding, listOffers };
