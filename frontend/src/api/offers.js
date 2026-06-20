import client from './client';

export const listOffers = (params) => client.get('/offers', { params }).then((r) => r.data);
export const createOffer = (data) => client.post('/offers', data).then((r) => r.data);
export const respondToOffer = (id, decision) => client.patch(`/offers/${id}/respond`, { decision }).then((r) => r.data);
export const initiateOnboarding = (id) => client.patch(`/offers/${id}/onboard`).then((r) => r.data);
