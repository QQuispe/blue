<script setup>
import { ref, onMounted } from "vue";
import TransactionTable from "~/components/TransactionTable.vue";
import Dashboard from "~/components/Dashboard.vue";

const linkToken = ref("");
const connectedItems = ref([]);
const isLoading = ref(false);
const transactionTableRef = ref(null);

// Fetch user's connected items on mount
const fetchConnectedItems = async () => {
  try {
    const response = await fetch("/api/user/items");
    if (response.ok) {
      const data = await response.json();
      connectedItems.value = data.items || [];
    }
  } catch (error) {
    console.error("Error fetching connected items:", error);
  }
};

// Sync accounts for an item
const syncAccounts = async (itemId) => {
  try {
    const response = await fetch("/api/plaid/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const data = await response.json();
    if (data.statusCode === 200) {
      console.log("Accounts synced:", data.accounts);
      return true;
    } else {
      console.error("Account sync failed:", data.message);
      return false;
    }
  } catch (error) {
    console.error("Error syncing accounts:", error);
    return false;
  }
};

// Sync transactions for an item
const syncTransactions = async (itemId) => {
  isLoading.value = true;
  try {
    const response = await fetch("/api/plaid/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    const data = await response.json();
    if (data.statusCode === 200) {
      console.log("Transaction sync completed:", data.stats);
      // Refresh items list to show updated data
      await fetchConnectedItems();
      // Refresh transaction table to show new transactions
      if (transactionTableRef.value) {
        transactionTableRef.value.refresh();
      }
    } else {
      console.error("Transaction sync failed:", data.message);
    }
  } catch (error) {
    console.error("Error syncing transactions:", error);
  } finally {
    isLoading.value = false;
  }
};

// Initialize Plaid Link
const initializePlaidLink = async () => {
  try {
    const response = await fetch("/api/plaid/tokens", { method: "POST" });
    const data = await response.json();
    linkToken.value = data.link_token;

    const plaidLink = Plaid.create({
      token: linkToken.value,
      onSuccess: async (public_token) => {
        const accessResponse = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicToken: public_token }),
        });
        const accessData = await accessResponse.json();
        if (accessData.status === "success") {
          console.log("Bank connected successfully:", accessData);
          // Refresh items list
          await fetchConnectedItems();
          // First sync accounts (required for transaction sync)
          const accountsSynced = await syncAccounts(accessData.itemId);
          if (accountsSynced) {
            // Then sync transactions
            await syncTransactions(accessData.itemId);
          }
        } else {
          console.error("Error exchanging public token:", accessData.message);
        }
      },
      onExit: (error) => {
        if (error) {
          console.error("Error during Plaid Link:", error);
        }
      },
    });

    plaidLink.open();
  } catch (error) {
    console.error("Error initializing Plaid Link:", error);
  }
};

onMounted(() => {
  fetchConnectedItems();
});
</script>

<template>
  <Dashboard />
  <div class="connect-section">
    <button @click="initializePlaidLink" :disabled="isLoading">
      {{ isLoading ? 'Processing...' : 'Connect Bank' }}
    </button>
    
    <div v-if="connectedItems.length" class="connected-banks">
      <h3>Connected Banks</h3>
      <div v-for="item in connectedItems" :key="item.id" class="bank-item">
        <span>Institution: {{ item.plaid_institution_id }}</span>
        <button 
          @click="syncTransactions(item.plaid_item_id)" 
          :disabled="isLoading"
          class="sync-btn"
        >
          Sync
        </button>
      </div>
    </div>
    
    <TransactionTable ref="transactionTableRef" />
  </div>
</template>

<style scoped>
.connect-section {
  padding: 20px;
}

.connected-banks {
  margin-top: 20px;
}

.bank-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: rgb(64, 64, 64);
  margin: 10px 0;
  border-radius: 5px;
}

.sync-btn {
  margin-left: 10px;
  padding: 5px 15px;
}
</style>
