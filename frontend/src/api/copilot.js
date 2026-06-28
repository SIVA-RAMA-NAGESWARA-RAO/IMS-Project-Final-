import client from './client';

/**
 * Send a message to the context-aware copilot.
 * @param {{ userMessage: string, currentRoute: string, conversationHistory?: array }} payload
 * @returns {{ reply: string }}
 */
export const chatWithCopilot = async ({ userMessage, currentRoute, conversationHistory }) => {
  const { data } = await client.post('/ai/copilot', {
    userMessage,
    currentRoute,
    conversationHistory,
  });
  return data;
};
