import { OpenAI } from 'openai';
import { DAVOS_API_ENDPOINT } from './constants';

export async function fetchOpenAIResponseDirectly(
  directive: string,
  proposal: string
): Promise<string> {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.info(
      `[TEST MODE] Mocking OpenAI response for directive: ${directive.substring(0, 50)}...`
    );
    return `Mock AI summary for test environment. This is a simulated response for: ${proposal.substring(0, 100)}...`;
  }

  const openai = new OpenAI({
    apiKey: (import.meta as { env?: { VITE_OPENAI_API_KEY?: string } }).env?.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: directive },
        { role: 'user', content: proposal },
      ],
    });

    return response.choices[0].message.content || '';
  } catch (err) {
    const error = err as Error;
    console.error('Error:', error);
    throw error; // Propagate error for React Query to handle
  }
}

export async function fetchOpenAIResponse(directive: string, proposal: string): Promise<string> {
  // Use test mode adapter if VITE_TEST_ENV is true
  const isTestMode =
    (import.meta as { env?: { VITE_TEST_ENV?: string } }).env?.VITE_TEST_ENV === 'true';
  if (isTestMode) {
    // Mock response for test environment
    console.info(
      `[TEST MODE] Mocking Davos AI response for directive: ${directive.substring(0, 50)}...`
    );
    return `Mock Davos AI summary for test environment. This is a simulated response for: ${proposal.substring(0, 100)}...`;
  }

  try {
    const response = await fetch(`${DAVOS_API_ENDPOINT}/api/ai-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        directive: directive,
        proposal: proposal,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return 'Error fetching Davos response';
    }

    if (!data.response) {
      return 'Error fetching Davos response';
    }

    return data.response;
  } catch (err) {
    const error = err as Error;
    console.error('Error:', error);
    throw error; // Propagate error for React Query to handle
  }
}
