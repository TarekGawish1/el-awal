'use client';

import React from 'react';
import { Plus, Trash2, AlertCircle, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

interface MultipleChoiceOptionsEditorProps {
  index: number;
  optionsData: string[];
  optionImages: string[];
  correctAnswer: string;
  onAddOption: () => void;
  onRemoveOption: (optIndex: number) => void;
  onSetCorrectAnswer: (value: string) => void;
  onOptionChange: (optIndex: number, value: string) => void;
  onOptionImageUpload: (e: React.ChangeEvent<HTMLInputElement>, optIndex: number) => void;
  onRemoveOptionImage: (optIndex: number) => void;
  uploadingOptionIndex: number | null;
  errorMessage?: string;
  correctAnswerError?: string;
}

export function MultipleChoiceOptionsEditor({
  index,
  optionsData,
  optionImages,
  correctAnswer,
  onAddOption,
  onRemoveOption,
  onSetCorrectAnswer,
  onOptionChange,
  onOptionImageUpload,
  onRemoveOptionImage,
  uploadingOptionIndex,
  errorMessage,
  correctAnswerError,
}: MultipleChoiceOptionsEditorProps) {
  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
      <div className="flex justify-between items-center">
        <Label className="font-semibold text-slate-700">الخيارات</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAddOption}>
          <Plus className="w-3 h-3 ml-1" />
          إضافة خيار
        </Button>
      </div>

      {errorMessage && (
        <p className="text-red-500 text-xs mb-2">{errorMessage}</p>
      )}

      <div className="space-y-4">
        {optionsData.map((opt, optIndex) => {
          const optImg = optionImages[optIndex] || '';
          const isUploading = uploadingOptionIndex === optIndex;
          const inputId = `opt-img-${index}-${optIndex}`;
          return (
            <div key={optIndex} className="space-y-2">
              {/* Text row */}
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`correctAnswer-${index}`}
                  checked={correctAnswer === opt}
                  onChange={() => onSetCorrectAnswer(opt)}
                  className="w-4 h-4 text-primary bg-slate-100 border-slate-300 focus:ring-primary focus:ring-2 shrink-0"
                />
                <div className="flex-1">
                  <Input
                    value={opt}
                    onChange={(e) => onOptionChange(optIndex, e.target.value)}
                    placeholder={`الخيار ${optIndex + 1}`}
                    className={correctAnswer === opt ? 'border-green-400 bg-green-50' : ''}
                  />
                </div>

                {/* Image upload trigger */}
                <div className="shrink-0">
                  <input
                    type="file"
                    id={inputId}
                    className="hidden"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(e) => onOptionImageUpload(e, optIndex)}
                  />
                  <label
                    htmlFor={inputId}
                    title="إضافة صورة للخيار"
                    className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors cursor-pointer ${
                      optImg
                        ? 'border-primary-400 bg-primary-50 text-primary-600'
                        : 'border-slate-200 bg-white text-slate-400 hover:text-primary-600 hover:border-primary-300'
                    } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isUploading ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      <ImagePlus className="w-4 h-4" />
                    )}
                  </label>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-400 hover:text-red-500 shrink-0"
                  onClick={() => onRemoveOption(optIndex)}
                  disabled={optionsData.length <= 2}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Option image preview */}
              {optImg && (
                <div className="mr-7 relative inline-block">
                  <div className="relative w-28 h-28 rounded-lg border border-slate-200 overflow-hidden group shadow-xs">
                    <img src={optImg} alt={`صورة الخيار ${optIndex + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => onRemoveOptionImage(optIndex)}
                      className="absolute top-1 left-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 text-center">صورة الخيار {optIndex + 1}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {correctAnswerError && (
        <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
          <AlertCircle className="w-4 h-4" />
          <span>{correctAnswerError}</span>
        </div>
      )}
    </div>
  );
}
