/**
 * Metadata Injector — Knowledge-Aware Implementation
 * ─────────────────────────────────────────────────────────────────────────────
 * Formats structured context (from contextBuilder) into prompt-ready text
 * and attaches source references for citation tracking.
 *
 * INPUTS:
 *   - prompt: the original AI prompt
 *   - context: { guidelines, nutrition, recipes, sources } from contextBuilder
 *   - retrievedDocs: array from retrievalLayer (for future vector search)
 *
 * OUTPUTS:
 *   - enrichedPrompt: string — the prompt with context prepended
 *   - sources: array — all sources referenced in the context
 *
 * PROMPT STRUCTURE (after injection):
 *   SYSTEM CONTEXT (KNOWLEDGE BASE):
 *     CLINICAL GUIDELINES: ...
 *     NUTRITION REFERENCE DATA: ...
 *     REFERENCE RECIPES: ...
 *     RETRIEVED DOCUMENTS: ...  (future)
 *   
 *   [original prompt]
 */

/**
 * Inject knowledge context and source metadata into an AI prompt.
 *
 * @param {object} params
 * @param {string} params.prompt         - Original AI prompt
 * @param {object} params.context        - Structured context from contextBuilder
 * @param {Array}  params.retrievedDocs  - Documents from retrievalLayer (future)
 * @param {object} [params.metadata]     - Additional metadata
 * @returns {{ enrichedPrompt: string, sources: Array }}
 */
export function injectMetadata({ prompt, context = {}, retrievedDocs = [], metadata = {} }) {
  const sections = [];
  const allSources = [];

  // ── 1. Clinical Guidelines ────────────────────────────────────────────
  const guidelines = context.guidelines || [];
  if (guidelines.length > 0) {
    const guidelineText = guidelines.map((g) => {
      const parts = [`CONDITION: ${g.conditionName || g.conditionId}`];
      if (g.avoid?.length > 0) parts.push(`  AVOID: ${g.avoid.join(', ')}`);
      if (g.limit?.length > 0) parts.push(`  LIMIT: ${g.limit.join(', ')}`);
      if (g.recommend?.length > 0) parts.push(`  RECOMMENDED: ${g.recommend.join(', ')}`);
      if (g.portionGuidance) parts.push(`  PORTION GUIDE: ${g.portionGuidance}`);
      if (g.mealTiming) parts.push(`  MEAL TIMING: ${g.mealTiming}`);
      parts.push(`  [Source: ${g.source} v${g.version}]`);
      return parts.join('\n');
    }).join('\n\n');

    sections.push(`=== CLINICAL GUIDELINES (from knowledge base) ===\n${guidelineText}`);
  }

  // ── 2. Nutrition Reference Data ───────────────────────────────────────
  const nutrition = context.nutrition || [];
  if (nutrition.length > 0) {
    const nutritionText = nutrition.map((n) => {
      const nut = n.nutrients || {};
      return `${n.name} (${n.servingSize}): ${nut.calories || 0} kcal, P:${nut.proteinG || 0}g, C:${nut.carbsG || 0}g, F:${nut.fatG || 0}g, Fiber:${nut.fiberG || 0}g [${n.source}]`;
    }).join('\n');

    sections.push(`=== NUTRITION REFERENCE DATA ===\n${nutritionText}`);
  }

  // ── 3. Reference Recipes ──────────────────────────────────────────────
  const recipes = context.recipes || [];
  if (recipes.length > 0) {
    const recipesText = recipes.map((r) => {
      return `${r.name}: ${r.calories} kcal/serving, ingredients: ${(r.ingredients || []).join(', ')}. Safe for: ${(r.safeForConditions || []).join(', ')}. Note: ${r.healthNote || 'N/A'} [${r.source}]`;
    }).join('\n');

    sections.push(`=== REFERENCE RECIPES (halal, pre-vetted) ===\n${recipesText}`);
  }

  // ── 4. Retrieved Documents (future vector search) ─────────────────────
  if (retrievedDocs.length > 0) {
    const docsText = retrievedDocs.map((doc, i) =>
      `[Ref ${i + 1}] (score: ${doc.score?.toFixed(2) || 'N/A'}, source: ${doc.source || 'unknown'}): ${doc.content}`
    ).join('\n');

    sections.push(`=== RETRIEVED DOCUMENTS ===\n${docsText}`);

    retrievedDocs.forEach((doc, i) => {
      allSources.push({
        id: `retrieved_${i}`,
        type: 'vector_search',
        source: doc.source || 'unknown',
        score: doc.score,
        title: doc.title || `Retrieved Document ${i + 1}`,
      });
    });
  }

  // ── Merge sources ─────────────────────────────────────────────────────
  const contextSources = context.sources || [];
  allSources.push(...contextSources);

  // ── Build enriched prompt ─────────────────────────────────────────────
  let enrichedPrompt = prompt;

  if (sections.length > 0) {
    const contextBlock = [
      '╔══════════════════════════════════════════════════════════════╗',
      '║  SYSTEM CONTEXT (KNOWLEDGE BASE — use this data strictly)  ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',
      ...sections,
      '',
      'IMPORTANT: Prefer the above knowledge base data over your general knowledge.',
      'If the knowledge base conflicts with your training, use the knowledge base.',
      `Sources referenced: ${allSources.length}`,
      '',
    ].join('\n');

    enrichedPrompt = `${contextBlock}\n${prompt}`;
  }

  return {
    enrichedPrompt,
    sources: allSources,
  };
}

/**
 * Format sources array for inclusion in AI JSON output instructions.
 * Used by controllers to tell the AI to cite these sources.
 */
export function formatSourcesForPrompt(sources = []) {
  if (sources.length === 0) return '';

  const sourceList = sources.map((s) =>
    `{ "id": "${s.id}", "title": "${s.title}", "source": "${s.source}" }`
  ).join(',\n    ');

  return `

Include a "sources" field in your JSON response referencing any knowledge you used:
"sources": [
    ${sourceList}
  ]

Include a "confidence" field (0.0 to 1.0) indicating how well the context supports your response.`;
}

export default { injectMetadata, formatSourcesForPrompt };
