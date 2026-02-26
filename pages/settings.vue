<script setup lang="ts">
import { ref, onMounted, computed, type Ref } from 'vue'
import BaseButton from '~/components/BaseButton.vue'

const auth = useAuth()
const { $toast } = useNuxtApp()

// Profile data
const username = computed(() => auth.user.value?.username || '')
const email = computed(() => auth.user.value?.email || '')
const isAdmin = computed(() => auth.user.value?.isAdmin || false)

// Password change
const showPasswordModal = ref(false)
const showUsernameModal = ref(false)
const newUsername = ref('')
const isChangingUsername = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const isChangingPassword = ref(false)

// Account deletion
const showDeleteModal = ref(false)
const deleteConfirmation = ref('')
const isDeleting = ref(false)

// Health data deletion
const showHealthDeleteModal = ref(false)
const healthDeleteConfirmation = ref('')
const isDeletingHealth = ref(false)

const deleteHealthData = async () => {
  if (healthDeleteConfirmation.value !== 'DELETE') {
    $toast.error('Type DELETE to confirm')
    return
  }

  try {
    isDeletingHealth.value = true
    await $fetch('/api/health/delete-all', { method: 'DELETE', credentials: 'include' })
    $toast.success('Health data deleted')
    showHealthDeleteModal.value = false
    healthDeleteConfirmation.value = ''
    // Stay on settings page - user can navigate to setup manually if they want
  } catch (err: any) {
    $toast.error(err.message || 'Failed to delete health data')
  } finally {
    isDeletingHealth.value = false
  }
}

// Admin stats
interface AdminStats {
  totalUsers: number
  totalBanks: number
  totalTransactions: number
  totalBills: number
}

const adminStats: Ref<AdminStats | null> = ref(null)
const isLoadingStats = ref(false)

// Fetch admin stats
const fetchAdminStats = async () => {
  if (!isAdmin.value) return

  try {
    isLoadingStats.value = true
    const response = await fetch('/api/admin/stats', {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch admin stats')
    }

    adminStats.value = await response.json()
  } catch (err) {
    // Silently fail - admin stats are not critical
  } finally {
    isLoadingStats.value = false
  }
}

// User settings
const userSettings = ref<any>(null)
const isLoadingSettings = ref(false)
const isSavingSettings = ref(false)

const timezones = [
  { value: 'America/New_York', label: 'New York (Eastern)' },
  { value: 'America/Chicago', label: 'Chicago (Central)' },
  { value: 'America/Denver', label: 'Denver (Mountain)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (Pacific)' },
  { value: 'America/Anchorage', label: 'Anchorage (Alaska)' },
  { value: 'Pacific/Honolulu', label: 'Honolulu (Hawaii)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'UTC', label: 'UTC' },
]

const fetchSettings = async () => {
  try {
    isLoadingSettings.value = true
    const response = await fetch('/api/user/settings', {
      credentials: 'include',
    })
    if (response.ok) {
      const data = await response.json()
      userSettings.value = {
        currency: data.settings?.currency || 'USD',
        locale: data.settings?.locale || 'en-US',
        timezone: data.settings?.timezone || 'America/Los_Angeles',
        theme: data.settings?.theme || 'light',
        notificationsEnabled: data.settings?.notificationsEnabled ?? true,
        budgetAlertsEnabled: data.settings?.budgetAlertsEnabled ?? true,
      }
    }
  } catch (err) {
    console.error('Failed to fetch settings:', err)
  } finally {
    isLoadingSettings.value = false
  }
}

const saveSettings = async () => {
  try {
    isSavingSettings.value = true
    const response = await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userSettings.value),
    })
    if (response.ok) {
      $toast.success('Settings saved!')
    } else {
      throw new Error('Failed to save')
    }
  } catch (err) {
    $toast.error('Failed to save settings')
  } finally {
    isSavingSettings.value = false
  }
}

