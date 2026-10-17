'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api/client';
import {
  STAGE_OPTIONS,
  SavedCertificate,
  normalizeCertificateGrade,
} from '../utils/certificateClientUtils';

interface UseCertificateVisibilitySettingsOptions {
  yearOptions: string[];
  allGrades: string[];
  certificates: SavedCertificate[];
  visibilityPanelRef: React.RefObject<HTMLDivElement | null>;
}

export function useCertificateVisibilitySettings({
  yearOptions,
  allGrades,
  certificates,
  visibilityPanelRef,
}: UseCertificateVisibilitySettingsOptions) {
  const [allowedYears, setAllowedYears] = useState<string[] | null>(null);
  const [savedAllowedYears, setSavedAllowedYears] = useState<string[] | null>(null);
  const [savingYears, setSavingYears] = useState(false);
  const [allowedStages, setAllowedStages] = useState<string[] | null>(null);
  const [savedAllowedStages, setSavedAllowedStages] = useState<string[] | null>(null);
  const [allowedGrades, setAllowedGrades] = useState<string[] | null>(null);
  const [savedAllowedGrades, setSavedAllowedGrades] = useState<string[] | null>(null);
  const [allowedGroups, setAllowedGroups] = useState<string[] | null>(null);
  const [savedAllowedGroups, setSavedAllowedGroups] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const json = await apiClient<any>('/site-settings');
        const arr = json?.settings || json?.data?.settings || [];
        const found = arr.find((s: any) => s.key === 'certificates.visibleYears');
        const val = Array.isArray(found?.value) ? found.value.map((v: any) => String(v)) : null;
        setAllowedYears(val);
        setSavedAllowedYears(val);
        const settingValue = (key: string) => {
          const setting = arr.find((item: any) => item.key === key);
          return Array.isArray(setting?.value) ? setting.value.map((value: any) => String(value)) : null;
        };
        setAllowedStages(settingValue('certificates.visibleStages'));
        setSavedAllowedStages(settingValue('certificates.visibleStages'));
        setAllowedGrades(settingValue('certificates.visibleGrades'));
        setSavedAllowedGrades(settingValue('certificates.visibleGrades'));
        setAllowedGroups(settingValue('certificates.visibleGroups'));
        setSavedAllowedGroups(settingValue('certificates.visibleGroups'));
      } catch (err) {
        console.warn('Could not load site settings:', err);
      }
    })();
  }, []);

  const gradeOptions = useMemo(() => {
    const selected = allowedStages ?? STAGE_OPTIONS;
    return allGrades.filter((grade) =>
      selected.some((stage) => {
        const suffix = {
          الثانوية: 'الثانوي',
          الإعدادية: 'الإعدادي',
          الابتدائية: 'الابتدائي',
        }[stage];
        return suffix ? grade.endsWith(suffix) : false;
      }),
    );
  }, [allGrades, allowedStages]);

  const groupOptions = useMemo(() => {
    const selected = allowedStages ?? STAGE_OPTIONS;
    const scoped = certificates.filter((cert) => {
      const matchesStage = selected.includes(cert.stage);
      const normalized = normalizeCertificateGrade(cert.grade, cert.stage);
      const matchesGrade = allowedGrades === null || allowedGrades?.includes(normalized);
      return matchesStage && matchesGrade;
    });
    return Array.from(
      new Set(scoped.map((c) => c.groupName?.trim()).filter(Boolean) as string[]),
    ).sort();
  }, [certificates, allowedGrades, allowedStages]);

  const toggleAllowed = (
    value: string,
    current: string[] | null,
    options: string[],
    setter: React.Dispatch<React.SetStateAction<string[] | null>>,
  ) => {
    const base = current ?? options;
    setter(
      base.includes(value) ? base.filter((item) => item !== value) : [...base, value],
    );
  };

  const yearsDirty =
    JSON.stringify([...(allowedYears ?? [])].sort()) !==
    JSON.stringify([...(savedAllowedYears ?? [])].sort());

  const visibilityDirty =
    yearsDirty ||
    JSON.stringify([...(allowedStages ?? [])].sort()) !==
      JSON.stringify([...(savedAllowedStages ?? [])].sort()) ||
    JSON.stringify([...(allowedGrades ?? [])].sort()) !==
      JSON.stringify([...(savedAllowedGrades ?? [])].sort()) ||
    JSON.stringify([...(allowedGroups ?? [])].sort()) !==
      JSON.stringify([...(savedAllowedGroups ?? [])].sort());

  const handleSaveVisibility = async () => {
    visibilityPanelRef.current
      ?.querySelectorAll<HTMLDetailsElement>('details[open]')
      .forEach((details) => {
        details.open = false;
      });
    setSavingYears(true);
    try {
      const values = [
        ['certificates.visibleYears', allowedYears ?? yearOptions],
        ['certificates.visibleStages', allowedStages ?? STAGE_OPTIONS],
        ['certificates.visibleGrades', allowedGrades ?? allGrades],
        ['certificates.visibleGroups', allowedGroups ?? groupOptions],
      ];
      await Promise.all(
        values.map(([key, value]) =>
          apiClient('/site-settings', {
            method: 'PATCH',
            body: JSON.stringify({ key, value }),
          }),
        ),
      );
      setSavedAllowedYears(allowedYears ?? yearOptions);
      setSavedAllowedStages(allowedStages ?? STAGE_OPTIONS);
      setSavedAllowedGrades(allowedGrades ?? allGrades);
      setSavedAllowedGroups(allowedGroups ?? groupOptions);
      toast.success('تم حفظ إعدادات ظهور الشهادات');
    } catch (err: any) {
      console.error('Failed to save certificate visibility:', err);
      toast.error(err?.message || 'فشل حفظ الإعداد');
    } finally {
      setSavingYears(false);
    }
  };

  return {
    allowedYears,
    setAllowedYears,
    savedAllowedYears,
    savingYears,
    allowedStages,
    setAllowedStages,
    savedAllowedStages,
    allowedGrades,
    setAllowedGrades,
    savedAllowedGrades,
    allowedGroups,
    setAllowedGroups,
    savedAllowedGroups,
    gradeOptions,
    groupOptions,
    toggleAllowed,
    yearsDirty,
    visibilityDirty,
    handleSaveVisibility,
  };
}
