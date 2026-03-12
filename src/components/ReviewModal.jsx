import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { submitReview } from '@/services/reviewService';
import StarRating from '@/components/StarRating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { X, Send, Loader2 } from 'lucide-react';

const ReviewModal = ({ appointment, nutritionistName, onClose, onReviewSubmitted }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: 'Rating required', description: 'Please select a star rating.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await submitReview({
        userId: user.uid,
        nutritionistId: appointment.nutritionistId,
        appointmentId: appointment.id,
        rating,
        reviewText: reviewText.trim(),
      });

      toast({ title: 'Review Submitted!', description: 'Thank you for your feedback.' });
      onReviewSubmitted?.(appointment.id);
      onClose();
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to submit review.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="glass-card w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Rate Nutritionist</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground smooth-transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nutritionist Name */}
        <p className="text-sm text-muted-foreground">
          How was your experience with <span className="font-medium text-foreground">{nutritionistName}</span>?
        </p>

        {/* Star Rating */}
        <div className="flex flex-col items-center gap-2 py-2">
          <StarRating rating={rating} onRate={setRating} size="lg" />
          <span className="text-sm text-muted-foreground">
            {rating === 0 && 'Tap to rate'}
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </span>
        </div>

        {/* Review Text */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Review (optional)</label>
          <Textarea
            placeholder="Share your experience..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            className="glass-input min-h-[100px] resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{reviewText.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 medical-gradient text-white hover:opacity-90 gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ReviewModal;
