import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

const API_KEY = process.env.VITE_TALLY_API_KEY;
const TALLY_API_URL = 'https://api.tally.xyz/query';

async function fetchTallyAPI(query) {
  const response = await fetch(TALLY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': API_KEY
    },
    body: JSON.stringify({ query }),
  });
  return response.json();
}

// Query for Arbitrum (mainnet) to see structure, then we'll deploy test on Arbitrum Sepolia
const query = `
  query {
    governor(input: {id: "eip155:42161:0xf07DeD9dC292157749B6Fd268E37DF6EA38395B9"}) {
      id
      name
      chainId
      organization {
        id
        name
      }
      token {
        name
        symbol
      }
    }
  }
`;

const result = await fetchTallyAPI(query);
console.log(JSON.stringify(result, null, 2));
