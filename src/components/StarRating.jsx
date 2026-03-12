import { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating = 0, onRate, size = 'md', readOnly = false }) => {
  const [hovered, setHovered] = useState(0);

  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const starSize = sizes[size] || sizes.md;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = readOnly ? star <= Math.round(rating) : star <= (hovered || rating);
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} smooth-transition`}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            onClick={() => !readOnly && onRate?.(star)}
          >
            <Star
              className={`${starSize} ${
                filled
                  ? 'fill-warning text-warning'
                  : 'fill-none text-muted-foreground/40'
              } smooth-transition`}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
