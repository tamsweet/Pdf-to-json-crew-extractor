import React, { useState, useRef } from 'react';
import { UploadCloud, File, ArrowRight, Loader2, Sparkles, Check, RefreshCw } from 'lucide-react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  isLoading: boolean;
  currentFileName: string | null;
  fileSize: number | null;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelected,
  onLoadSample,
  isLoading,
  currentFileName,
  fileSize,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.name.endsWith('.txt')) {
        onFileSelected(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-amber-500 bg-amber-500/5'
            : currentFileName
            ? 'border-emerald-500/40 bg-slate-900/60 hover:border-emerald-500/70'
            : 'border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-900/50'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-3">
          {isLoading ? (
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : currentFileName ? (
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Check className="w-6 h-6" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
              <UploadCloud className="w-6 h-6" />
            </div>
          )}

          <div className="space-y-1">
            {isLoading ? (
              <>
                <p className="text-sm font-medium text-slate-200">
                  Processing document with Zig backend...
                </p>
                <p className="text-xs text-slate-500">
                  Executing pdftotext C-interop stream & state-machine parser
                </p>
              </>
            ) : currentFileName ? (
              <>
                <p className="text-sm font-medium text-emerald-400 flex items-center justify-center gap-1.5">
                  <File className="w-4 h-4" />
                  <span>{currentFileName}</span>
                </p>
                <p className="text-xs text-slate-400">
                  {fileSize ? formatBytes(fileSize) : 'Uploaded'} · Click or drop another PDF to re-extract
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-200">
                  Drop RSMeans "Crews - Standard" PDF here, or <span className="text-amber-400 underline decoration-amber-400/40">browse files</span>
                </p>
                <p className="text-xs text-slate-500">
                  Supports multi-column construction crew cost sheets up to 50MB
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Need test files?</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onLoadSample();
            }}
            disabled={isLoading}
            className="text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load RSMeans Standard Sample (21 Crews)</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          <span>C-interop: Poppler / pdftotext</span>
          <span aria-hidden="true">·</span>
          <span>Engine: Zig 0.13.0</span>
          <span aria-hidden="true">·</span>
          <span>Output: JSON Schema</span>
        </div>
      </div>
    </div>
  );
};
