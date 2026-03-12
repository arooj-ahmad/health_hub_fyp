/**
 * recipeImageGenerator.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Fetches relevant food images from Unsplash for each recipe card.
 * Falls back gracefully — if the fetch fails the UI shows the emoji icon.
 */

import { fetchRecipeImage } from '@/services/unsplashService';

/**
 * Attach Unsplash images to an array of recipe objects.
 * Calls the Unsplash API for each recipe in parallel. If a call fails the
 * recipe's `image` stays null and the UI renders the fallback icon.
 *
 * @param {Array} recipes - Array of recipe objects with a `name` or `title` property
 * @returns {Promise<Array>} New array with `image` (Unsplash URL) fields attached
 */
export const attachRecipeImages = async (recipes) => {
  if (!Array.isArray(recipes)) return recipes;

  const results = await Promise.allSettled(
    recipes.map(async (recipe) => {
      if (recipe.image) return recipe;          // already has an image
      const title = recipe.name || recipe.title;
      const image = await fetchRecipeImage(title);
      return { ...recipe, image };
    }),
  );

  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : recipes[i],
  );
};
