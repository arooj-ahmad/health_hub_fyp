/**
 * PdfUpload.jsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Drag-and-drop / click-to-upload area for PDF or image lab reports.
 */

import { useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const PdfUpload = ({ file, onFileChange }) => {
  const { toast } = useToast();
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Maximum file size is 10 MB', variant: 'destructive' });
      return;
    }
    onFileChange(f);
  };

  const handleInputChange = (e) => {
    handleFile(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-2">
      <Label>Report Image / PDF (JPG, PNG, PDF — photo or scan of your lab report)</Label>
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center smooth-transition cursor-pointer ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('lab-file-input')?.click()}
      >
        <input
          id="lab-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-semibold text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
        ) : (
          <div>
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">Click or drag & drop to upload</p>
            <p className="text-sm text-muted-foreground">JPG, PNG, PDF — Max 10 MB</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfUpload;