// Change password
const changePassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    $toast.error('Passwords do not match')
    return
  }

  if (newPassword.value.length < 6) {
    $toast.error('Password must be at least 6 characters')
    return
  }

  try {
    isChangingPassword.value = true

    const response = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ newPassword: newPassword.value }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to change password')
    }

    $toast.success('Password changed successfully')
    showPasswordModal.value = false
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (err) {
    $toast.error(err instanceof Error ? err.message : 'Failed to change password')
  } finally {
    isChangingPassword.value = false
  }
}

// Change username
const changeUsername = async () => {
  if (newUsername.value.length < 2 || newUsername.value.length > 14) {
    $toast.error('Username must be between 2 and 14 characters')
    return
  }

  try {
    isChangingUsername.value = true

    const response = await fetch('/api/user/change-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ newUsername: newUsername.value }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to change username')
    }

    $toast.success('Username changed successfully')
    if (auth.user.value) {
      auth.user.value.username = newUsername.value
    }
    showUsernameModal.value = false
    newUsername.value = ''
  } catch (err) {
    $toast.error(err instanceof Error ? err.message : 'Failed to change username')
  } finally {
    isChangingUsername.value = false
  }
}

// Delete account
const deleteAccount = async () => {
  if (deleteConfirmation.value !== 'DELETE') {
    $toast.error('Please type DELETE to confirm')
    return
  }

  try {
    isDeleting.value = true

    const response = await fetch('/api/user/delete-account', {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to delete account')
    }

    $toast.success('Account deleted successfully')
    await auth.logout()
  } catch (err) {
    $toast.error(err instanceof Error ? err.message : 'Failed to delete account')
    isDeleting.value = false
  }
}

onMounted(() => {
  fetchAdminStats()
  fetchSettings()
})
</script>

<template>
  <BasePageLayout title="Settings" :show-back="false">
    <div class="settings-content">
      <div class="settings-grid">
        <!-- Profile Section -->
        <div class="settings-card">
          <div class="card-header">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h2>Profile</h2>
          </div>
          <div class="separator"></div>
          <div class="card-content">
            <div class="info-row">
              <span class="label">Username</span>
              <span class="value">{{ username }}</span>
            </div>
            <div class="info-row">
              <span class="label">Email</span>
              <span class="value">{{ email || 'Not set' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Role</span>
              <span class="value role-badge" :class="{ admin: isAdmin }">
                {{ isAdmin ? 'Admin' : 'User' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Security Section -->
        <div class="settings-card">
          <div class="card-header">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2>Security</h2>
          </div>
          <div class="separator"></div>
          <div class="card-content">
            <div class="action-row">
              <div class="action-info">
                <span class="action-title">Change Username</span>
                <span class="action-desc">Update your username (2-14 characters)</span>
              </div>
              <BaseButton variant="secondary" size="sm" @click="showUsernameModal = true">
                Change
              </BaseButton>
            </div>
            <div class="action-row">
              <div class="action-info">
                <span class="action-title">Change Password</span>
                <span class="action-desc">Update your account password</span>
              </div>
              <BaseButton variant="secondary" size="sm" @click="showPasswordModal = true">
                Change
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Connected Banks Section -->
        <div class="settings-card">
          <div class="card-header">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <h2>Connected Banks</h2>
          </div>
          <div class="separator"></div>
          <div class="card-content">
            <div class="action-row">
              <div class="action-info">
                <span class="action-title">Manage Bank Connections</span>
                <span class="action-desc">Link or unlink your bank accounts</span>
              </div>
              <BaseButton variant="secondary" size="sm" to="/finance/accounts"> Manage </BaseButton>
            </div>
          </div>
        </div>

        <!-- Preferences Section -->
        <div class="settings-card">
          <div class="card-header">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
            <h2>Preferences</h2>
          </div>
          <div class="separator"></div>
          <div v-if="userSettings" class="card-content">
            <div class="info-row">
              <span class="label">Currency</span>
              <span class="setting-disabled">USD ($)</span>
            </div>
            <div class="info-row">
              <span class="label">Date Format</span>
              <span class="setting-disabled">MM/DD/YYYY</span>
            </div>
            <div class="info-row">
              <span class="label">Timezone</span>
              <select v-model="userSettings.timezone" class="setting-select">
                <option v-for="tz in timezones" :key="tz.value" :value="tz.value">
                  {{ tz.label }}
                </option>
              </select>
            </div>
            <div class="save-row">
              <BaseButton
                variant="primary"
                size="sm"
                @click="saveSettings"
                :loading="isSavingSettings"
              >
                Save Preferences
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Admin Section (Only for admins) -->
        <div v-if="isAdmin" class="settings-card admin-card">
          <div class="card-header">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <h2>Admin Dashboard</h2>
          </div>
          <div class="separator"></div>
          <div class="card-content">
            <div v-if="isLoadingStats" class="loading-state">
              <div class="loading-spinner"></div>
              <span>Loading stats...</span>
            </div>
            <div v-else-if="adminStats" class="stats-grid">
              <div class="stat-item">
                <span class="stat-value">{{ adminStats.totalUsers }}</span>
                <span class="stat-label">Total Users</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ adminStats.totalBanks }}</span>
                <span class="stat-label">Connected Banks</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ adminStats.totalTransactions }}</span>
                <span class="stat-label">Transactions</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ adminStats.totalBills }}</span>
                <span class="stat-label">Active Bills</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Health Section -->
        <div class="settings-card">
          <div class="card-header">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
            <h2>Health Data</h2>
          </div>
          <div class="separator"></div>
          <div class="card-content">
            <div class="action-row">
              <div class="action-info">
                <span class="action-title">Delete Health Data</span>
                <span class="action-desc warning"
                  >Remove all health data including meals, check-ins, and goals. Your account will
                  remain.</span
                >
              </div>
              <BaseButton variant="danger" size="sm" @click="showHealthDeleteModal = true">
                Delete
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="settings-card danger-card">
          <div class="card-header">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h2>Danger Zone</h2>
          </div>
          <div class="separator"></div>
          <div class="card-content">
            <div class="action-row">
              <div class="action-info">
                <span class="action-title">Delete Account</span>
                <span class="action-desc warning"
                  >Permanently delete all your data. This cannot be undone.</span
                >
              </div>
              <BaseButton variant="danger" size="sm" @click="showDeleteModal = true">
                Delete
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Password Change Modal -->
      <div v-if="showPasswordModal" class="modal-overlay" @click="showPasswordModal = false">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h3>Change Password</h3>
            <button class="close-btn" @click="showPasswordModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>New Password</label>
              <div class="password-input">
                <input
                  v-model="newPassword"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter new password"
                />
                <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                  <Icon :name="showPassword ? 'mdi:eye-off' : 'mdi:eye'" size="18" />
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>Confirm Password</label>
              <div class="password-input">
                <input
                  v-model="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showConfirmPassword = !showConfirmPassword"
                >
                  <Icon :name="showConfirmPassword ? 'mdi:eye-off' : 'mdi:eye'" size="18" />
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showPasswordModal = false">Cancel</BaseButton>
            <BaseButton variant="primary" @click="changePassword" :loading="isChangingPassword">
              Update Password
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Username Change Modal -->
      <div v-if="showUsernameModal" class="modal-overlay" @click="showUsernameModal = false">
        <div class="modal" @click.stop>
          <div class="modal-header">
            <h3>Change Username</h3>
            <button class="close-btn" @click="showUsernameModal = false">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>New Username</label>
              <input
                v-model="newUsername"
                type="text"
                placeholder="Enter new username"
                maxlength="14"
              />
              <small class="input-hint"
                >2-14 characters, letters, numbers, and underscores only</small
              >
            </div>
          </div>
          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showUsernameModal = false">Cancel</BaseButton>
            <BaseButton variant="primary" @click="changeUsername" :loading="isChangingUsername">
              Update Username
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Delete Account Modal -->
      <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
        <div class="modal danger-modal" @click.stop>
          <div class="modal-header">
            <h3>Delete Account</h3>
            <button class="close-btn" @click="showDeleteModal = false">×</button>
          </div>
          <div class="modal-body">
            <p class="warning-text">
              This will permanently delete your account and all associated data including:
            </p>
            <ul class="warning-list">
              <li>All bank connections</li>
              <li>All transactions</li>
              <li>All bills and settings</li>
              <li>Your user profile</li>
            </ul>
            <p class="warning-text">
              <strong>This action cannot be undone.</strong>
            </p>
            <div class="form-group">
              <label>Type "DELETE" to confirm</label>
              <input v-model="deleteConfirmation" type="text" placeholder="DELETE" />
            </div>
          </div>
          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showDeleteModal = false">Cancel</BaseButton>
            <BaseButton variant="danger" @click="deleteAccount" :loading="isDeleting">
              Permanently Delete Account
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Delete Health Data Modal -->
      <div
        v-if="showHealthDeleteModal"
        class="modal-overlay"
        @click="showHealthDeleteModal = false"
      >
        <div class="modal danger-modal" @click.stop>
          <div class="modal-header">
            <h3>Delete Health Data</h3>
            <button class="close-btn" @click="showHealthDeleteModal = false">×</button>
          </div>
          <div class="modal-body">
            <p class="warning-text">This will permanently delete all your health data including:</p>
            <ul class="warning-list">
              <li>Your profile and body metrics</li>
              <li>Weight goals</li>
              <li>All logged meals</li>
              <li>All check-ins</li>
              <li>Meal and workout plans</li>
              <li>Preferences</li>
            </ul>
            <p class="warning-text">
              <strong>Your account and finance data will remain.</strong>
            </p>
            <p class="warning-text">
              <strong>This action cannot be undone.</strong>
            </p>
            <div class="form-group">
              <label>Type "DELETE" to confirm</label>
              <input v-model="healthDeleteConfirmation" type="text" placeholder="DELETE" />
            </div>
          </div>
          <div class="modal-footer">
            <BaseButton variant="secondary" @click="showHealthDeleteModal = false"
              >Cancel</BaseButton
            >
            <BaseButton variant="danger" @click="deleteHealthData" :loading="isDeletingHealth">
              Delete Health Data
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </BasePageLayout>
</template>

