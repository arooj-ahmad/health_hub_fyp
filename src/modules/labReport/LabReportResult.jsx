/**
 * LabReportResult.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Modern health-dashboard UI for the AI lab-report analysis page.
 * Parses the AI text response into structured sections and renders each one
 * in a visually distinct, color-coded card.
 *
 * Only the UI layer — does NOT touch AI prompts, Firestore, routing, or auth.
 */

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Heart,
  Apple,
  Ban,
  LeafyGreen,
  Footprints,
  Beaker,
  TrendingUp,
  ThermometerSun,
  Utensils,
  ClipboardList,
  ShieldAlert,
  Lightbulb,
  Stethoscope,
  CircleAlert,
  Salad,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   REFERENCE RANGES — used for the manual-values status badge
   ═══════════════════════════════════════════════════════════════════════════ */

const RANGES = {
  fastingSugar:    { low: [0, 69],  normal: [70, 100],  border: [101, 125], high: [126, Infinity] },
  randomSugar:     { low: [0, 0],   normal: [0, 139],   border: [140, 199], high: [200, Infinity] },
  hba1c:           { low: [0, 0],   normal: [0, 5.6],   border: [5.7, 6.4], high: [6.5, Infinity] },
  totalCholesterol:{ low: [0, 0],   normal: [0, 199],   border: [200, 239], high: [240, Infinity] },
  ldl:             { low: [0, 0],   normal: [0, 99],    border: [100, 159], high: [160, Infinity] },
  hdl:             { low: [0, 39],  normal: [40, 120],  border: [0, 0],     high: [0, 0] },
  triglycerides:   { low: [0, 0],   normal: [0, 149],   border: [150, 199], high: [200, Infinity] },
  hemoglobin:      { low: [0, 11.9],normal: [12, 17.5], border: [0, 0],     high: [17.6, Infinity] },
  vitaminD:        { low: [0, 19],  normal: [30, 100],  border: [20, 29],   high: [0, 0] },
  uricAcid:        { low: [0, 2.3], normal: [2.4, 7.0], border: [7.1, 8.5], high: [8.6, Infinity] },
  creatinine:      { low: [0, 0.5], normal: [0.6, 1.2], border: [1.3, 1.8], high: [1.9, Infinity] },
  tsh:             { low: [0, 0.3], normal: [0.4, 4.0], border: [4.1, 6.0], high: [6.1, Infinity] },
};

const LABEL_MAP = [
  ["Fasting Blood Sugar",  "fastingSugar",    "mg/dL"],
  ["Random Blood Sugar",   "randomSugar",     "mg/dL"],
  ["HbA1c",                "hba1c",           "%"],
  ["Total Cholesterol",    "totalCholesterol", "mg/dL"],
  ["LDL",                  "ldl",             "mg/dL"],
  ["HDL",                  "hdl",             "mg/dL"],
  ["Triglycerides",        "triglycerides",   "mg/dL"],
  ["Hemoglobin",           "hemoglobin",      "g/dL"],
  ["Vitamin D",            "vitaminD",        "ng/mL"],
  ["Uric Acid",            "uricAcid",        "mg/dL"],
  ["Creatinine",           "creatinine",      "mg/dL"],
  ["TSH",                  "tsh",             "mIU/L"],
  ["Blood Pressure",       "bloodPressure",   "mmHg"],
];

function getStatus(key, raw) {
  if (key === "bloodPressure") return "info";
  const val = parseFloat(raw);
  if (isNaN(val)) return "info";
  const r = RANGES[key];
  if (!r) return "info";
  const between = (v, [lo, hi]) => v >= lo && v <= hi;
  if (between(val, r.high) && r.high[1] !== 0) return "high";
  if (between(val, r.low) && r.low[1] !== 0)   return "low";
  if (between(val, r.border) && r.border[1] !== 0) return "borderline";
  if (between(val, r.normal)) return "normal";
  return "info";
}

