'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, ChevronDown, Plus, Check, X, Trash2 } from 'lucide-react';
import { useGroups } from '../hooks/useGroups';
import { useSavedLocations } from '../hooks/useSavedLocations';

const DEFAULT_LOCATIONS: string[] = [];

interface LocationSelectProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function LocationSelect({
  value = '',
  onChange,
  disabled = false,
  placeholder = 'اختر أو اكتب مكان الحصة...',
}: LocationSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: groups } = useGroups();
  const { savedLocations: customLocations, addLocation, removeLocation, isLoading } = useSavedLocations();

  // Extract all existing locations from teacher's groups
  const groupLocations = useMemo(() => {
    if (!groups || !Array.isArray(groups)) return [];
    const locs: string[] = [];
    groups.forEach((g) => {
      g.schedules?.forEach((s) => {
        if (s.location && s.location.trim()) {
          locs.push(s.location.trim());
        }
      });
    });
    return locs;
  }, [groups]);

  // Combine and deduplicate all available locations
  const allLocations = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_LOCATIONS.forEach((l) => set.add(l));
    groupLocations.forEach((l) => set.add(l));
    customLocations.forEach((l: string) => set.add(l));
    if (value && value.trim()) {
      set.add(value.trim());
    }
    return Array.from(set);
  }, [groupLocations, customLocations, value]);

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allLocations;
    return allLocations.filter((loc) => loc.toLowerCase().includes(q));
  }, [allLocations, searchQuery]);

  const exactMatchExists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allLocations.some((loc) => loc.toLowerCase() === q);
  }, [allLocations, searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocation = (loc: string) => {
    onChange(loc);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleAddNewLocation = async (newLoc: string) => {
    const trimmed = newLoc.trim();
    if (!trimmed) return;

    if (!customLocations.includes(trimmed)) {
      await addLocation(trimmed);
    }

    onChange(trimmed);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleRemoveCustomLocation = async (e: React.MouseEvent, locToRemove: string) => {
    e.stopPropagation();
    await removeLocation(locToRemove);
    if (value === locToRemove) {
      onChange('');
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger / Input Display */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs bg-white rounded-lg border transition-all cursor-pointer select-none ${
          isOpen
            ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-xs'
            : 'border-neutral-300 hover:border-neutral-400'
        } ${disabled ? 'bg-neutral-100 cursor-not-allowed opacity-60' : ''}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin className={`w-3.5 h-3.5 shrink-0 ${value ? 'text-primary-600' : 'text-neutral-400'}`} />
          {value ? (
            <span className="font-semibold text-neutral-800 truncate">{value}</span>
          ) : (
            <span className="text-neutral-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-100 transition-colors"
              title="إزالة المكان"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[110] mt-1 w-full rounded-xl border border-neutral-200 bg-white shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="p-2 border-b border-neutral-100">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchQuery.trim()) {
                      handleAddNewLocation(searchQuery);
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
                placeholder="ابحث أو اكتب مكاناً جديداً..."
                className="w-full text-xs px-3 py-1.5 pl-8 rounded-md border border-neutral-200 bg-neutral-50/80 text-neutral-800 placeholder-neutral-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <MapPin className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Creatable Option: when typing a new location */}
          {searchQuery.trim() && !exactMatchExists && (
            <div className="p-1 border-b border-neutral-100">
              <button
                type="button"
                onClick={() => handleAddNewLocation(searchQuery)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg text-primary-700 bg-primary-50/80 hover:bg-primary-100 font-bold transition-colors text-right"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Plus className="w-3.5 h-3.5 shrink-0 text-primary-600" />
                  <span className="truncate">إضافة مكان جديد: &quot;{searchQuery.trim()}&quot;</span>
                </div>
                <span className="text-[10px] bg-primary-200/80 text-primary-800 px-1.5 py-0.5 rounded font-mono shrink-0">
                  Enter ↵
                </span>
              </button>
            </div>
          )}

          {/* Locations List */}
          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5" style={{ scrollbarWidth: 'thin' }}>
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc) => {
                const isSelected = value === loc;
                const isCustom = customLocations.includes(loc);

                return (
                  <div
                    key={loc}
                    onClick={() => handleSelectLocation(loc)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary-50 text-primary-800 font-bold'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary-600' : 'text-neutral-400'}`} />
                      <span className="truncate">{loc}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary-600" />}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveCustomLocation(e, loc)}
                          className="p-1 text-neutral-300 hover:text-red-500 rounded hover:bg-neutral-100 transition-colors"
                          title="حذف من الأماكن المحفوظة"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : isLoading ? (
              <div className="py-4 text-center text-xs text-neutral-400">
                جاري التحميل...
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-neutral-400">
                لا توجد أماكن مطابقة
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
