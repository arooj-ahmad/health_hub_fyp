/**
 * HealthWarningModal — Step 3 of the diet planner
 *
 * Displays risk warnings when user's manual goal conflicts with
 * BMI-derived recommendation, or if health conditions need attention.
 */

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldAlert, Info, ArrowLeft, ArrowRight } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: {
    icon: ShieldAlert,
    color: 'text-red-500',
    bg: 'bg-red-500/10 border-red-500/30',
    badgeCls: 'bg-red-500 text-white',
    label: 'Critical Risk',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    badgeCls: 'bg-yellow-500 text-white',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/30',
    badgeCls: 'bg-blue-500 text-white',
    label: 'Info',
  },
};

export default function HealthWarningModal({ riskReport, onOverride, onCancel }) {
  if (!riskReport) return null;

  const cfg = SEVERITY_CONFIG[riskReport.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* Warning card */}
      <Card className={`p-6 border-2 ${cfg.bg}`}>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${cfg.bg} flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${cfg.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl font-bold text-foreground">Health Safety Check</h3>
              <Badge className={cfg.badgeCls}>{cfg.label}</Badge>
            </div>

            <div className="space-y-2 mb-4">
              {riskReport.warnings.map((w, i) => (
                <p key={i} className="text-foreground leading-relaxed">{w}</p>
              ))}
            </div>

            {/* Condition adaptations */}
            {riskReport.conditionAdaptations?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-foreground mb-2">
                  Your conditions will be accounted for:
                </h4>
                {riskReport.conditionAdaptations.map((a, i) => (
                  <div key={i} className="mb-2 p-3 rounded-lg bg-background/50 border border-border/30">
                    <p className="font-medium text-foreground mb-1">{a.label}</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {a.rules.map((r, j) => <li key={j}>{r}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Exclusion list */}
            {riskReport.exclusionList?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-foreground mb-2">Foods that will be excluded:</h4>
                <div className="flex flex-wrap gap-2">
                  {riskReport.exclusionList.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-destructive/10 text-destructive">
                      🚫 {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={onCancel}
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back & Change Goal
        </Button>
        <Button
          className={`flex-1 gap-2 ${riskReport.severity === 'critical' ? 'bg-red-600 hover:bg-red-700' : 'medical-gradient'} text-white`}
          onClick={onOverride}
        >
          {riskReport.severity === 'critical' ? 'I Understand the Risk — Proceed' : 'Continue with This Goal'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
