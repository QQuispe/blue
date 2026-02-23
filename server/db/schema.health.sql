-- Health Module Database Schema
-- All tables prefixed with health_ for domain isolation

-- User health profile (body metrics)
CREATE TABLE IF NOT EXISTS health_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weight DECIMAL(6,2),
    height DECIMAL(5,2),
    age INTEGER,
    gender VARCHAR(20),
    activity_level VARCHAR(20) DEFAULT 'moderate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Health goals
CREATE TABLE IF NOT EXISTS health_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type VARCHAR(20) NOT NULL,
    starting_weight DECIMAL(6,2) NOT NULL,
    target_weight DECIMAL(6,2) NOT NULL,
    target_date DATE,
    weekly_rate DECIMAL(3,2) DEFAULT 0.5,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress check-ins
CREATE TABLE IF NOT EXISTS health_checkins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight DECIMAL(6,2),
    chest DECIMAL(5,2),
    waist DECIMAL(5,2),
    hips DECIMAL(5,2),
    biceps DECIMAL(5,2),
    thighs DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, checkin_date)
);

-- Food library
CREATE TABLE IF NOT EXISTS health_foods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    barcode VARCHAR(50) UNIQUE,
    serving_size DECIMAL(6,2),
    serving_unit VARCHAR(50),
    calories DECIMAL(7,2),
    protein DECIMAL(6,2),
    carbs DECIMAL(6,2),
    fat DECIMAL(6,2),
    fiber DECIMAL(6,2),
    sugar DECIMAL(6,2),
    sodium DECIMAL(7,2),
    is_verified BOOLEAN DEFAULT FALSE,
    source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meals logged by user
CREATE TABLE IF NOT EXISTS health_meals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meal_type VARCHAR(20) NOT NULL,
    meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    name VARCHAR(255),
    notes TEXT,
    total_calories DECIMAL(7,2) DEFAULT 0,
    total_protein DECIMAL(6,2) DEFAULT 0,
    total_carbs DECIMAL(6,2) DEFAULT 0,
    total_fat DECIMAL(6,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Foods within meals (junction table)
CREATE TABLE IF NOT EXISTS health_meal_foods (
    id SERIAL PRIMARY KEY,
    meal_id INTEGER NOT NULL REFERENCES health_meals(id) ON DELETE CASCADE,
    food_id INTEGER REFERENCES health_foods(id) ON DELETE SET NULL,
    food_name VARCHAR(255) NOT NULL,
    servings DECIMAL(6,2) DEFAULT 1,
    calories DECIMAL(7,2),
    protein DECIMAL(6,2),
    carbs DECIMAL(6,2),
    fat DECIMAL(6,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences for meal/workout generation
CREATE TABLE IF NOT EXISTS health_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dietary_restrictions TEXT[],
    allergies TEXT[],
    liked_foods TEXT[],
    disliked_foods TEXT[],
    meal_count INTEGER DEFAULT 3,
    equipment TEXT[],
    workout_style VARCHAR(50),
    workout_frequency INTEGER DEFAULT 4,
    workout_duration INTEGER DEFAULT 45,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- AI-generated meal plans
CREATE TABLE IF NOT EXISTS health_meal_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    plan_data JSONB NOT NULL,
    daily_calories DECIMAL(7,2),
    daily_protein DECIMAL(6,2),
    daily_carbs DECIMAL(6,2),
    daily_fat DECIMAL(6,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, week_start)
);

-- AI-generated workout plans
CREATE TABLE IF NOT EXISTS health_workout_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    plan_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, week_start)
);

-- Completed workout sessions
CREATE TABLE IF NOT EXISTS health_workout_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_plan_id INTEGER REFERENCES health_workout_plans(id) ON DELETE SET NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    workout_data JSONB,
    duration_minutes INTEGER,
    notes TEXT,
    completed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_profiles_user_id ON health_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_health_goals_user_id ON health_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_health_goals_active ON health_goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_health_checkins_user_date ON health_checkins(user_id, checkin_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_foods_barcode ON health_foods(barcode);
CREATE INDEX IF NOT EXISTS idx_health_foods_name ON health_foods(name);
CREATE INDEX IF NOT EXISTS idx_health_meals_user_date ON health_meals(user_id, meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_meal_foods_meal ON health_meal_foods(meal_id);
CREATE INDEX IF NOT EXISTS idx_health_preferences_user_id ON health_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_health_meal_plans_user_week ON health_meal_plans(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_health_workout_plans_user_week ON health_workout_plans(user_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_health_workout_sessions_user_date ON health_workout_sessions(user_id, session_date DESC);

-- Saved meals/recipes (custom, AI-generated, favorites)
CREATE TABLE IF NOT EXISTS health_saved_meals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(20),
    calories DECIMAL(7,2),
    protein DECIMAL(6,2),
    carbs DECIMAL(6,2),
    fat DECIMAL(6,2),
    fiber DECIMAL(6,2),
    ingredients JSONB,
    instructions TEXT,
    source VARCHAR(20) CHECK (source IN ('custom', 'ai')) DEFAULT 'custom',
    is_favorite BOOLEAN DEFAULT FALSE,
    usda_fdc_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_health_saved_meals_user ON health_saved_meals(user_id);
CREATE INDEX IF NOT EXISTS idx_health_saved_meals_favorite ON health_saved_meals(user_id, is_favorite);
