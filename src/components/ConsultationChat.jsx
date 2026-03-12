import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getOrCreateConsultation,
  sendMessage,
  onMessagesSnapshot,
} from '@/services/nutritionistService';
import { getUserProfile } from '@/services/firestoreService';
import { getNutritionistProfile } from '@/services/nutritionistService';
import ChatWindow from '@/components/ChatWindow';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * Data-layer wrapper around ChatWindow.
 *
 * Props:
 *  - nutritionistId  (required) — the OTHER party's uid
 *    • For a user, this is the nutritionist uid.
 *    • For a nutritionist, this is the USER uid (passed from the
 *      conversation list).
 *  - nutritionistName  Optional pre-fetched display name.
 *  - onBack            Optional callback for back button.
 */
const ConsultationChat = ({ nutritionistId, nutritionistName, onBack }) => {
  const { user, userRole } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [consultationId, setConsultationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState(nutritionistName || '');

  const isNutritionist = userRole === 'nutritionist';

  // Initialise consultation & resolve name
  useEffect(() => {
    const init = async () => {
      try {
        let consultation;
        if (isNutritionist) {
          // nutritionistId prop is the USER uid
          consultation = await getOrCreateConsultation(nutritionistId, user.uid);
          if (!nutritionistName) {
            const profile = await getUserProfile(nutritionistId);
            setOtherName(profile?.displayName || profile?.email || 'User');
          }
        } else {
          // Current user is a patient; nutritionistId prop is the nutritionist uid
          consultation = await getOrCreateConsultation(user.uid, nutritionistId);
          if (!nutritionistName) {
            const profile = await getNutritionistProfile(nutritionistId);
            setOtherName(profile?.name || profile?.email || 'Nutritionist');
          }
        }
        setConsultationId(consultation.id);
      } catch (err) {
        console.error('Error initializing consultation:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user, nutritionistId, isNutritionist, nutritionistName]);

  // Real-time messages
  useEffect(() => {
    if (!consultationId) return;
    const unsub = onMessagesSnapshot(consultationId, setMessages);
    return () => unsub();
  }, [consultationId]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = newMsg.trim();
    if (!trimmed || !consultationId) return;

    setSending(true);
    try {
      await sendMessage(
        consultationId,
        user.uid,
        isNutritionist ? 'nutritionist' : 'user',
        trimmed
      );
      setNewMsg('');
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <ChatWindow
      messages={messages}
      currentUserId={user.uid}
      otherName={otherName}
      subtitle={isNutritionist ? 'Patient consultation' : 'Nutritionist consultation'}
      value={newMsg}
      onChange={(e) => setNewMsg(e.target.value)}
      onSend={handleSend}
      sending={sending}
      onBack={onBack}
    />
  );
};

export default ConsultationChat;
