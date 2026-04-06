/**
 * Knowledge Base Seed Data
 * ─────────────────────────────────────────────────────────────────────────────
 * Production-grade sample data for the three knowledge collections.
 * Run this script to populate Firestore: node scripts/seedKnowledge.js
 *
 * All data includes retrieval-ready metadata:
 *   tags, conditionIds, dietTags, region, language, version, lastUpdated
 */

import { db, isFirebaseInitialized } from '../../config/firebase.js';

// ═════════════════════════════════════════════════════════════════════════════
// NUTRITION FACTS — Pakistani-relevant USDA-sourced nutrition data
// ═════════════════════════════════════════════════════════════════════════════

const NUTRITION_FACTS = [
  {
    ingredientId: 'lentils_masoor',
    name: 'Red Lentils (Masoor Daal)',
    nameUrdu: 'مسور دال',
    servingSize: '100g cooked',
    nutrients: {
      calories: 116,
      proteinG: 9.0,
      carbsG: 20.1,
      fatG: 0.4,
      fiberG: 7.9,
      ironMg: 3.3,
      potassiumMg: 369,
      sodiumMg: 2,
    },
    dietTags: ['halal', 'high_protein', 'high_fiber', 'low_fat', 'vegetarian', 'budget_friendly'],
    conditionIds: ['type2_diabetes', 'cardiovascular', 'hypertension'],
    safeForConditions: ['type2_diabetes', 'hypertension', 'cardiovascular', 'anemia'],
    unsafeForConditions: ['gout'],
    region: 'PK',
    language: 'en',
    source: 'USDA_FoodData_Central',
    sourceId: 'USDA-172421',
    version: '1.0',
    tags: ['daal', 'lentils', 'masoor', 'protein', 'pakistani_staple'],
    lastUpdated: new Date('2025-01-15'),
  },
  {
    ingredientId: 'chicken_breast',
    name: 'Chicken Breast (skinless, grilled)',
    nameUrdu: 'مرغی کا سینہ',
    servingSize: '100g cooked',
    nutrients: {
      calories: 165,
      proteinG: 31.0,
      carbsG: 0,
      fatG: 3.6,
      fiberG: 0,
      ironMg: 1.0,
      potassiumMg: 256,
      sodiumMg: 74,
    },
    dietTags: ['halal', 'high_protein', 'low_carb', 'low_fat', 'keto_friendly'],
    conditionIds: ['type2_diabetes', 'cardiovascular'],
    safeForConditions: ['type2_diabetes', 'hypertension', 'cardiovascular', 'hypothyroidism'],
    unsafeForConditions: [],
    region: 'global',
    language: 'en',
    source: 'USDA_FoodData_Central',
    sourceId: 'USDA-171077',
    version: '1.0',
    tags: ['chicken', 'meat', 'protein', 'lean_meat', 'grilled'],
    lastUpdated: new Date('2025-01-15'),
  },
  {
    ingredientId: 'brown_rice',
    name: 'Brown Rice (cooked)',
    nameUrdu: 'براؤن چاول',
    servingSize: '100g cooked',
    nutrients: {
      calories: 123,
      proteinG: 2.7,
      carbsG: 25.6,
      fatG: 1.0,
      fiberG: 1.6,
      ironMg: 0.6,
      potassiumMg: 86,
      sodiumMg: 4,
    },
    dietTags: ['halal', 'whole_grain', 'high_fiber', 'vegetarian', 'budget_friendly'],
    conditionIds: ['type2_diabetes', 'cardiovascular'],
    safeForConditions: ['type2_diabetes', 'hypertension', 'cardiovascular'],
    unsafeForConditions: ['celiac_disease'],
    region: 'global',
    language: 'en',
    source: 'USDA_FoodData_Central',
    sourceId: 'USDA-169704',
    version: '1.0',
    tags: ['rice', 'brown_rice', 'grains', 'carbs', 'whole_grain'],
    lastUpdated: new Date('2025-01-15'),
  },
  {
    ingredientId: 'yogurt_plain',
    name: 'Plain Yogurt (dahi, low-fat)',
    nameUrdu: 'دہی',
    servingSize: '100g',
    nutrients: {
      calories: 63,
      proteinG: 5.3,
      carbsG: 7.0,
      fatG: 1.6,
      fiberG: 0,
      calciumMg: 183,
      potassiumMg: 234,
      sodiumMg: 70,
    },
    dietTags: ['halal', 'probiotic', 'high_calcium', 'low_fat', 'vegetarian'],
    conditionIds: ['hypertension', 'hypothyroidism'],
    safeForConditions: ['type2_diabetes', 'hypertension', 'cardiovascular', 'hypothyroidism'],
    unsafeForConditions: [],
    region: 'PK',
    language: 'en',
    source: 'USDA_FoodData_Central',
    sourceId: 'USDA-171284',
    version: '1.0',
    tags: ['yogurt', 'dahi', 'dairy', 'probiotic', 'calcium', 'pakistani_staple'],
    lastUpdated: new Date('2025-01-15'),
  },
  {
    ingredientId: 'whole_wheat_roti',
    name: 'Whole Wheat Roti (Chapati)',
    nameUrdu: 'گندم کی روٹی',
    servingSize: '1 roti (~40g)',
    nutrients: {
      calories: 104,
      proteinG: 3.5,
      carbsG: 20.0,
      fatG: 1.2,
      fiberG: 2.8,
      ironMg: 1.2,
      potassiumMg: 95,
      sodiumMg: 145,
    },
    dietTags: ['halal', 'whole_grain', 'high_fiber', 'vegetarian', 'budget_friendly'],
    conditionIds: ['type2_diabetes'],
    safeForConditions: ['type2_diabetes', 'hypertension', 'cardiovascular'],
    unsafeForConditions: ['celiac_disease'],
    region: 'PK',
    language: 'en',
    source: 'Pakistan_Food_Composition_Tables',
    sourceId: 'PFCT-BRD-001',
    version: '1.0',
    tags: ['roti', 'chapati', 'bread', 'wheat', 'pakistani_staple'],
    lastUpdated: new Date('2025-01-15'),
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// CLINICAL GUIDELINES
// ═════════════════════════════════════════════════════════════════════════════

const CLINICAL_GUIDELINES = [
  {
    conditionId: 'type2_diabetes',
    conditionName: 'Type 2 Diabetes Mellitus',
    avoid: ['added_sugar', 'white_bread', 'sugary_drinks', 'fruit_juice', 'candy', 'pastries'],
    limit: ['white_rice', 'potatoes', 'mangoes', 'bananas', 'honey', 'dried_fruits'],
    recommend: ['whole_grains', 'fiber', 'leafy_greens', 'lentils', 'cinnamon', 'bitter_gourd', 'fenugreek'],
    portionGuidance: 'Use the plate method: 50% non-starchy vegetables, 25% lean protein, 25% whole grains.',
    mealTiming: 'Eat at consistent times. Do not skip meals. Space carbs evenly across 3 meals.',
    macroTargets: { carbsPercent: 45, proteinPercent: 20, fatPercent: 35 },
    source: 'ADA_Standards_of_Care_2025',
    sourceUrl: 'https://diabetesjournals.org/care/issue/48/Supplement_1',
    version: '2025.1',
    tags: ['diabetes', 'blood_sugar', 'insulin', 'hba1c', 'glycemic_control'],
    conditionIds: ['type2_diabetes'],
    dietTags: ['low_glycemic', 'high_fiber'],
    region: 'global',
    language: 'en',
    lastUpdated: new Date('2025-01-01'),
  },
  {
    conditionId: 'hypertension',
    conditionName: 'Hypertension (High Blood Pressure)',
    avoid: ['excessive_salt', 'processed_meats', 'pickles_achar', 'instant_noodles', 'canned_foods'],
    limit: ['sodium_above_1500mg', 'caffeine', 'full_fat_dairy', 'red_meat'],
    recommend: ['potassium_rich_foods', 'bananas', 'spinach', 'low_fat_dairy', 'garlic', 'fish', 'olive_oil'],
    portionGuidance: 'Follow DASH diet: rich in fruits, vegetables, whole grains, and low-fat dairy.',
    mealTiming: 'Regular meals. Avoid large late-night meals. Stay hydrated.',
    macroTargets: { carbsPercent: 55, proteinPercent: 18, fatPercent: 27 },
    source: 'AHA_Hypertension_Guidelines_2024',
    sourceUrl: 'https://www.heart.org/en/health-topics/high-blood-pressure',
    version: '2024.2',
    tags: ['blood_pressure', 'DASH', 'sodium', 'potassium', 'heart_health'],
    conditionIds: ['hypertension'],
    dietTags: ['low_sodium', 'DASH'],
    region: 'global',
    language: 'en',
    lastUpdated: new Date('2024-06-01'),
  },
  {
    conditionId: 'hyperlipidemia',
    conditionName: 'High Cholesterol (Hyperlipidemia)',
    avoid: ['trans_fats', 'deep_fried_foods', 'organ_meats', 'coconut_oil_excess', 'hydrogenated_oils'],
    limit: ['saturated_fat', 'egg_yolks', 'full_fat_cheese', 'butter', 'red_meat'],
    recommend: ['oats', 'omega3_fatty_fish', 'walnuts', 'flaxseed', 'olive_oil', 'soluble_fiber', 'legumes'],
    portionGuidance: 'Limit saturated fat to <7% of calories. Increase soluble fiber to 10-25g/day.',
    mealTiming: 'Regular meals with emphasis on plant-based foods.',
    macroTargets: { carbsPercent: 50, proteinPercent: 20, fatPercent: 30 },
    source: 'ACC_AHA_Lipid_Guidelines_2024',
    sourceUrl: 'https://www.acc.org/guidelines',
    version: '2024.1',
    tags: ['cholesterol', 'LDL', 'HDL', 'triglycerides', 'lipids', 'heart_health'],
    conditionIds: ['hyperlipidemia'],
    dietTags: ['low_fat', 'heart_healthy'],
    region: 'global',
    language: 'en',
    lastUpdated: new Date('2024-03-01'),
  },
  {
    conditionId: 'anemia',
    conditionName: 'Iron Deficiency Anemia',
    avoid: ['tea_with_meals', 'coffee_with_meals', 'calcium_with_iron_foods'],
    limit: ['phytates_excess', 'oxalates_excess'],
    recommend: ['red_meat_lean', 'spinach', 'lentils', 'fortified_cereals', 'vitamin_c_with_iron', 'dates', 'liver'],
    portionGuidance: 'Pair iron-rich foods with vitamin C sources to enhance absorption.',
    mealTiming: 'Avoid tea/coffee 1 hour before and after iron-rich meals.',
    macroTargets: null,
    source: 'WHO_Nutritional_Anaemia_Guidelines_2023',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240085572',
    version: '2023.1',
    tags: ['iron', 'hemoglobin', 'ferritin', 'anemia', 'blood'],
    conditionIds: ['anemia'],
    dietTags: ['iron_rich'],
    region: 'global',
    language: 'en',
    lastUpdated: new Date('2023-11-01'),
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// RECIPES CATALOG
// ═════════════════════════════════════════════════════════════════════════════

const RECIPES_CATALOG = [
  {
    recipeId: 'rec_masoor_daal',
    name: 'Simple Masoor Daal',
    nameUrdu: 'سادہ مسور دال',
    ingredients: ['lentils_masoor', 'onion', 'tomato', 'garlic', 'turmeric', 'cumin', 'olive_oil'],
    cookingTime: '30 minutes',
    difficulty: 'Easy',
    servings: 4,
    calories: 180,
    macronutrients: { proteinG: 12, carbsG: 28, fatG: 3, fiberG: 8 },
    dietTags: ['halal', 'high_protein', 'high_fiber', 'low_fat', 'vegetarian', 'budget_friendly'],
    safeForConditions: ['type2_diabetes', 'hypertension', 'cardiovascular', 'anemia'],
    unsafeForConditions: ['gout'],
    instructions: [
      'Wash and soak masoor daal for 15 minutes',
      'Sauté onion, garlic in 1 tbsp olive oil until golden',
      'Add tomato, turmeric, cumin and cook 3 minutes',
      'Add drained lentils with 2 cups water',
      'Simmer covered for 20 minutes until soft',
      'Season with salt and coriander leaves',
    ],
    healthNote: 'High in plant protein and fiber. Low glycemic index — excellent for diabetes management.',
    region: 'PK',
    language: 'en',
    source: 'SmartNutrition_PK',
    version: '1.0',
    tags: ['daal', 'lentils', 'vegetarian', 'budget', 'pakistani'],
    conditionIds: ['type2_diabetes', 'hypertension', 'cardiovascular'],
    lastUpdated: new Date('2025-02-01'),
  },
  {
    recipeId: 'rec_grilled_chicken_salad',
    name: 'Grilled Chicken Salad with Yogurt Dressing',
    nameUrdu: 'گرلڈ چکن سلاد',
    ingredients: ['chicken_breast', 'cucumber', 'tomato', 'lettuce', 'yogurt_plain', 'lemon', 'mint'],
    cookingTime: '25 minutes',
    difficulty: 'Easy',
    servings: 2,
    calories: 280,
    macronutrients: { proteinG: 35, carbsG: 12, fatG: 9, fiberG: 3 },
    dietTags: ['halal', 'high_protein', 'low_carb', 'low_fat'],
    safeForConditions: ['type2_diabetes', 'hypertension', 'cardiovascular', 'hyperlipidemia'],
    unsafeForConditions: [],
    instructions: [
      'Marinate chicken breast with lemon, salt, pepper, cumin for 15 min',
      'Grill chicken until internal temp reaches 74°C (165°F)',
      'Chop cucumber, tomato, lettuce, and arrange on plate',
      'Mix yogurt with mint, lemon juice, salt for dressing',
      'Slice grilled chicken and place over salad',
      'Drizzle yogurt dressing on top',
    ],
    healthNote: 'High-protein, low-carb meal. Yogurt provides probiotics for gut health.',
    region: 'PK',
    language: 'en',
    source: 'SmartNutrition_PK',
    version: '1.0',
    tags: ['chicken', 'salad', 'grilled', 'high_protein', 'low_carb'],
    conditionIds: ['type2_diabetes', 'hyperlipidemia', 'cardiovascular'],
    lastUpdated: new Date('2025-02-01'),
  },
  {
    recipeId: 'rec_palak_sabzi',
    name: 'Palak Sabzi (Spinach Curry)',
    nameUrdu: 'پالک سبزی',
    ingredients: ['spinach', 'onion', 'garlic', 'tomato', 'green_chili', 'olive_oil', 'cumin'],
    cookingTime: '20 minutes',
    difficulty: 'Easy',
    servings: 3,
    calories: 95,
    macronutrients: { proteinG: 5, carbsG: 10, fatG: 4, fiberG: 5 },
    dietTags: ['halal', 'iron_rich', 'low_calorie', 'vegetarian', 'budget_friendly'],
    safeForConditions: ['type2_diabetes', 'hypertension', 'cardiovascular', 'anemia', 'hyperlipidemia'],
    unsafeForConditions: ['kidney_disease'],
    instructions: [
      'Wash and roughly chop fresh spinach',
      'Sauté onion and garlic in olive oil until soft',
      'Add chopped tomato and green chili, cook 3 minutes',
      'Add spinach and cover — wilt for 5 minutes',
      'Season with salt, cumin, and a squeeze of lemon',
      'Serve with whole wheat roti',
    ],
    healthNote: 'Excellent source of iron and vitamin C. Pair with lemon to boost iron absorption.',
    region: 'PK',
    language: 'en',
    source: 'SmartNutrition_PK',
    version: '1.0',
    tags: ['spinach', 'palak', 'iron', 'vegetarian', 'budget', 'anemia_friendly'],
    conditionIds: ['anemia', 'type2_diabetes', 'hypertension'],
    lastUpdated: new Date('2025-02-01'),
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Seed all knowledge base collections.
 * Safe to re-run — uses set() with document IDs so existing docs are overwritten.
 */
export async function seedKnowledgeBase() {
  if (!isFirebaseInitialized || !db) {
    console.log('[seed] Firebase not initialized — using in-memory data only.');
    console.log('[seed] Knowledge base data is available via getLocalSeedData().');
    return { seeded: false, counts: { nutrition: 0, guidelines: 0, recipes: 0 } };
  }

  const batch = db.batch();
  let count = 0;

  // Seed nutrition facts
  for (const doc of NUTRITION_FACTS) {
    const ref = db.collection('nutrition_facts').doc(doc.ingredientId);
    batch.set(ref, doc);
    count++;
  }

  // Seed clinical guidelines
  for (const doc of CLINICAL_GUIDELINES) {
    const ref = db.collection('clinical_guidelines').doc(doc.conditionId);
    batch.set(ref, doc);
    count++;
  }

  // Seed recipes catalog
  for (const doc of RECIPES_CATALOG) {
    const ref = db.collection('recipes_catalog').doc(doc.recipeId);
    batch.set(ref, doc);
    count++;
  }

  await batch.commit();

  const result = {
    seeded: true,
    counts: {
      nutrition: NUTRITION_FACTS.length,
      guidelines: CLINICAL_GUIDELINES.length,
      recipes: RECIPES_CATALOG.length,
    },
  };

  console.log(`[seed] ✓ Seeded ${count} documents:`, result.counts);
  return result;
}

/**
 * Get local seed data for use when Firestore is unavailable.
 * This allows the system to function in dev mode without a database.
 */
export function getLocalSeedData() {
  return {
    nutritionFacts: NUTRITION_FACTS,
    clinicalGuidelines: CLINICAL_GUIDELINES,
    recipesCatalog: RECIPES_CATALOG,
  };
}

export { NUTRITION_FACTS, CLINICAL_GUIDELINES, RECIPES_CATALOG };
export default { seedKnowledgeBase, getLocalSeedData };
