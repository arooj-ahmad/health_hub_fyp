/**
 * ManualLabForm.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Form with all 13 lab-value fields grouped by panel.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const field = (label, unit, placeholder, value, onChange) => (
  <div className="space-y-1" key={label}>
    <Label className="text-xs">
      {label} ({unit})
    </Label>
    <Input
      type={label === 'Blood Pressure' ? 'text' : 'number'}
      step="0.1"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="glass-input"
    />
  </div>
);

const ManualLabForm = ({ labValues, onChange }) => {
  const set = (key) => (e) => onChange({ ...labValues, [key]: e.target.value });

  return (
    <div className="space-y-6">
      {/* Diabetes Panel */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Diabetes Panel</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('Fasting Blood Sugar', 'mg/dL', '70-100', labValues.fastingSugar, set('fastingSugar'))}
          {field('Random Blood Sugar', 'mg/dL', '< 140', labValues.randomSugar, set('randomSugar'))}
          {field('HbA1c', '%', '< 5.7', labValues.hba1c, set('hba1c'))}
        </div>
      </div>

      {/* Lipid Profile */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Lipid Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Total Cholesterol', 'mg/dL', '< 200', labValues.totalCholesterol, set('totalCholesterol'))}
          {field('LDL', 'mg/dL', '< 100', labValues.ldl, set('ldl'))}
          {field('HDL', 'mg/dL', '> 40', labValues.hdl, set('hdl'))}
          {field('Triglycerides', 'mg/dL', '< 150', labValues.triglycerides, set('triglycerides'))}
        </div>
      </div>

      {/* Blood & Vitamins */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Blood & Vitamins</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('Hemoglobin', 'g/dL', '12-17', labValues.hemoglobin, set('hemoglobin'))}
          {field('Vitamin D', 'ng/mL', '30-100', labValues.vitaminD, set('vitaminD'))}
          {field('Blood Pressure', 'mmHg', '120/80', labValues.bloodPressure, set('bloodPressure'))}
        </div>
      </div>

      {/* Kidney / Thyroid / Uric Acid */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3">Kidney / Thyroid / Uric Acid</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('Creatinine', 'mg/dL', '0.7-1.3', labValues.creatinine, set('creatinine'))}
          {field('TSH', 'mIU/L', '0.4-4.0', labValues.tsh, set('tsh'))}
          {field('Uric Acid', 'mg/dL', '3.5-7.2', labValues.uricAcid, set('uricAcid'))}
        </div>
      </div>
    </div>
  );
};

export default ManualLabForm;
