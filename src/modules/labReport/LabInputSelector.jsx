/**
 * LabInputSelector.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Toggle between MANUAL entry and PDF upload modes.
 */

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlaskConical, Camera } from 'lucide-react';

const LabInputSelector = ({ labMode, onModeChange }) => {
  return (
    <Tabs value={labMode} onValueChange={onModeChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="PDF" className="gap-2">
          <Camera className="h-4 w-4" /> Upload Image / PDF
        </TabsTrigger>
        <TabsTrigger value="MANUAL" className="gap-2">
          <FlaskConical className="h-4 w-4" /> Enter Values Manually
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default LabInputSelector;
