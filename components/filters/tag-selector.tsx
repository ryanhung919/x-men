'use client';

import { Select, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagSelectorProps {
  tags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  loading?: boolean;
}

export function TagSelector({ tags, selectedTags, onChange, loading = false }: TagSelectorProps) {
  const toggle = (tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    onChange(newTags);
  };

  return (
    <div className="relative">
      <Select value="" onValueChange={() => {}}>
        <SelectTrigger className="w-52">
          <SelectValue
            placeholder={
              selectedTags.length
                ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''}`
                : 'Select tags'
            }
          />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-950 border border-border shadow-md">
          <div className="max-h-[300px] overflow-y-auto">
            {tags.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {loading ? 'Loading tags...' : 'No tags available'}
              </div>
            ) : (
              <>
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors duration-100',
                      'hover:bg-accent/50 focus:bg-accent',
                      selectedTags.includes(tag) && 'bg-accent/30'
                    )}
                    onClick={(e) => toggle(tag, e)}
                  >
                    <div className="flex h-4 w-4 items-center justify-center mr-2 rounded border border-input">
                      {selectedTags.includes(tag) && <CheckIcon className="h-3 w-3 text-primary" />}
                    </div>
                    <span className="flex-1 truncate">{tag}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          {loading && tags.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-popover/80 backdrop-blur-sm pointer-events-none">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
