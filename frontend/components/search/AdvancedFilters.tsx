'use client';

import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export interface AdvancedFilterState {
  searchQuery: string;
  resourceTypes: string[];
  dateRange: { from: string; to: string } | null;
}

interface AdvancedFiltersProps {
  filters: AdvancedFilterState;
  onFilterChange: (filters: AdvancedFilterState) => void;
  onClearAll: () => void;
  allTags?: { id: number; name: string }[];
  selectedTags?: string[];
  onTagToggle?: (tag: string) => void;
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
  onClearAll,
  allTags = [],
  selectedTags = [],
  onTagToggle,
}: AdvancedFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    types: true,
    tags: true,
    date: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const activeFilterCount =
    filters.resourceTypes.length +
    selectedTags.length +
    (filters.dateRange ? 1 : 0);

  const handleResourceTypeToggle = (typeId: string) => {
    onFilterChange({
      ...filters,
      resourceTypes: filters.resourceTypes.includes(typeId)
        ? filters.resourceTypes.filter((t) => t !== typeId)
        : [...filters.resourceTypes, typeId],
    });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const from = e.target.value;
    onFilterChange({
      ...filters,
      dateRange: from
        ? { from, to: filters.dateRange?.to || '' }
        : null,
    });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const to = e.target.value;
    if (filters.dateRange) {
      onFilterChange({
        ...filters,
        dateRange: { ...filters.dateRange, to },
      });
    }
  };

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                {activeFilterCount}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-6 px-2 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Resource Type */}
        <FilterSection
          title="Resource Type"
          isExpanded={expandedSections.types}
          onToggle={() => toggleSection('types')}
          isActive={filters.resourceTypes.length > 0}
        >
          <div className="space-y-2">
            {RESOURCE_TYPES.map((type) => (
              <label key={type.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.resourceTypes.includes(type.id)}
                  onChange={() => handleResourceTypeToggle(type.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{type.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Tags */}
        {allTags.length > 0 && (
          <FilterSection
            title="Tags"
            isExpanded={expandedSections.tags}
            onToggle={() => toggleSection('tags')}
            isActive={selectedTags.length > 0}
          >
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allTags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.name)}
                    onChange={() => onTagToggle?.(tag.name)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{tag.name}</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Date Range */}
        <FilterSection
          title="Upload Date"
          isExpanded={expandedSections.date}
          onToggle={() => toggleSection('date')}
          isActive={!!filters.dateRange}
        >
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
              <Input
                type="date"
                value={filters.dateRange?.from || ''}
                onChange={handleDateFromChange}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
              <Input
                type="date"
                value={filters.dateRange?.to || ''}
                onChange={handleDateToChange}
                disabled={!filters.dateRange?.from}
                className="text-sm"
              />
            </div>
          </div>
        </FilterSection>
      </CardContent>
    </Card>
  );
}

interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  isActive?: boolean;
  children: React.ReactNode;
}

function FilterSection({
  title,
  isExpanded,
  onToggle,
  isActive = false,
  children,
}: FilterSectionProps) {
  return (
    <div className="border-t pt-3">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left hover:bg-muted/50 px-1 py-1 rounded"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {isActive && <Badge variant="outline" className="text-xs">On</Badge>}
        </div>
        <ChevronDown
          size={16}
          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      {isExpanded && <div className="mt-3 pl-1">{children}</div>}
    </div>
  );
}
