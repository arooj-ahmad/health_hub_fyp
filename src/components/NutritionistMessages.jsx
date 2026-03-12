import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { onNutritionistConsultations } from '@/services/nutritionistService';
import { getUserProfile } from '@/services/firestoreService';
import ConsultationChat from '@/components/ConsultationChat';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

/**
 * Deduplicate consultations so each user appears only once.
 * Keeps the consultation with the most recent activity per userId.
 */
const deduplicateByUser = (consultations) => {
  const map = new Map();
  for (const c of consultations) {
    const existing = map.get(c.userId);
    if (!existing) {
      map.set(c.userId, c);
    } else {
      const existingTime = existing.lastMessageAt?.toMillis?.() || existing.createdAt?.toMillis?.() || 0;
      const currentTime = c.lastMessageAt?.toMillis?.() || c.createdAt?.toMillis?.() || 0;
      if (currentTime > existingTime) {
        map.set(c.userId, c);
      }
    }
  }
  return Array.from(map.values());
};

/**
 * Shows the nutritionist's conversation list with real-time updates.
 * Clicking a conversation opens the ConsultationChat inline.
 */
const NutritionistMessages = () => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const namesRef = useRef({});

  // Keep ref in sync with state
  useEffect(() => {
    namesRef.current = userNames;
  }, [userNames]);

  // Resolve a batch of user names, skipping already-resolved ones
  const resolveNames = useCallback(async (userIds) => {
    const missing = userIds.filter((id) => !namesRef.current[id]);
    if (missing.length === 0) return;

    const nameMap = { ...namesRef.current };
    await Promise.all(
      missing.map(async (uid) => {
        try {
          const profile = await getUserProfile(uid);
          nameMap[uid] = profile?.displayName || profile?.name || profile?.email || 'User';
        } catch {
          nameMap[uid] = 'User';
        }
      })
    );
    namesRef.current = nameMap;
    setUserNames(nameMap);
  }, []);

  // Real-time listener for consultations
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsub = onNutritionistConsultations(user.uid, async (consults) => {
      // Deduplicate: one card per user
      const unique = deduplicateByUser(consults);
      setConsultations(unique);

      // Resolve names for all user ids
      const ids = [...new Set(unique.map((c) => c.userId))];
      await resolveNames(ids);

      setLoading(false);
    });

    return () => unsub();
  }, [user, resolveNames]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Show inline chat when a conversation is selected
  if (activeChat) {
    return (
      <ConsultationChat
        nutritionistId={activeChat}
        nutritionistName={userNames[activeChat]}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  if (consultations.length === 0) {
    return (
      <Card className="glass-card p-8 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No consultation messages yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {consultations.map((c) => {
        const name = userNames[c.userId] || 'User';
        const lastTime = c.lastMessageAt?.toDate
          ? c.lastMessageAt.toDate().toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : c.createdAt?.toDate
          ? c.createdAt.toDate().toLocaleDateString()
          : '';

        return (
          <Card
            key={c.id}
            className="glass-card p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 smooth-transition"
            onClick={() => setActiveChat(c.userId)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{name}</p>
                {c.lastMessage ? (
                  <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                    {c.lastSenderRole === 'nutritionist' ? 'You: ' : ''}
                    {c.lastMessage}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No messages yet</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-muted-foreground hidden sm:inline">{lastTime}</span>
              <Button size="sm" variant="outline" className="gap-1">
                <MessageSquare className="h-4 w-4" /> Reply
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default NutritionistMessages;
