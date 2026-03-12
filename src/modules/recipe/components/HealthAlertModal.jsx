import { AlertTriangle, ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * HealthAlertModal — STEP 5 of the pipeline
 * Displays health warnings for problem ingredients and lets user choose to continue or cancel.
 */
const HealthAlertModal = ({ riskAnalysis, onContinue, onCancel, isLoading }) => {
  if (!riskAnalysis || riskAnalysis.problemIngredients.length === 0) return null;

  const { problemIngredients, riskExplanation, hasCriticalRisk, suggestedSubstitutions } = riskAnalysis;

  const criticalItems = problemIngredients.filter((p) => p.severity === 'CRITICAL');
  const warningItems = problemIngredients.filter((p) => p.severity === 'WARNING');

  return (
    <Card className="border-2 border-destructive/40 bg-destructive/5 p-0 overflow-hidden">
      {/* Header */}
      <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
              HIGH HEALTH ALERT ⚠️
            </h3>
            <p className="text-sm text-destructive/80">
              The following ingredients may be unsafe for your health
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Risk explanation */}
        {riskExplanation && (
          <p className="text-sm text-foreground/80 leading-relaxed bg-background/60 rounded-lg p-3 border border-border">
            {riskExplanation}
          </p>
        )}

        {/* Critical issues */}
        {criticalItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Critical Issues (Must Not Use)
            </h4>
            <div className="space-y-2">
              {criticalItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <Badge variant="destructive" className="text-xs shrink-0 mt-0.5">
                    CRITICAL
                  </Badge>
                  <div>
                    <span className="font-semibold text-sm text-foreground">{item.ingredient}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning issues */}
        {warningItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Health Warnings
            </h4>
            <div className="space-y-2">
              {warningItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                >
                  <Badge className="text-xs shrink-0 mt-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                    WARNING
                  </Badge>
                  <div>
                    <span className="font-semibold text-sm text-foreground">{item.ingredient}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested substitutions */}
        {suggestedSubstitutions && suggestedSubstitutions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-primary">💡 Healthier Alternatives</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestedSubstitutions.map((sub, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10 text-sm"
                >
                  <span className="text-muted-foreground line-through">{sub.original}</span>
                  <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                  <span className="font-medium text-primary">{sub.replacement}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons — Step 5 options */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-border">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-primary text-primary hover:bg-primary/5"
            onClick={onCancel}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel & Enter New Ingredients
          </Button>
          {!hasCriticalRisk && (
            <Button
              variant="destructive"
              className="flex-1 gap-2"
              onClick={onContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Continue Anyway
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
          {hasCriticalRisk && (
            <div className="flex-1 flex items-center justify-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive font-medium text-center">
                ⛔ Cannot proceed — critical allergen or halal violation detected. Please enter new ingredients.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default HealthAlertModal;