<style scoped>
.settings-content {
  display: flex;
  flex-direction: column;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 16px;
}

.settings-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  color: var(--color-text-primary);
}

.card-header svg {
  color: var(--color-accent);
}

.card-header h2 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-border), transparent);
}

.card-content {
  padding: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child {
  border-bottom: none;
}

.save-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.setting-select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  font-size: 0.875rem;
  min-width: 150px;
}

.setting-disabled {
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  border: 1px dashed var(--color-border);
}

.label {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.value {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
}

.role-badge {
  background: var(--color-border);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.role-badge.admin {
  background: var(--color-accent);
  color: var(--color-bg-primary);
}

.action-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.action-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-title {
  color: var(--color-text-primary);
  font-size: 0.875rem;
  font-weight: 500;
}

.action-desc {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.action-desc.warning {
  color: var(--color-error);
}

/* Admin Card */
.admin-card .card-header svg {
  color: #3b82f6;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: var(--color-bg-primary);
  border-radius: 8px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-accent);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 4px;
}

/* Danger Card */
.danger-card .card-header svg {
  color: var(--color-error);
}

.danger-card .card-header h2 {
  color: var(--color-error);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal.danger-modal {
  border-color: var(--color-error);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.danger-modal .modal-header h3 {
  color: var(--color-error);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-text-primary);
}

.modal-body {
  padding: 16px;
}

.warning-text {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin: 0 0 12px 0;
}

.warning-list {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  margin: 0 0 16px 0;
  padding-left: 20px;
}

.warning-list li {
  margin-bottom: 4px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
}

.form-group label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  letter-spacing: 0.05em;
}

.form-group input {
  padding: 10px 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 0.875rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.danger-modal .form-group input:focus {
  border-color: var(--color-error);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--color-border);
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}

/* Password toggle */
.password-input {
  position: relative;
}

.password-input input {
  padding-right: 48px;
  width: 100%;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.toggle-password:hover {
  color: var(--color-text-primary);
}

.input-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
