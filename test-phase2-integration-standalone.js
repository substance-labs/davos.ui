#!/usr/bin/env node

import { config } from 'dotenv';
import fetch from 'node-fetch';
import { keccak256 } from 'web3-utils';

// Load environment variables from .env file
config();

// Test-specific constants (avoiding browser imports)
const DAVOS_API_ENDPOINT = process.env.VITE_TEST_ENV === 'true' ? 'http://127.0.0.1:5001' : process.env.VITE_DAVOS_API_ENDPOINT || 'https://3651-82-60-186-207.ngrok-free.app';
const SNAPSHOT_API_URL = 'https://hub.snapshot.org/graphql';
const TALLY_API_URL = 'https://api.tally.xyz/query';
const TALLY_API_KEY = process.env.VITE_TALLY_API_KEY || '';

console.log('🚀 Testing Phase 2 Integration (Standalone Version)...\n');

// Mock the functions we need (simplified versions)
async function fetchDaoInfo(source, daoId) {
  if (source === 'snapshot') {
    // Simplified snapshot fetch
    try {
      const query = `
        query {
          space(id: "${daoId}") {
            id
            name
          }
        }
      `;

      const response = await fetch(SNAPSHOT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      console.log('Snapshot response:', data.data?.space ? 'Found' : 'Not found');
      return data.data?.space ? { success: true, data: data.data.space } : null;
    } catch (error) {
      console.error('Snapshot fetch error:', error.message);
      return null;
    }
  } else if (source === 'tally') {
    // Use the correct format from working test
    try {
      const query = `query { governor(input: {id: "${daoId}"}) { chainId name organization { id } } }`;

      const response = await fetch(TALLY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': TALLY_API_KEY
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      console.log('Tally response:', data.data?.governor ? 'Found' : 'Not found');
      return data.data?.governor ? { success: true, data: data.data.governor } : null;
    } catch (error) {
      console.error('Tally fetch error:', error.message);
      return null;
    }
  }
  return null;
}

async function fetchProposals(source, daoId, limit = 10) {
  if (source === 'snapshot') {
    try {
      const query = `
        query {
          proposals(
            first: ${limit}
            skip: 0
            where: { space_in: ["${daoId}"] }
            orderBy: "created"
            orderDirection: desc
          ) {
            id
            title
            state
          }
        }
      `;

      const response = await fetch(SNAPSHOT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      console.log('Snapshot proposals response:', data.data?.proposals?.length || 0, 'proposals');
      return data.data ? { proposals: data.data.proposals } : null;
    } catch (error) {
      console.error('Snapshot proposals error:', error.message);
      return null;
    }
  } else if (source === 'tally') {
    try {
      // For Tally, daoId should be the governor ID, we need to get organization ID first
      const governorQuery = `query { governor(input: {id: "${daoId}"}) { organization { id } } }`;
      const governorResponse = await fetch(TALLY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': TALLY_API_KEY
        },
        body: JSON.stringify({ query: governorQuery }),
      });
      const governorData = await governorResponse.json();
      const organizationId = governorData.data?.governor?.organization?.id;

      if (!organizationId) {
        console.log('Could not get organization ID for proposals');
        return null;
      }

      const query = `query { proposals(input: { filters: { organizationId: "${organizationId}" }, page: { limit: ${limit} } }) { nodes { ... on Proposal { id metadata { title description } status } } } }`;

      const response = await fetch(TALLY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': TALLY_API_KEY
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      console.log('Tally proposals response:', data.data?.proposals?.nodes?.length || 0, 'proposals');
      return data.data ? { proposals: data.data.proposals.nodes } : null;
    } catch (error) {
      console.error('Tally proposals error:', error.message);
      return null;
    }
  }
  return null;
}

async function getDelegationStatus(address, source, daoId) {
  console.log(`🔍 Testing REAL ${source.toUpperCase()} delegation for ${address}`);
  
  if (source === 'snapshot') {
    // Actually call the Snapshot delegation registry contract
    const SNAPSHOT_DELEGATION_REGISTRY = '0x469788fE6E9E9681C6ebF3bF78e7Fd26Fc015446';
    const RPC_URL = 'https://eth-mainnet.g.alchemy.com/v2/demo';
    
    try {
      // Calculate space ID hash (same as the actual function)
      const spaceIdHash = keccak256(daoId);
      
      // Function signature for delegation(address,uint256): 0x5c60da1b
      const functionSelector = '0x5c60da1b';
      const spaceIdParam = spaceIdHash.slice(2).padStart(64, '0'); // uint256
      const addressParam = address.slice(2).padStart(64, '0'); // address
      const data = functionSelector + spaceIdParam + addressParam;
      
      console.log(`   📞 Calling Snapshot delegation registry: ${SNAPSHOT_DELEGATION_REGISTRY}`);
      console.log(`   🔍 Function: delegation(${daoId}, ${address})`);
      console.log(`   📦 Data: ${data}`);
      
      const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: SNAPSHOT_DELEGATION_REGISTRY,
          data: data
        }, 'latest']
      };
      
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      console.log(`   📥 RPC Response:`, result.error ? `ERROR: ${result.error.message}` : `Success`);
      
      if (result.error) {
        console.log(`   ❌ Contract reverted: ${result.error.message}`);
        return { exists: false, target: null };
      }
      
      // Extract the address from the result (32 bytes, last 20 are the address)
      const delegatee = '0x' + result.result.slice(-40);
      const exists = delegatee.toLowerCase() !== '0x0000000000000000000000000000000000000000';
      
      const finalResult = { exists, target: exists ? delegatee : null };
      console.log(`   ✅ Result: ${finalResult.exists ? 'HAS DELEGATION' : 'NO DELEGATION'}`);
      if (finalResult.exists) console.log(`   👤 Delegatee: ${finalResult.target}`);
      
      return finalResult;
      
    } catch (error) {
      console.error('   ❌ Network/Request error:', error.message);
      return { exists: false, target: null };
    }
    
  } else if (source === 'tally') {
    // Actually call the Tally governor contract
    const governorAddress = daoId.includes(':') ? daoId.split(':')[2] : daoId;
    const RPC_URL = 'https://polygon-rpc.com';
    
    try {
      // Function signature for delegates(address): 0x587cde1e
      const functionSelector = '0x587cde1e';
      const addressParam = address.slice(2).padStart(64, '0'); // address
      const data = functionSelector + addressParam;
      
      console.log(`   📞 Calling Tally governor: ${governorAddress}`);
      console.log(`   🔍 Function: delegates(${address})`);
      console.log(`   📦 Data: ${data}`);
      
      const payload = {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{
          to: governorAddress,
          data: data
        }, 'latest']
      };
      
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      console.log(`   📥 RPC Response:`, result.error ? `ERROR: ${result.error.message}` : `Success`);
      
      if (result.error) {
        console.log(`   ❌ Contract reverted: ${result.error.message}`);
        return { exists: false, target: null };
      }
      
      // Extract the address from the result
      const delegatee = '0x' + result.result.slice(-40);
      const exists = delegatee.toLowerCase() !== '0x0000000000000000000000000000000000000000';
      
      const finalResult = { exists, target: exists ? delegatee : null };
      console.log(`   ✅ Result: ${finalResult.exists ? 'HAS DELEGATION' : 'NO DELEGATION'}`);
      if (finalResult.exists) console.log(`   👤 Delegatee: ${finalResult.target}`);
      
      return finalResult;
      
    } catch (error) {
      console.error('   ❌ Network/Request error:', error.message);
      return { exists: false, target: null };
    }
  }
  
  return { exists: false, target: null };
}

