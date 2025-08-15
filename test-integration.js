#!/usr/bin/env node
/**
 * Integration Test Script for CardsAfterDark
 * 
 * This script tests the complete flow from backend to mobile app
 * Run with: node test-integration.js
 */

const axios = require('axios');

// Configuration
const CONFIG = {
  BACKEND_URL: process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
  TEST_PHONE_1: '+15551234567',
  TEST_PHONE_2: '+15559876543',
  TEST_CODE: '123456', // Mock code for testing
};

class IntegrationTester {
  constructor() {
    this.testResults = [];
    this.tokens = {};
    this.users = {};
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 Running test: ${name}`);
    try {
      await testFn();
      console.log(`✅ ${name} - PASSED`);
      this.testResults.push({ name, status: 'PASSED' });
    } catch (error) {
      console.error(`❌ ${name} - FAILED: ${error.message}`);
      this.testResults.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async graphqlRequest(query, variables = {}, token = null) {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await axios.post(CONFIG.BACKEND_URL, {
      query,
      variables,
    }, { headers });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data;
  }

  async testBackendHealth() {
    const query = `
      query {
        healthCheck
      }
    `;
    
    const result = await this.graphqlRequest(query);
    if (!result.healthCheck) {
      throw new Error('Backend health check failed');
    }
  }

  async testPhoneVerification(phoneNumber) {
    const query = `
      mutation SendVerificationCode($phoneNumber: String!) {
        sendVerificationCode(phoneNumber: $phoneNumber) {
          sessionId
          message
        }
      }
    `;

    const result = await this.graphqlRequest(query, { phoneNumber });
    
    if (!result.sendVerificationCode.sessionId) {
      throw new Error('No session ID returned');
    }

    return result.sendVerificationCode.sessionId;
  }

  async testUserRegistration(sessionId, phoneNumber, firstName, lastName) {
    const query = `
      mutation VerifyCode($sessionId: String!, $code: String!, $firstName: String, $lastName: String) {
        verifyCode(sessionId: $sessionId, code: $code, firstName: $firstName, lastName: $lastName) {
          token
          user {
            id
            firstName
            lastName
            phoneNumber
            isVerified
          }
        }
      }
    `;

    const result = await this.graphqlRequest(query, {
      sessionId,
      code: CONFIG.TEST_CODE,
      firstName,
      lastName,
    });

    if (!result.verifyCode.token) {
      throw new Error('No auth token returned');
    }

    return {
      token: result.verifyCode.token,
      user: result.verifyCode.user,
    };
  }

  async testAICardGeneration(token) {
    const query = `
      mutation DrawCard {
        drawCard {
          id
          title
          description
          kinkFactor
          category
          tags
        }
      }
    `;

    const result = await this.graphqlRequest(query, {}, token);
    
    if (!result.drawCard) {
      throw new Error('No card returned from AI');
    }

    const card = result.drawCard;
    if (!card.title || !card.description || !card.kinkFactor) {
      throw new Error('Card missing required fields');
    }

    return card;
  }

  async testPartnerInvitation(token, phoneNumber) {
    const query = `
      mutation SendPartnerInvitation($phoneNumber: String!) {
        sendPartnerInvitation(phoneNumber: $phoneNumber) {
          id
          phoneNumber
          status
        }
      }
    `;

    const result = await this.graphqlRequest(query, { phoneNumber }, token);
    
    if (!result.sendPartnerInvitation.id) {
      throw new Error('No invitation ID returned');
    }

    return result.sendPartnerInvitation;
  }

  async testGameSession(token) {
    const query = `
      query GetCurrentGameSession {
        currentGameSession {
          id
          status
          userCards {
            userId
            card {
              title
            }
          }
        }
      }
    `;

    const result = await this.graphqlRequest(query, {}, token);
    
    if (!result.currentGameSession) {
      throw new Error('No game session returned');
    }

    return result.currentGameSession;
  }

  async runAllTests() {
    console.log('🚀 Starting CardsAfterDark Integration Tests\n');
    console.log(`Backend URL: ${CONFIG.BACKEND_URL}`);
    console.log(`Test Phone 1: ${CONFIG.TEST_PHONE_1}`);
    console.log(`Test Phone 2: ${CONFIG.TEST_PHONE_2}`);

    // Backend Tests
    await this.runTest('Backend Health Check', async () => {
      await this.testBackendHealth();
    });

    // User 1 Registration Flow
    let sessionId1;
    await this.runTest('User 1 - Phone Verification', async () => {
      sessionId1 = await this.testPhoneVerification(CONFIG.TEST_PHONE_1);
    });

    await this.runTest('User 1 - Registration', async () => {
      const auth = await this.testUserRegistration(sessionId1, CONFIG.TEST_PHONE_1, 'Alice', 'Smith');
      this.tokens.user1 = auth.token;
      this.users.user1 = auth.user;
    });

    // User 1 Game Features
    await this.runTest('User 1 - AI Card Generation', async () => {
      const card = await this.testAICardGeneration(this.tokens.user1);
      console.log(`   Generated card: "${card.title}" (Spice: ${card.kinkFactor})`);
    });

    await this.runTest('User 1 - Game Session', async () => {
      const session = await this.testGameSession(this.tokens.user1);
      console.log(`   Game session status: ${session.status}`);
    });

    // Partner Invitation
    await this.runTest('User 1 - Send Partner Invitation', async () => {
      const invitation = await this.testPartnerInvitation(this.tokens.user1, CONFIG.TEST_PHONE_2);
      console.log(`   Invitation sent to: ${invitation.phoneNumber}`);
    });

    // User 2 Registration Flow (simulating invitation acceptance)
    let sessionId2;
    await this.runTest('User 2 - Phone Verification', async () => {
      sessionId2 = await this.testPhoneVerification(CONFIG.TEST_PHONE_2);
    });

    await this.runTest('User 2 - Registration', async () => {
      const auth = await this.testUserRegistration(sessionId2, CONFIG.TEST_PHONE_2, 'Bob', 'Johnson');
      this.tokens.user2 = auth.token;
      this.users.user2 = auth.user;
    });

    // Summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary');
    console.log('================');
    
    const passed = this.testResults.filter(t => t.status === 'PASSED').length;
    const failed = this.testResults.filter(t => t.status === 'FAILED').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n🔍 Failed Tests:');
      this.testResults
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`   • ${t.name}: ${t.error}`));
    }

    if (passed === this.testResults.length) {
      console.log('\n🎉 All tests passed! CardsAfterDark is ready for end-to-end testing.');
      console.log('\n📱 Next steps:');
      console.log('   1. Test the mobile app with these user accounts');
      console.log('   2. Verify push notifications are working');
      console.log('   3. Test real-time features between devices');
      console.log('   4. Validate the complete couple experience');
    } else {
      console.log('\n🔧 Please fix failing tests before proceeding to mobile testing.');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = IntegrationTester;