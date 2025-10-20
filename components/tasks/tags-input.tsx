'use client';

import { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  maxTagLength?: number;
}

export function TagsInput({ tags, onChange, maxTags = 10, maxTagLength = 30 }: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const addTag = (tagText: string) => {
    // Remove # prefix and trim
    const cleanedTag = tagText.replace(/^#+/, '').trim();

    if (!cleanedTag) {
      return;
    }

    // Validate tag length
    if (cleanedTag.length > maxTagLength) {
      setError(`Tag must be ${maxTagLength} characters or less`);
      return;
    }

    // Check if already exists (case-insensitive)
    if (tags.some((t) => t.toLowerCase() === cleanedTag.toLowerCase())) {
      setError('Tag already exists');
      return;
    }

    // Check max tags limit
    if (tags.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }

    // Add tag
    onChange([...tags, cleanedTag]);
    setInputValue('');
    setError(null);
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
    setError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace on empty input
      onChange(tags.slice(0, -1));
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setError(null);

    // Auto-add tag when user types # followed by text and then space or another #
    const hashtagPattern = /#(\w+)/g;
    const matches = value.match(hashtagPattern);

    if (matches) {
      // Check if the last character is a space or if there are multiple hashtags
      const hasSpaceAfterHashtag = value.endsWith(' ') || value.match(/#\w+\s/) || value.match(/#\w+#/);

      if (hasSpaceAfterHashtag) {
        // Add all complete hashtags (those followed by space or another hashtag)
        const completeTags = value.match(/#(\w+)(?=\s|#|$)/g);
        if (completeTags) {
          completeTags.forEach(tag => {
            addTag(tag);
          });

          // Keep any remaining incomplete text
          const remainingText = value.replace(/#\w+(?=\s|#)/g, '').trim();
          setInputValue(remainingText);
        }
      }
    }
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <div className="space-y-2">
      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1 pl-3 pr-1 py-1">
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-1 rounded-full hover:bg-muted p-0.5"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="space-y-1">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Type tags separated by # or press Enter (e.g., #urgent #frontend)"
          disabled={tags.length >= maxTags}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {tags.length >= maxTags
              ? `Maximum ${maxTags} tags reached`
              : 'Press Enter, comma, or space after # to add tag'}
          </span>
          <span>
            {tags.length} / {maxTags}
          </span>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
