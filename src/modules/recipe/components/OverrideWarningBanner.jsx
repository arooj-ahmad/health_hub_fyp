import { AlertTriangle } from 'lucide-react';

/**
 * OverrideWarningBanner — Displayed when user overrides health warnings (STEP 6)
 * Shows a persistent banner reminding user that health warnings were overridden.
 */
const OverrideWarningBanner = ({ problemIngredients }) => {
  if (!problemIngredients || problemIngredients.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">
            ⚠️ USER OVERRIDDEN HEALTH WARNING
          </h4>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
            You chose to continue despite health warnings. The recipes below have been adjusted to use
            healthier cooking methods where possible, but please be mindful of the following:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {problemIngredients.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              >
                {typeof item === 'object' ? item.ingredient : item}: {typeof item === 'object' ? item.reason : 'Health concern'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverrideWarningBanner;
