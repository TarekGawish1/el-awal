import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchableSessionCombobox } from '../components/SearchableSessionCombobox';

describe('SearchableSessionCombobox', () => {
  const mockSessions = [
    {
      id: 'session-1',
      groupId: 'group-1',
      topic: 'مراجعة الباب الأول',
      sessionDate: '2026-08-29',
      startTime: '10:00',
      group: {
        id: 'group-1',
        name: 'مجموعة الصف الأول الثانوي (أ)',
        gradeLevel: 'الصف الأول الثانوي',
        schedules: [{ location: 'قاعة 101' }],
      },
    },
    {
      id: 'session-2',
      groupId: 'group-2',
      topic: 'درس النحو والصرف',
      sessionDate: '2026-08-30',
      startTime: '15:00',
      group: {
        id: 'group-2',
        name: 'مجموعة النخبة (الصف الثاني الثانوي)',
        gradeLevel: 'الصف الثاني الثانوي',
        schedules: [{ location: 'سنتر الأوائل' }],
      },
    },
  ];

  it('renders trigger button with placeholder when no session selected', () => {
    render(
      <SearchableSessionCombobox
        label="حصص اليوم"
        sessions={mockSessions}
        selectedSessionId=""
        onSelectSession={vi.fn()}
        placeholder="-- اختر الحصة --"
      />
    );

    expect(screen.getByText(/حصص اليوم/)).toBeInTheDocument();
    expect(screen.getByText(/-- اختر الحصة --/)).toBeInTheDocument();
  });

  it('renders selected session details in trigger button', () => {
    render(
      <SearchableSessionCombobox
        label="حصص اليوم"
        sessions={mockSessions}
        selectedSessionId="session-1"
        onSelectSession={vi.fn()}
      />
    );

    expect(screen.getByText('مجموعة الصف الأول الثانوي (أ)')).toBeInTheDocument();
  });

  it('opens dropdown downwards with search input on click', () => {
    render(
      <SearchableSessionCombobox
        label="حصص اليوم"
        sessions={mockSessions}
        selectedSessionId=""
        onSelectSession={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText(/ابحث بالمجموعة، اليوم، التاريخ/)).toBeInTheDocument();
    expect(screen.getByText('مجموعة الصف الأول الثانوي (أ)')).toBeInTheDocument();
    expect(screen.getByText('مجموعة النخبة (الصف الثاني الثانوي)')).toBeInTheDocument();
  });

  it('filters sessions in real-time when searching by group name or location', () => {
    render(
      <SearchableSessionCombobox
        label="حصص الترم"
        sessions={mockSessions}
        selectedSessionId=""
        onSelectSession={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText(/ابحث بالمجموعة، اليوم، التاريخ/);
    fireEvent.change(searchInput, { target: { value: 'النخبة' } });

    expect(screen.getByText('مجموعة النخبة (الصف الثاني الثانوي)')).toBeInTheDocument();
    expect(screen.queryByText('مجموعة الصف الأول الثانوي (أ)')).not.toBeInTheDocument();
  });

  it('calls onSelectSession and closes popover when session item is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <SearchableSessionCombobox
        label="حصص اليوم"
        sessions={mockSessions}
        selectedSessionId=""
        onSelectSession={handleSelect}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    const item = screen.getByText('مجموعة الصف الأول الثانوي (أ)');
    fireEvent.click(item);

    expect(handleSelect).toHaveBeenCalledWith('session-1');
  });
});
