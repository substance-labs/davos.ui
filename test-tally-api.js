#!/usr/bin/env node

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

const API_KEY = process.env.VITE_TALLY_API_KEY || '';
const TALLY_API_URL = 'https://api.tally.xyz/query';
// Tally uses account IDs, not contract addresses
const UNISWAP_GOVERNOR = 'eip155:1:0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';

if (!API_KEY) {
  console.error('❌ VITE_TALLY_API_KEY not set');
  process.exit(1);
}

async function fetchTallyAPI(query, variables = {}) {
  try {
    const response = await fetch(TALLY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': API_KEY
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(data.errors.map(e => e.message).join(', '));
    }

    return data.data;
  } catch (error) {
    console.error('❌ API Error:', error.message);
    throw error;
  }
}

async function testAPIKey() {
  console.log('\n🔑 Test 1: Validating API Key...');
  try {
    const query = `query { governors(input: { filters: { organizationId: 2206072050475336722 } }) { nodes { ... on Governor { id name proposalStats { total active } } } } }`;
    const data = await fetchTallyAPI(query);
    console.log('✅ API Key is valid');
    return true;
  } catch (error) {
    console.error('❌ API Key validation failed');
    console.error(error);
    return false;
  }
}

async function testGovernorFetch() {
  console.log('\n📋 Test 2: Fetching Governor Info...');
  try {
    const query = `query {governor(input: {id: "eip155:137:0xe581461F349d0e787f7E1AD686808Ba07023Cb63"}) { chainId name organization { id } } }`;
    const result = await fetchTallyAPI(query, {});
    console.log('✅ Governor fetched:');
    console.log(JSON.stringify(result.governor, null, 2));
    return result.governor;
  } catch (error) {
    console.error('❌ Governor fetch failed');
    console.error(error);
    return null;
  }
}

async function testProposalsFetch() {
  console.log('\n📋 Test 3: Fetching Proposals...');
  try {
    const query = `query {proposals(input: {filters: {organizationId: "2206072050475336722"}}) {nodes {... on Proposal { status id chainId } } } }`;
    const result = await fetchTallyAPI(query, {});
    console.log('✅ Proposals fetched:');
    console.log(`   Total: ${result.proposals.nodes.length}`);
    let ids = [];
    if (result.proposals.nodes.length > 0) {
      console.log('   Proposals:');
      result.proposals.nodes.forEach(proposal => {
        console.log(JSON.stringify(proposal, null, 4));
        ids.push(proposal.id);
      });
    }
    return ids;
  } catch (error) {
    console.error('❌ Proposals fetch failed');
    console.error(error);
    return null;
  }
}

async function testProposalDetailsFetch(ids) {
  console.log('\n📋 Test 4: Fetching Proposal Details...');
  try {
    let proposals = [];
    for (const id of ids) {
      const query = `query { proposal(input: { id: "${id}" }) { id chainId metadata { title description } block { timestamp } status proposer { address } } }`;
      const result = await fetchTallyAPI(query, {});
      console.log('✅ Proposal fetched:\n', JSON.stringify(result.proposal, null, 2));
      proposals.push(result.proposal);
    }
    return proposals;
  } catch (error) {
    console.error('❌ Proposal fetch failed');
    console.error(error);
    return null;
  }
}

function testDataNormalization(proposal) {
  console.log('\n🔄 Test 5: Data Normalization...\n');

  // Normalize Tally
  const startTime = new Date(proposal.block.timestamp).getTime() / 1000;
  const normalizedTally = {
    id: proposal.id,
    title: proposal.metadata.title,
    description: proposal.metadata.description,
    state: proposal.status.toLowerCase(),
    author: proposal.proposer.address,
    source: 'tally'
  };

  console.log('✅ Tally normalized:');
  console.log(JSON.stringify(normalizedTally, null, 2));
}

async function runAllTests() {
  console.log('🚀 Starting Tally Integration Tests (Phase 1)...');
  console.log(`📍 Using API Key: ${API_KEY.substring(0, 10)}...`);
  console.log(`📍 Governor: ${UNISWAP_GOVERNOR}`);

  try {
    const apiKeyValid = await testAPIKey();
    if (!apiKeyValid) {
      console.error('\n❌ API Key validation failed. Cannot continue.');
      process.exit(1);
    }

    await testGovernorFetch();
    const ids = await testProposalsFetch();
    const proposals = await testProposalDetailsFetch(ids);
    proposals.forEach(proposal => testDataNormalization(proposal));

    console.log('\n✨ All tests completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Verify all tests passed');
    console.log('   2. Proceed to Phase 2 (Frontend integration)');
    console.log('   3. Enhance dao-utils.ts with source routing');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}
runAllTests();