const STATUS_CONFIG = {
  normal:     { label: "Normal",        bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", dot: "bg-emerald-500" },
  borderline: { label: "Borderline",    bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",       dot: "bg-amber-500" },
  high:       { label: "High Risk",     bg: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",               dot: "bg-red-500" },
  low:        { label: "Low",           bg: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",               dot: "bg-sky-500" },
  info:       { label: "Recorded",      bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",          dot: "bg-slate-400" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   AI RESPONSE PARSER
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Parse the free-text AI response into structured sections keyed by topic.
 * Falls back gracefully — if a section isn't found, it stays empty.
 */
function parseAIResponse(text) {
  const result = {
    panels: "",
    labValues: "",
    risks: "",
    insights: "",
    recommended: "",
    limit: "",
    avoid: "",
    pakistani: "",
    dietAdjust: "",
    lifestyle: "",
    disclaimer: "",
  };

  if (!text) return result;

  // Normalise quirky heading styles into "## HEADING"
  let normalised = text
    .replace(/\*{2,3}(STEP\s*\d[^*]*)\*{2,3}/gi, "\n## $1")
    .replace(/^(STEP\s*\d[^\n]*)/gim, "## $1")
    .replace(/^(#{1,3})\s*/gm, "## ");

  // Split by ## headings
  const chunks = normalised.split(/\n(?=## )/);

  const classify = (heading) => {
    const h = heading.toLowerCase();
    if (/step\s*1|detect.*panel|lab\s*panel/i.test(h))                      return "panels";
    if (/step\s*2|extract.*value|lab\s*value/i.test(h))                     return "labValues";
    if (/step\s*3|risk\s*detect|risk\s*alert|warning/i.test(h))             return "risks";
    if (/step\s*4|health\s*insight|analysis|interpretation/i.test(h))       return "insights";
    if (/step\s*6|diet\s*adjust|adjustment/i.test(h))                       return "dietAdjust";
    if (/step\s*7|lifestyle|suggestion|tip/i.test(h))                       return "lifestyle";
    if (/step\s*8|disclaimer/i.test(h))                                     return "disclaimer";
    // Step 5 sub-sections
    if (/recommend.*food|healthy\s*food|foods?\s*to\s*eat/i.test(h))        return "recommended";
    if (/foods?\s*to\s*limit|limit/i.test(h))                               return "limit";
    if (/foods?\s*to\s*avoid|avoid/i.test(h))                               return "avoid";
    if (/pakistani|local|halal/i.test(h))                                   return "pakistani";
    if (/step\s*5|food\s*recommend/i.test(h))                               return "recommended"; // generic food section
    return null;
  };

  chunks.forEach((chunk) => {
    const firstLine = chunk.split("\n")[0] || "";
    const key = classify(firstLine);
    if (key) {
      // Strip the heading line itself
      const body = chunk.replace(/^##[^\n]*\n?/, "").trim();
      if (result[key]) {
        result[key] += "\n\n" + body;
      } else {
        result[key] = body;
      }
    }
  });

  // If structured parsing yielded nothing, try to split the Step 5 blob
  if (!result.limit && !result.avoid && result.recommended) {
    const rec = result.recommended;
    const limitMatch  = rec.match(/(?:\*{0,2}foods?\s*to\s*limit\*{0,2}[:\s]*)([\s\S]*?)(?=\*{0,2}foods?\s*to\s*avoid|\*{0,2}healthy\s*pakistani|$)/i);
    const avoidMatch  = rec.match(/(?:\*{0,2}foods?\s*to\s*avoid\*{0,2}[:\s]*)([\s\S]*?)(?=\*{0,2}healthy\s*pakistani|\*{0,2}diet\s*adjust|$)/i);
    const pakMatch    = rec.match(/(?:\*{0,2}healthy\s*pakistani[^:]*:\*{0,2}\s*)([\s\S]*?)(?=\*{0,2}diet\s*adjust|\*{0,2}step|$)/i);
    if (limitMatch) result.limit    = limitMatch[1].trim();
    if (avoidMatch) result.avoid    = avoidMatch[1].trim();
    if (pakMatch)   result.pakistani = pakMatch[1].trim();
    // Trim the recommended section to only the first sub-block
    const recEnd = rec.search(/\*{0,2}foods?\s*to\s*limit/i);
    if (recEnd > 0) result.recommended = rec.substring(0, recEnd).trim();
  }

  return result;
}

/** Convert a markdown-ish text block into an array of bullet strings. */
function extractBullets(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•✔✖⚠*>\d.)\s]+/, "").trim())
    .filter((l) => l.length > 2);
}

/** Render markdown-lite text: bold (**), bullet lists, paragraphs. */
function RichText({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-foreground/90">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;
        // Bullet line
        const isBullet = /^[-•✔✖⚠*>]/.test(trimmed) || /^\d+[.)]/.test(trimmed);
        const cleaned = trimmed.replace(/^[-•✔✖⚠*>\d.)\s]+/, "").trim();
        // Bold segments
        const parts = cleaned.split(/(\*{1,2}[^*]+\*{1,2})/g).map((seg, j) => {
          if (/^\*{1,2}(.+?)\*{1,2}$/.test(seg)) {
            return <strong key={j} className="font-semibold text-foreground">{seg.replace(/\*/g, "")}</strong>;
          }
          return <span key={j}>{seg}</span>;
        });
        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
              <span>{parts}</span>
            </div>
          );
        }
        return <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RISK LEVEL CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */

const RISK = {
  low: {
    label: "Low Risk",
    desc: "Your lab results look generally within normal ranges. Keep up the healthy habits!",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: <CheckCircle className="h-6 w-6" />,
    badge: "bg-emerald-500",
  },
  medium: {
    label: "Medium Risk",
    desc: "Some values are borderline and need attention. Consider lifestyle changes and follow-up tests.",
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
    icon: <AlertTriangle className="h-6 w-6" />,
    badge: "bg-amber-500",
  },
  high: {
    label: "High Risk",
    desc: "Some values are significantly abnormal. Please consult a doctor as soon as possible.",
    gradient: "from-red-500 to-rose-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    icon: <ShieldAlert className="h-6 w-6" />,
    badge: "bg-red-500",
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   FADE-IN WRAPPER
   ═══════════════════════════════════════════════════════════════════════════ */

function FadeIn({ children, delay = 0, className = "" }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      className={`transition-all duration-700 ease-out ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Section 1 — Page Header */
function PageHeader() {
  return (
    <div className="text-center space-y-3">
      <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg mb-2">
        <Stethoscope className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
        AI Lab Analysis
      </h1>
      <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
        Personalized Health Insights & Food Recommendations
      </p>
    </div>
  );
}

/** Section 2 — Risk Level Summary */
function RiskSummaryCard({ level }) {
  const cfg = RISK[level] || RISK.low;
  return (
    <Card className={`overflow-hidden border-2 ${cfg.border} ${cfg.bg}`}>
      <div className="flex items-center gap-4 p-5 md:p-6">
        <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${cfg.gradient} text-white shadow-md`}>
          {cfg.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className={`text-xl font-bold ${cfg.text}`}>{cfg.label}</h2>
            <Badge className={`${cfg.badge} text-white text-xs`}>{level?.toUpperCase()}</Badge>
          </div>
          <p className={`text-sm ${cfg.text} opacity-80`}>{cfg.desc}</p>
        </div>
      </div>
    </Card>
  );
}

/** Section — Profile Summary (BMI / Goal / Calories) */
function ProfileCard({ bmi, bmiCategory: cat, goal, targetCalories }) {
  if (!bmi && !goal) return null;
  const stats = [
    { label: "BMI", value: bmi, sub: cat },
    { label: "Goal", value: goal },
    { label: "Calories", value: targetCalories ? `${targetCalories} kcal` : null },
  ].filter((s) => s.value);

  return (
    <Card className="glass-card overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <p className="font-semibold text-sm text-foreground">Profile at Analysis</p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border/50">
        {stats.map((s) => (
          <div key={s.label} className="p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            {s.sub && <p className="text-xs text-muted-foreground">{s.sub}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Section 3 — Lab Values Table */
function LabValuesTable({ manualValues }) {
  const entries = LABEL_MAP.filter(([, key]) => manualValues[key]);
  if (!entries.length) return null;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Beaker className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Lab Values</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Your entered biomarker readings</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-semibold text-muted-foreground">Test Name</th>
                <th className="text-center p-3 font-semibold text-muted-foreground">Value</th>
                <th className="text-center p-3 font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map(([label, key, unit]) => {
                const status = getStatus(key, manualValues[key]);
                const cfg = STATUS_CONFIG[status];
                return (
                  <tr key={key} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium text-foreground">{label}</td>
                    <td className="p-3 text-center text-foreground">
                      {manualValues[key]} <span className="text-muted-foreground text-xs">{unit}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-2">
          {entries.map(([label, key, unit]) => {
            const status = getStatus(key, manualValues[key]);
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-foreground text-sm">{label}</p>
                  <p className="text-foreground text-base font-bold">
                    {manualValues[key]} <span className="text-muted-foreground text-xs font-normal">{unit}</span>
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/** Section 4 — Risk Alerts */
function RiskAlertsCard({ text }) {
  if (!text) return null;
  return (
    <Card className="border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
            <CircleAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl text-red-700 dark:text-red-300">Risk Alerts</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <RichText text={text} />
      </CardContent>
    </Card>
  );
}

/** Section 5 — Health Insights */
function HealthInsightsCard({ text }) {
  if (!text) return null;
  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
            <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Health Insights</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">AI interpretation of your lab values</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[500px] overflow-y-auto pr-1 custom-scroll">
          <RichText text={text} />
        </div>
      </CardContent>
    </Card>
  );
}

/** Section 6 — Food Recommendation Card (generic, themed by color) */
function FoodCard({ title, icon, text, theme }) {
  if (!text) return null;

  const themes = {
    green: {
      border: "border-emerald-200 dark:border-emerald-800",
      bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      title: "text-emerald-700 dark:text-emerald-300",
      bullet: "bg-emerald-500",
    },
    yellow: {
      border: "border-amber-200 dark:border-amber-800",
      bg: "bg-amber-50/50 dark:bg-amber-950/20",
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      iconColor: "text-amber-600 dark:text-amber-400",
      title: "text-amber-700 dark:text-amber-300",
      bullet: "bg-amber-500",
    },
    red: {
      border: "border-red-200 dark:border-red-800",
      bg: "bg-red-50/50 dark:bg-red-950/20",
      iconBg: "bg-red-100 dark:bg-red-900/50",
      iconColor: "text-red-600 dark:text-red-400",
      title: "text-red-700 dark:text-red-300",
      bullet: "bg-red-500",
    },
  };

  const t = themes[theme] || themes.green;
  const bullets = extractBullets(text);

  return (
    <Card className={`border-2 ${t.border} ${t.bg} overflow-hidden h-full`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${t.iconBg}`}>
            <span className={t.iconColor}>{icon}</span>
          </div>
          <CardTitle className={`text-base md:text-lg ${t.title}`}>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {bullets.length > 0 ? (
          <ul className="space-y-2">
            {bullets.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85">
                <span className={`mt-1.5 h-2 w-2 rounded-full ${t.bullet} flex-shrink-0`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <RichText text={text} />
        )}
      </CardContent>
    </Card>
  );
}

/** Section 7 — Pakistani Food Suggestions */
function PakistaniFoodCard({ text }) {
  if (!text) return null;
  const items = extractBullets(text);

  return (
    <Card className="glass-card overflow-hidden border-2 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Utensils className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Healthy Pakistani Foods</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Local, affordable & halal options</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
              >
                <Salad className="h-4 w-4 text-primary/70 flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{item}</span>
              </div>
            ))}
          </div>
        ) : (
          <RichText text={text} />
        )}
      </CardContent>
    </Card>
  );
}

/** Section 8 — Lifestyle Tips */
function LifestyleTipsCard({ text }) {
  if (!text) return null;
  const tips = extractBullets(text);

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40">
            <Footprints className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Lifestyle Tips</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Simple daily habits for better health</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tips.length > 0 ? (
          <ol className="space-y-3">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-xs font-bold text-violet-600 dark:text-violet-400">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground/85 pt-0.5">{tip}</span>
              </li>
            ))}
          </ol>
        ) : (
          <RichText text={text} />
        )}
      </CardContent>
    </Card>
  );
}

/** Section 9 — Medical Disclaimer */
function DisclaimerCard({ text }) {
  const fallback =
    "This analysis and dietary suggestions are for educational purposes only and do not replace professional medical advice or doctor consultation.";
  return (
    <Card className="border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20">
      <div className="flex items-start gap-3 p-4 md:p-5">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">Medical Disclaimer</p>
          <p className="text-sm text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
            {text || fallback}
          </p>
        </div>
      </div>
    </Card>
  );
}

/** Fallback — raw AI analysis when parsing yielded nothing useful */
function RawAnalysisCard({ text }) {
  if (!text) return null;
  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent shadow-md">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="text-xl">AI Analysis</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[600px] overflow-y-auto pr-1 custom-scroll">
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
            {text}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const LabReportResult = ({ report }) => {
  if (!report) return null;

  const {
    aiAnalysis,
    riskLevel = "low",
    labMode,
    manualValues = {},
    bmi,
    bmiCategory: cat,
    goal,
    targetCalories,
  } = report;

  const hasManual = labMode === "MANUAL" && Object.values(manualValues).some((v) => v);

  // Parse the AI response into sections
  const sections = useMemo(() => parseAIResponse(aiAnalysis), [aiAnalysis]);

  // Check if we got any meaningful parsed sections
  const hasParsed =
    sections.risks ||
    sections.insights ||
    sections.recommended ||
    sections.limit ||
    sections.avoid ||
    sections.lifestyle;

  return (
    <div className="space-y-6">
      {/* Section 1 — Page Header */}
      <FadeIn delay={0}>
        <PageHeader />
      </FadeIn>

      {/* Section 2 — Risk Level Summary */}
      <FadeIn delay={80}>
        <RiskSummaryCard level={riskLevel} />
      </FadeIn>

      {/* Profile card */}
      <FadeIn delay={140}>
        <ProfileCard bmi={bmi} bmiCategory={cat} goal={goal} targetCalories={targetCalories} />
      </FadeIn>

      {/* Section 3 — Lab Values Table (manual mode) */}
      {hasManual && (
        <FadeIn delay={200}>
          <LabValuesTable manualValues={manualValues} />
        </FadeIn>
      )}

      {/* Structured AI sections (when parsing succeeds) */}
      {hasParsed ? (
        <>
          {/* Section 4 — Risk Alerts */}
          {sections.risks && (
            <FadeIn delay={260}>
              <RiskAlertsCard text={sections.risks} />
            </FadeIn>
          )}

          {/* Section 5 — Health Insights */}
          {(sections.insights || sections.labValues) && (
            <FadeIn delay={320}>
              <HealthInsightsCard text={[sections.labValues, sections.insights].filter(Boolean).join("\n\n")} />
            </FadeIn>
          )}

          {/* Section 6 — Food Recommendations (3-card grid) */}
          {(sections.recommended || sections.limit || sections.avoid) && (
            <FadeIn delay={380}>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Apple className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Food Recommendations</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FoodCard
                    title="Recommended Foods"
                    icon={<CheckCircle className="h-5 w-5" />}
                    text={sections.recommended}
                    theme="green"
                  />
                  <FoodCard
                    title="Foods to Limit"
                    icon={<AlertTriangle className="h-5 w-5" />}
                    text={sections.limit}
                    theme="yellow"
                  />
                  <FoodCard
                    title="Foods to Avoid"
                    icon={<Ban className="h-5 w-5" />}
                    text={sections.avoid}
                    theme="red"
                  />
                </div>
              </div>
            </FadeIn>
          )}

          {/* Section 7 — Pakistani Food Suggestions */}
          {sections.pakistani && (
            <FadeIn delay={440}>
              <PakistaniFoodCard text={sections.pakistani} />
            </FadeIn>
          )}

          {/* Diet Adjustment section (if present) */}
          {sections.dietAdjust && (
            <FadeIn delay={480}>
              <Card className="glass-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/40">
                      <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Diet Adjustments Based on Lab Markers</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">Targeted nutrition for your results</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <RichText text={sections.dietAdjust} />
                </CardContent>
              </Card>
            </FadeIn>
          )}

          {/* Section 8 — Lifestyle Tips */}
          {sections.lifestyle && (
            <FadeIn delay={520}>
              <LifestyleTipsCard text={sections.lifestyle} />
            </FadeIn>
          )}
        </>
      ) : (
        /* Fallback: render the full raw AI text in one card */
        aiAnalysis && (
          <FadeIn delay={260}>
            <RawAnalysisCard text={aiAnalysis} />
          </FadeIn>
        )
      )}

      {/* No analysis placeholder */}
      {!aiAnalysis && (
        <Card className="glass-card p-12 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No analysis available for this report.</p>
        </Card>
      )}

      {/* Section 9 — Disclaimer */}
      <FadeIn delay={580}>
        <DisclaimerCard text={sections.disclaimer} />
      </FadeIn>
    </div>
  );
};

export default LabReportResult;
