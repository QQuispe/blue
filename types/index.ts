/**
 * Type Definitions for Blue
 * Central export file for all TypeScript types
 */

// API Types - Common
export type { ApiSuccess, ApiError, ApiResponse, PaginationMeta } from './api/common'

// API Types - Auth
export type {
  LoginBody,
  RegisterRequest,
  GuestRequest,
  SetupRequest,
  AuthUser,
  LoginResponse,
  RegisterResponse,
  GuestResponse,
  MeResponse,
  SetupResponse,
  LogoutResponse,
  AuthError,
} from './api/auth'

// API Types - Health
export type {
  HealthProfile,
  Checkin,
  CreateCheckinRequest,
  UpdateCheckinRequest,
  HealthFood,
  CreateFoodRequest,
  UpdateFoodRequest,
  MealFood,
  Meal,
  CreateMealRequest,
  UpdateMealRequest,
  SavedMealIngredient,
  SavedMeal,
  CreateSavedMealRequest,
  HealthGoal,
  CreateGoalRequest,
  UpdateGoalRequest,
  DailyMacros,
  MacroProgress,
  DashboardData,
  BarcodeLookupResponse,
  DashboardResponse,
  ProfileResponse,
  CheckinsResponse,
  CheckinResponse,
  FoodsResponse,
  FoodResponse,
  MealsResponse,
  MealResponse,
  SavedMealsResponse,
  SavedMealResponse,
  GoalsResponse,
  GoalResponse,
  BarcodeResponse,
  HealthError,
} from './api/health'

// API Types - Finance
export type {
  Account,
  Transaction,
  TransactionFilters,
  Budget,
  BudgetWithProgress,
  BillSuggestion,
  UserBill,
  CashFlowData,
  NetWorthData,
  BalanceData,
  OverviewData,
  PlaidLinkToken,
  PlaidExchangeResponseData,
  PersonalFinanceCategory,
  PlaidTransaction,
  PlaidAccount,
  TransactionSyncResponse,
  PlaidInstitution,
  SyncData,
  SyncResult,
  OverviewResponse,
  BalanceResponse,
  NetWorthResponse,
  CashFlowResponse,
  TransactionsResponse,
  TransactionFiltersResponse,
  BudgetsResponse,
  BillsResponse,
  PlaidLinkResponse,
  PlaidExchangeResponse,
  FinanceError,
} from './api/finance'

// API Types - Admin
export type { AdminStats, AdminStatsResponse, AdminError } from './api/admin'

// API Types - User
export type {
  UserSettings,
  UpdateSettingsRequest,
  ChangePasswordRequest,
  ChangeUsernameRequest,
  SettingsResponse,
  UpdateSettingsResponse,
  ChangePasswordResponse,
  ChangeUsernameResponse,
  DeleteAccountResponse,
  UserError,
} from './api/user'

// Database Types - Users
export type { User, UserSession } from './db/users'

// Database Types - Health
export type {
  HealthFood as HealthFoodDB,
  HealthCheckin,
  HealthMeal,
  HealthMealFood,
  HealthSavedMeal,
  SavedMealIngredient as SavedMealIngredientDB,
  HealthGoal as HealthGoalDB,
  HealthProfile as HealthProfileDB,
} from './db/health'

// Database Types - Finance
export type {
  PlaidItem,
  PlaidItem as Item, // Alias for backwards compatibility
  Account as AccountDB,
  Transaction as TransactionDB,
  Budget as BudgetDB,
  UserBill as UserBillDB,
  BillSuggestion as BillSuggestionDB,
} from './db/finance'

// Helper Types
export type QueryResult<T> = T | null
export type QueryResultArray<T> = T[]

// Domain Types - Health (legacy exports for backwards compatibility)
export type {
  Gender,
  ActivityLevel,
  GoalType,
  MealType,
  WorkoutStyle,
  HealthProfileInput,
  HealthGoalInput,
  HealthCheckinInput,
  HealthFoodInput,
  HealthMealInput,
  HealthMealFoodInput,
  HealthPreferences,
  HealthPreferencesInput,
  Measurements,
  HealthMacroTargetsInput,
  DailyMealPlan,
  HealthMealPlan,
  HealthWorkoutPlan,
  AIMealPlanRequest,
  AIWorkoutPlanRequest,
  HealthDashboard,
} from './health'
