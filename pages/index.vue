<script setup>
import { ref } from 'vue';
import TransactionTable from '~/components/TransactionTable.vue';

const linkToken = ref('');
const accessToken = ref('');

const initializePlaidLink = async () => {
  try {
    const response = await fetch('/api/plaid/tokens', { method: 'POST' });
    const data = await response.json();
    linkToken.value = data.link_token;

    const plaidLink = Plaid.create({
      token: linkToken.value,
      onSuccess: async (public_token) => {
        const accessResponse = await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicToken: public_token })
        });
        const accessData = await accessResponse.json();
        if (accessData.status === 'success') {
          accessToken.value = accessData.accessToken;
        } else {
          console.error('Error exchanging public token');
        }
      },
      onExit: (error) => {
        if (error) {
          console.error('Error during Plaid Link:', error);
        }
      }
    });

    plaidLink.open(); // Open Plaid Link UI
  } catch (error) {
    console.error('Error initializing Plaid Link:', error);
  }
};
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <button @click="initializePlaidLink">Connect Bank</button>
    <p v-if="accessToken">Access Token: {{ accessToken }}</p>
    <TransactionTable :accessToken="accessToken" />
  </div>
</template>