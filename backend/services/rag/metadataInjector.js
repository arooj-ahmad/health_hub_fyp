/**
 * Metadata Injector — RAG-Ready Placeholder
 * ─────────────────────────────────────────────────────────────────────────────
 * FUTURE: This module will inject structured metadata into AI prompts:
 *   - Retrieved document references
 *   - User session context
 *   - System-level instructions based on user's health conditions
 *   - Citation formatting for source attribution
 *
 * CURRENT: Passthrough — returns the prompt unchanged.
 */

/**
 * Inject metadata and retrieved context into a prompt.
 *
 * @param {object} params
 * @param {string} params.prompt          - The original prompt
 * @param {string} params.context         - Context from contextBuilder
 * @param {Array}  params.retrievedDocs   - Documents from retrievalLayer
 * @param {object} [params.metadata]      - Additional metadata to inject
 * @returns {string} The enriched prompt
 */
export function injectMetadata({ prompt, context = '', retrievedDocs = [], metadata = {} }) {
  // TODO: Implement metadata injection
  // Example future implementation:
  //
  // let enrichedPrompt = prompt;
  //
  // if (context) {
  //   enrichedPrompt = `CONTEXT:\n${context}\n\n${enrichedPrompt}`;
  // }
  //
  // if (retrievedDocs.length > 0) {
  //   const docsText = retrievedDocs.map((doc, i) =>
  //     `[Reference ${i + 1}] (${doc.source}): ${doc.content}`
  //   ).join('\n');
  //   enrichedPrompt = `REFERENCES:\n${docsText}\n\n${enrichedPrompt}`;
  // }
  //
  // return enrichedPrompt;

  // Passthrough — no enrichment yet
  if (context) {
    return `${context}\n\n${prompt}`;
  }
  return prompt;
}

export default { injectMetadata };
