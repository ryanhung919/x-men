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
        <SelectTrigger
          className={cn(
            'w-52 border border-input bg-background text-foreground',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:ring-2 focus:ring-ring focus:ring-offset-2',
            '[&>span]:text-foreground [&>span]:font-medium'
          )}
        >
          <SelectValue
            placeholder={
              selectedTags.length
                ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''}`
                : 'All tags'
            }
          />
        </SelectTrigger>
        <SelectContent
          className="bg-popover text-popover-foreground border border-border shadow-md"
          style={{
            backgroundColor: 'hsl(var(--popover))',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          }}
        >
          <div className="max-h-[300px] overflow-y-auto">
            {tags.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {loading ? 'Loading tags...' : 'No tags available'}
              </div>
            ) : (
              <div className="p-1">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors duration-100',
                      'hover:bg-accent hover:text-accent-foreground',
                      selectedTags.includes(tag) && 'bg-accent/50'
                    )}
                    onClick={(e) => toggle(tag, e)}
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center mr-2 rounded border transition-colors duration-100',
                        selectedTags.includes(tag)
                          ? 'border-primary bg-primary'
                          : 'border-input'
                      )}
                    >
                      {selectedTags.includes(tag) && (
                        <CheckIcon className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="flex-1 truncate">{tag}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {loading && tags.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-popover pointer-events-none">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
