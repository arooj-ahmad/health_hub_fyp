import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { onNutritionistReviews } from '@/services/reviewService';
import { getUserProfile } from '@/services/firestoreService';
import StarRating from '@/components/StarRating';
import { Card } from '@/components/ui/card';
import LoadingSpinner from '@/components/LoadingSpinner';
import { MessageSquareText } from 'lucide-react';

const NutritionistReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const namesRef = useRef({});

  useEffect(() => {
    namesRef.current = userNames;
  }, [userNames]);

  const resolveNames = useCallback(async (userIds) => {
    const missing = userIds.filter((id) => !namesRef.current[id]);
    if (missing.length === 0) return;

    const nameMap = { ...namesRef.current };
    await Promise.all(
      missing.map(async (uid) => {
        try {
          const profile = await getUserProfile(uid);
          nameMap[uid] = profile?.displayName || profile?.name || 'User';
        } catch {
          nameMap[uid] = 'User';
        }
      })
    );
    namesRef.current = nameMap;
    setUserNames(nameMap);
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsub = onNutritionistReviews(user.uid, async (data) => {
      setReviews(data);
      const uniqueIds = [...new Set(data.map((r) => r.userId))];
      await resolveNames(uniqueIds);
      setLoading(false);
    });

    return () => unsub();
  }, [user, resolveNames]);

  if (loading) return <LoadingSpinner />;

  if (reviews.length === 0) {
    return (
      <Card className="glass-card p-8 text-center">
        <MessageSquareText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No reviews yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const name = userNames[review.userId] || 'User';
        const date = review.createdAt?.toDate
          ? review.createdAt.toDate().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : '';

        return (
          <Card key={review.id} className="glass-card p-4 md:p-5">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white font-bold flex-shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <p className="font-medium text-foreground">{name}</p>
                  <span className="text-xs text-muted-foreground">{date}</span>
                </div>

                <div className="mt-1">
                  <StarRating rating={review.rating} readOnly size="sm" />
                </div>

                {review.reviewText && (
                  <p className="mt-2 text-sm text-muted-foreground">{review.reviewText}</p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default NutritionistReviews;
