export function formatCategoryName(category: string | null | undefined): string {
  if (!category) return 'Uncategorized'

  const categoryMap: Record<string, string> = {
    'FOOD_AND_DRINK': 'Food & Drink',
    'FOOD_AND_DRINK.Restaurants': 'Restaurants',
    'FOOD_AND_DRINK.Groceries': 'Groceries',
    'SHOPPING': 'Shopping',
    'SHOPPING.Online': 'Online Shopping',
    'SHOPPING.Supermarkets': 'Supermarkets',
    'TRANSPORTATION': 'Transportation',
    'TRANSPORTATION.Taxis and Rideshare': 'Taxis & Rideshare',
    'TRANSPORTATION.Parking': 'Parking',
    'TRANSPORTATION.Gas': 'Gas',
    'TRANSPORTATION.Public Transit': 'Public Transit',
    'TRAVEL': 'Travel',
    'TRAVEL.Hotels': 'Hotels',
    'TRAVEL.Airlines': 'Airlines',
    'ENTERTAINMENT': 'Entertainment',
    'ENTERTAINMENT.Movies and Theaters': 'Movies & Theaters',
    'ENTERTAINMENT.Music': 'Music',
    'BILLS_AND_UTILITIES': 'Bills & Utilities',
    'BILLS_AND_UTILITIES.Electric': 'Electric',
    'BILLS_AND_UTILITIES.Gas': 'Gas',
    'BILLS_AND_UTILITIES.Internet': 'Internet',
    'BILLS_AND_UTILITIES.Phone': 'Phone',
    'BILLS_AND_UTILITIES.Water': 'Water',
    'HEALTHCARE': 'Healthcare',
    'HEALTHCARE.Pharmacies': 'Pharmacies',
    'HEALTHCARE.Dentists': 'Dentists',
    'HEALTHCARE.Doctors': 'Doctors',
    'PERSONAL_CARE': 'Personal Care',
    'PERSONAL_CARE.Spas and Salons': 'Spas & Salons',
    'EDUCATION': 'Education',
    'HOUSING': 'Housing',
    'HOUSING.Rent': 'Rent',
    'HOUSING.Mortgage': 'Mortgage',
    'HOUSING.Home Services': 'Home Services',
    'INCOME': 'Income',
    'INCOME.Salary': 'Salary',
    'INCOME.Direct Deposit': 'Direct Deposit',
    'TRANSFER': 'Transfer',
    'TRANSFER.Internal': 'Internal Transfer',
    'TRANSFER.External': 'External Transfer',
    'DEPOSIT': 'Deposit',
    'WITHDRAWAL': 'Withdrawal',
    'TAX': 'Tax',
    'TAX.Federal': 'Federal Tax',
    'TAX.State': 'State Tax',
  }

  if (categoryMap[category]) {
    return categoryMap[category]
  }

  const simplifiedCategory = category.split('.')[0]
  if (categoryMap[simplifiedCategory]) {
    return categoryMap[simplifiedCategory]
  }

  return category
    .split(/[._]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
