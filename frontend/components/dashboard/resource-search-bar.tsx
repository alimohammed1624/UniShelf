'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResourceSearchBarProps {
  onSearch: (params: { q?: string; tags?: string }) => void;
}

export function ResourceSearchBar({ onSearch }: ResourceSearchBarProps) {
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params: { q?: string; tags?: string } = {};
    if (query.trim()) params.q = query.trim();
    if (tags.trim()) params.tags = tags.trim();
    onSearch(params);
  };

  const handleClear = () => {
    setQuery('');
    setTags('');
    onSearch({});
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Search Resources</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="search-query" className="text-xs text-muted-foreground">
              Title or Filename
            </Label>
            <Input
              id="search-query"
              placeholder="Search by title or filename…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="search-tags" className="text-xs text-muted-foreground">
              Tags (comma-separated)
            </Label>
            <Input
              id="search-tags"
              placeholder="e.g. math, sem3, notes"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Search
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
