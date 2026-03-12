import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Send, ArrowLeft } from 'lucide-react';

/**
 * Pure-UI chat window.
 *
 * Props:
 *  - messages        Array of { id, message, senderId, senderRole, timestamp }
 *  - currentUserId   UID of the logged-in user (to distinguish own vs other)
 *  - otherName       Display name of the person on the other end
 *  - subtitle        Small text below the name (e.g. "Patient consultation")
 *  - value           Controlled input value
 *  - onChange         Input change handler
 *  - onSend          Submit handler (receives the event)
 *  - sending         Boolean – disables input while sending
 *  - onBack          Optional – renders a back arrow button
 */
const ChatWindow = ({
  messages = [],
  currentUserId,
  otherName = 'Chat',
  subtitle,
  value,
  onChange,
  onSend,
  sending = false,
  onBack,
}) => {
  const bottomRef = useRef(null);

  // Auto-scroll when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white font-bold">
          {otherName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{otherName}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            No messages yet. Start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isOwn
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                <p>{msg.message}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-muted-foreground'}`}>
                  {msg.timestamp?.toDate
                    ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSend} className="flex items-center gap-2 pt-3 border-t border-border">
        <Input
          value={value}
          onChange={onChange}
          placeholder="Type your message..."
          className="flex-1 glass-input"
          disabled={sending}
        />
        <Button
          type="submit"
          size="icon"
          className="medical-gradient text-white hover:opacity-90 h-10 w-10"
          disabled={sending || !value?.trim()}
        >
          {sending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};

export default ChatWindow;
