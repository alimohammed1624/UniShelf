'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export interface AdvancedFilterState {
  searchQuery: string;
  resourceTypes: string[];
  dateRange: { from: string; to: string } | null;
}

interface AdvancedFiltersProps {
  filters: AdvancedFilterState;
  onFilterChange: (filters: AdvancedFilterState) => void;
  allTags?: { id: number; name: string }[];
  selectedTags?: string[];
  onTagToggle?: (tag: string) => void;
  onClearTags?: () => void;
}

const RESOURCE_TYPES = [
  { id: 'pdf', label: 'PDF', mime: 'application/pdf' },
  { id: 'video', label: 'Video', mime: 'video/' },
  { id: 'image', label: 'Image', mime: 'image/' },
  { id: 'code', label: 'Code', mime: 'text/' },
  { id: 'link', label: 'Link', mime: 'link' },
];

export function AdvancedFilters({
  filters,
  onFilterChange,
  allTags = [],
  selectedTags = [],
  onTagToggle,
  onClearTags,
}: AdvancedFiltersProps) {
  const [tagQuery, setTagQuery] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const from = filters.dateRange?.from;
    return from ? new Date(`${from}T00:00:00`) : new Date();
  });

  const handleResourceTypeToggle = (typeId: string) => {
    onFilterChange({
      ...filters,
      resourceTypes: filters.resourceTypes.includes(typeId)
        ? filters.resourceTypes.filter((t) => t !== typeId)
        : [...filters.resourceTypes, typeId],
    });
  };

  const handleDateSelect = (date: string) => {
    const from = filters.dateRange?.from;
    const to = filters.dateRange?.to;

    onFilterChange({
      ...filters,
      dateRange: !from || to
        ? { from: date, to: '' }
        : date < from
          ? { from: date, to: '' }
          : { from, to: date },
    });
  };

  const normalizedTagQuery = tagQuery.trim().toLowerCase();
  const matchingTags = normalizedTagQuery
    ? allTags.filter((tag) => {
        if (selectedTags.includes(tag.name)) return false;
        return fuzzyMatch(tag.name.toLowerCase(), normalizedTagQuery);
      })
    : [];
  const dateFilterLabel = formatDateRange(filters.dateRange);

  const selectTag = (tagName: string) => {
    onTagToggle?.(tagName);
    setTagQuery('');
  };

  return (
    <Card className="h-fit sticky top-4">
      <CardContent className="space-y-4">
        {/* Tags */}
        {allTags.length > 0 && (
          <FilterSection
            title="Tags"
            isActive={selectedTags.length > 0}
            onClear={onClearTags}
          >
            <div className="space-y-2">
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tagName) => (
                    <Button
                      key={tagName}
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => onTagToggle?.(tagName)}
                      className="h-7 rounded-full px-3 text-xs"
                    >
                      {tagName}
                      <X className="ml-1 size-3" aria-hidden="true" />
                      <span className="sr-only">Remove {tagName}</span>
                    </Button>
                  ))}
                </div>
              )}

              <div className="relative">
                <Input
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && matchingTags[0]) {
                      e.preventDefault();
                      selectTag(matchingTags[0].name);
                    }
                  }}
                  placeholder="Add a tag..."
                  className="h-8 !border-primary text-sm focus:!border-primary focus-visible:!border-primary focus-visible:ring-primary/50"
                />

                {matchingTags.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {matchingTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => selectTag(tag.name)}
                        className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </FilterSection>
        )}

        {/* Resource Type */}
        <FilterSection
          title="Resource Type"
          isActive={filters.resourceTypes.length > 0}
          onClear={() => onFilterChange({ ...filters, resourceTypes: [] })}
        >
          <div className="flex flex-wrap gap-2">
            {RESOURCE_TYPES.map((type) => {
              const isSelected = filters.resourceTypes.includes(type.id);

              return (
                <Button
                  key={type.id}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleResourceTypeToggle(type.id)}
                  aria-pressed={isSelected}
                  className="h-7 rounded-full px-3 text-xs"
                >
                  {type.label}
                </Button>
              );
            })}
          </div>
        </FilterSection>

        {/* Date Range */}
        <FilterSection
          title={dateFilterLabel}
          isActive={!!filters.dateRange}
          onClear={() => onFilterChange({ ...filters, dateRange: null })}
        >
          <DateRangeCalendar
            month={calendarMonth}
            range={filters.dateRange}
            onMonthChange={setCalendarMonth}
            onSelect={handleDateSelect}
          />
        </FilterSection>
      </CardContent>
    </Card>
  );
}

function fuzzyMatch(value: string, query: string) {
  let queryIndex = 0;

  for (const character of value) {
    if (character === query[queryIndex]) queryIndex += 1;
    if (queryIndex === query.length) return true;
  }

  return false;
}

interface DateRangeCalendarProps {
  month: Date;
  range: { from: string; to: string } | null;
  onMonthChange: (month: Date) => void;
  onSelect: (date: string) => void;
}

function DateRangeCalendar({ month, range, onMonthChange, onSelect }: DateRangeCalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const days = Array.from({ length: firstDay + daysInMonth }, (_, index) =>
    index < firstDay ? null : index - firstDay + 1,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          className="size-7"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium">
          {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(month)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          className="size-7"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span key={day} className="py-1 text-muted-foreground">{day}</span>
        ))}
        {days.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;

          const date = formatDate(year, monthIndex, day);
          const isStart = range?.from === date;
          const isEnd = range?.to === date;
          const isInRange = !!range?.from && !!range.to && date > range.from && date < range.to;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              className={`size-8 rounded-sm hover:bg-muted ${
                isStart || isEnd
                  ? 'bg-primary text-primary-foreground hover:bg-primary'
                  : isInRange
                    ? 'bg-primary/15'
                    : ''
              }`}
              aria-label={new Date(`${date}T00:00:00`).toLocaleDateString()}
            >
              {day}
            </button>
          );
        })}
      </div>

    </div>
  );
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDateRange(range: { from: string; to: string } | null) {
  if (!range?.from) return 'All time';

  const format = (date: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .format(new Date(`${date}T00:00:00`));

  return range.to ? `${format(range.from)} – ${format(range.to)}` : `${format(range.from)} – Select end date`;
}

interface FilterSectionProps {
  title: string;
  isActive?: boolean;
  onClear?: () => void;
  children: React.ReactNode;
}

function FilterSection({
  title,
  isActive = false,
  onClear,
  children,
}: FilterSectionProps) {
  return (
    <div className="border-t pt-3">
      <div className="flex items-center justify-between">
        <span className="px-1 py-1 text-sm font-medium">{title}</span>
        {isActive && onClear && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            className="size-7 text-destructive hover:text-destructive"
            aria-label={`Clear ${title} filter`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      <div className="mt-3 pl-1">{children}</div>
    </div>
  );
}
