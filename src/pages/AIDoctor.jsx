import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Heart, Send, User } from "lucide-react";
import { chatWithAI, getCurrentProvider } from "@/services/aiService";
import { useAuth } from "@/context/AuthContext";
import { getChatHistory, saveChatMessage } from "@/services/firestoreService";
import LoadingSpinner from "@/components/LoadingSpinner";

const AIDoctor = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'initial',
      role: "assistant",
      content: "Hello! I'm your AI Health Assistant. I have access to your health profile and can provide personalized medical guidance. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load chat history from Firestore
    const loadChatHistory = async () => {
      if (!user) {
        setLoadingHistory(false);
        return;
      }

      try {
        const history = await getChatHistory(user.uid, 50);

        if (history.length > 0) {
          const formattedHistory = history.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 
                      new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          setMessages(prev => [...prev, ...formattedHistory]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [user]);

  const saveMessageToFirestore = async (message) => {
    if (!user) return;

    try {
      await saveChatMessage(user.uid, {
        role: message.role,
        content: message.content
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const isMedicalQuery = (text) => {
    if (!text || typeof text !== 'string') return false;
    const t = text.toLowerCase();

    // Reject very short or greeting-only inputs
    if (t.trim().length < 3) return false;
    const greetings = ['hi', 'hello', 'hey', 'thanks', 'thank you'];
    if (greetings.includes(t.trim())) return false;

    // Medical/nutrition keywords - allow if any match
    const medicalKeywords = [
      'symptom', 'symptoms', 'pain', 'fever', 'cough', 'breath', 'shortness', 'diarrhea', 'nausea',
      'vomit', 'vomiting', 'headache', 'migraine', 'infection', 'antibiotic', 'dose',
      'dosage', 'allergy', 'rash', 'blood pressure', 'bp', 'glucose', 'sugar', 'diabetic', 'cholesterol',
      'bmi', 'weight', 'weight loss', 'weight gain', 'calorie', 'calories', 'nutrition', 'diet', 'dietary',
      'meal', 'meals', 'sleep', 'insomnia', 'fatigue', 'depression', 'anxiety', 'mental health', 'pregnancy',
      'medication', 'prescription', 'vaccine', 'vaccination', 'immunization', 'heart', 'cardio',
      'exercise', 'workout', 'blood sugar', 'lab', 'labs', 'test results', 'lab results', 'urine', 'blood'
    ];

    for (const kw of medicalKeywords) {
      if (t.includes(kw)) return true;
    }

    // Also allow queries that explicitly ask medical question words with body terms
    const questionWords = ['what', 'how', 'why', 'when', 'should', 'can', 'is', 'are'];
    for (const q of questionWords) {
      if (t.startsWith(q + ' ')) {
        // If any medical word anywhere, allow
        for (const kw of medicalKeywords) {
          if (t.includes(kw)) return true;
        }
      }
    }

    return false;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const newUserMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputMessage("");

    // Save user message to Firestore
    await saveMessageToFirestore(newUserMessage);

    // If message is not medical, refuse immediately (no API call)
    if (!isMedicalQuery(newUserMessage.content)) {
      const refusal = {
        id: Date.now().toString() + '-refuse',
        role: 'assistant',
        content: "I'm sorry — I can only answer questions related to health, medical issues, nutrition, and wellbeing. Please ask a medical or nutrition-related question, or use other parts of the app for non-medical queries.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, refusal]);
      await saveMessageToFirestore(refusal);
      return;
    }

    setIsLoading(true);

    try {
      // Prepare messages for AI service (exclude initial greeting id)
      const aiMessages = [...messages, newUserMessage]
        .filter(msg => msg.id !== 'initial')
        .map(msg => ({ role: msg.role, content: msg.content }));

      // Strict instruction to only answer medical/nutrition queries and refuse others
      const systemContext = {
        role: "user",
        content: "You are an AI medical assistant. ONLY respond to medical, health, nutrition, lab, medication, or exercise related queries. If the user asks anything outside these domains (finance, coding, entertainment, politics, etc.), reply briefly: 'I'm sorry, I can only answer medical and health-related questions.' Always include a disclaimer to consult a licensed healthcare professional for diagnosis and treatment. Be concise, empathetic, and cite general best-practice steps when appropriate."
      };

      const response = await chatWithAI([systemContext, ...aiMessages]);

      // Handle new safe response format from chatWithAI
      let aiContent = '';
      if (response?.success) {
        aiContent = response.content || '';
      } else {
        console.warn('AI chat error:', response?.error);
        // Use fallback for failed responses
        aiContent = '';
      }

      const aiResponse = {
        id: Date.now().toString(),
        role: "assistant",
        content: aiContent || "I apologize, but I'm having trouble processing your request right now. Please try again later or consult with a healthcare professional for immediate assistance.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiResponse]);
      await saveMessageToFirestore(aiResponse);
    } catch (error) {
      console.warn('AI Chat Error:', error.message);
      const fallbackResponse = {
        id: Date.now().toString(),
        role: "assistant",
        content: "I apologize, but I'm having trouble processing your request right now. Please try again later or consult with a healthcare professional for immediate assistance.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackResponse]);
      await saveMessageToFirestore(fallbackResponse);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "What should I eat for breakfast?",
    "Explain my recent lab results",
    "Tips for better sleep",
    "Is my weight progress healthy?"
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] max-h-none">
        <div className="mb-4 md:mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">AI Health Assistant</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Get instant medical guidance based on your health profile
            <span className="text-xs ml-2 opacity-70">(Powered by {getCurrentProvider()})</span>
          </p>
        </div>

        <Card className="glass-card flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
            {loadingHistory ? (
              <div className="flex justify-center items-center h-full">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 md:gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className={`h-10 w-10 md:h-12 md:w-12 flex-shrink-0 ${
                      message.role === 'assistant' 
                        ? 'bg-gradient-to-br from-primary to-primary-glow' 
                        : 'bg-gradient-to-br from-secondary to-blue-500'
                    }`}>
                      <div className="h-full w-full flex items-center justify-center">
                        {message.role === 'assistant' ? (
                          <Heart className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        ) : (
                          <User className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        )}
                      </div>
                    </Avatar>

                    <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block p-4 md:p-5 rounded-2xl text-sm md:text-base shadow-md ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-primary to-primary-glow text-white'
                            : 'glass-card'
                        }`}
                      >
                        <p className={`${message.role === 'user' ? 'text-white' : 'text-foreground'} whitespace-pre-wrap break-words`}>
                          {message.content}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-1">{message.timestamp}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-primary to-primary-glow">
                      <div className="h-full w-full flex items-center justify-center">
                        <Heart className="h-5 w-5 text-white" />
                      </div>
                    </Avatar>
                    <div className="glass-card p-4 rounded-2xl">
                      <LoadingSpinner size="sm" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-6 border-t border-border bg-background/50 backdrop-blur-sm">
            <div className="flex gap-2 md:gap-3">
              <Input
                placeholder="Ask me anything about your health..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                className="glass-input flex-1 h-10 md:h-12 text-sm md:text-base"
                disabled={isLoading || loadingHistory}
              />
              <Button
                className="medical-gradient text-white h-10 md:h-12 px-4 md:px-6 flex-shrink-0"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading || loadingHistory}
              >
                {isLoading ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              AI responses are for informational purposes only. Always consult healthcare professionals for medical advice.
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AIDoctor;