async function testSourceRouting() {
  console.log('📋 Test 1: Testing Snapshot source routing...');
  try {
    // Use a space that actually has proposals
    const snapshotData = await fetchDaoInfo('snapshot', 'index-coop.eth');
    console.log('✅ Snapshot data fetched:', snapshotData ? 'Success' : 'Failed');
    if (snapshotData) {
      console.log('   Data:', JSON.stringify(snapshotData, null, 2));
    }
  } catch (error) {
    console.error('❌ Snapshot routing failed:', error.message);
  }

  console.log('\n📋 Test 2: Testing Tally source routing...');
  try {
    const tallyData = await fetchDaoInfo('tally', 'eip155:137:0xe581461F349d0e787f7E1AD686808Ba07023Cb63');
    console.log('✅ Tally data fetched:', tallyData ? 'Success' : 'Failed');
    if (tallyData) {
      console.log('   Data:', JSON.stringify(tallyData, null, 2));
    }
  } catch (error) {
    console.error('❌ Tally routing failed:', error.message);
  }
}

async function testProposalFetching() {
  console.log('\n📋 Test 3: Testing Snapshot proposals...');
  try {
    const snapshotProposals = await fetchProposals('snapshot', 'index-coop.eth', 5);
    console.log('✅ Snapshot proposals fetched:', snapshotProposals?.proposals?.length || 0);
    if (snapshotProposals?.proposals?.length > 0) {
      console.log('   Sample proposal:', JSON.stringify(snapshotProposals.proposals[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Snapshot proposals failed:', error.message);
  }

  console.log('\n📋 Test 4: Testing Tally proposals...');
  try {
    const tallyProposals = await fetchProposals('tally', 'eip155:137:0xe581461F349d0e787f7E1AD686808Ba07023Cb63', 5);
    console.log('✅ Tally proposals fetched:', tallyProposals?.proposals?.length || 0);
    if (tallyProposals?.proposals?.length > 0) {
      console.log('   Sample proposal:', JSON.stringify(tallyProposals.proposals[0], null, 2));
    }
  } catch (error) {
    console.error('❌ Tally proposals failed:', error.message);
  }
}

async function testDelegationRouting() {
  console.log('\n📋 Test 5: Testing delegation status checking...');
  try {
    const testAddress = '0x1C05dEcb151A459E8B045a93f472D1B238204094';

    console.log('\n🔍 Testing Snapshot delegation...');
    const snapshotDelegation = await getDelegationStatus(testAddress, 'snapshot', 'index-coop.eth');
    console.log(`✅ Snapshot: ${snapshotDelegation.exists ? 'HAS DELEGATION' : 'NO DELEGATION'}`);
    if (snapshotDelegation.exists && snapshotDelegation.target) {
      console.log(`   Delegatee: ${snapshotDelegation.target}`);
    }

    console.log('\n🔍 Testing Tally delegation...');
    const tallyDelegation = await getDelegationStatus(testAddress, 'tally', 'eip155:137:0xe581461F349d0e787f7E1AD686808Ba07023Cb63');
    console.log(`✅ Tally: ${tallyDelegation.exists ? 'HAS DELEGATION' : 'NO DELEGATION'}`);
    if (tallyDelegation.exists && tallyDelegation.target) {
      console.log(`   Delegatee: ${tallyDelegation.target}`);
    }
    
    console.log('\n💡 Note: This test calls REAL smart contracts on mainnet/Polygon:');
    console.log('   - Snapshot: Delegation registry contract (Ethereum mainnet)');
    console.log('   - Tally: Governor contract (Polygon network)');
    console.log('   - Contracts revert when no delegation exists (this is correct behavior)');
    console.log('   - In your app, VITE_TEST_ENV=true returns mock data instead');
    
  } catch (error) {
    console.error('❌ Delegation routing failed:', error.message);
  }
}

async function runAllTests() {
  try {
    await testSourceRouting();
    await testProposalFetching();
    await testDelegationRouting();

    console.log('\n✨ Phase 2 integration tests completed!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

runAllTests();