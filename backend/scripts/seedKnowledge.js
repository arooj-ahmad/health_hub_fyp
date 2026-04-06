/**
 * Knowledge Base Seeder Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage: node scripts/seedKnowledge.js
 *
 * Seeds the three knowledge base collections:
 *   - nutrition_facts (5 documents)
 *   - clinical_guidelines (4 documents)
 *   - recipes_catalog (3 documents)
 *
 * Safe to re-run — overwrites existing documents with matching IDs.
 * Requires Firebase Admin SDK to be configured (serviceAccountKey.json).
 */

import { seedKnowledgeBase, getLocalSeedData } from '../services/knowledge/seedData.js';
import { isFirebaseInitialized } from '../config/firebase.js';

async function main() {
  console.log('\n📚 Knowledge Base Seeder');
  console.log('═══════════════════════════════════════════════════\n');

  if (!isFirebaseInitialized) {
    console.log('⚠️  Firebase not initialized — showing local data summary.\n');
    const local = getLocalSeedData();
    console.log(`Nutrition Facts: ${local.nutritionFacts.length} documents`);
    local.nutritionFacts.forEach((n) => console.log(`  • ${n.ingredientId}: ${n.name}`));
    console.log(`\nClinical Guidelines: ${local.clinicalGuidelines.length} documents`);
    local.clinicalGuidelines.forEach((g) => console.log(`  • ${g.conditionId}: ${g.conditionName}`));
    console.log(`\nRecipes Catalog: ${local.recipesCatalog.length} documents`);
    local.recipesCatalog.forEach((r) => console.log(`  • ${r.recipeId}: ${r.name}`));
    console.log('\n✅ Local seed data is available (used in dev mode).');
    console.log('   To seed Firestore, configure serviceAccountKey.json and re-run.\n');
    process.exit(0);
  }

  try {
    const result = await seedKnowledgeBase();
    console.log('\n✅ Seeding complete!');
    console.log(`   Nutrition Facts: ${result.counts.nutrition}`);
    console.log(`   Clinical Guidelines: ${result.counts.guidelines}`);
    console.log(`   Recipes Catalog: ${result.counts.recipes}`);
    console.log('');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

main();
