/**
 * unsplashService.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Fetches food images from Unsplash based on recipe names.
 * Falls back gracefully — if the API call fails the UI shows the emoji icon.
 */

const UNSPLASH_URL = "https://api.unsplash.com/search/photos";

export const fetchRecipeImage = async (recipeName) => {
  try {
    const query = recipeName
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .split(" ")
      .slice(0, 3)
      .join(" ");

    const response = await fetch(
      `${UNSPLASH_URL}?query=${encodeURIComponent(query + " food")}&per_page=1`,
      {
        headers: {
          Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Unsplash API error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const image = data.results?.[0];

    return image?.urls?.regular || null;
  } catch (error) {
    console.error("Unsplash image fetch failed:", error);
    return null;
  }
};
