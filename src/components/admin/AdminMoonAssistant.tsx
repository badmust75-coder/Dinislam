import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, X, Send, Moon, CheckCircle, XCircle, Plus, MessageSquare, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';

interface Message {
  id: string;
  text: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  pendingAction?: any;
}

interface Conversation {
  id: string;
  topic: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

const AdminMoonAssistant = () => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDraggingBtn = useRef(false);
  const startTouch = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  const [pos, setPos] = useState({ x: 16, y: typeof window !== 'undefined' ? window.innerHeight - 80 : 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Reset position on route change
  useEffect(() => {
    setPos({ x: 16, y: window.innerHeight - 80 });
  }, [location.pathname]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations when panel opens
  useEffect(() => {
    if (isOpen && user) {
      loadConversations();
    }
  }, [isOpen, user]);

  const loadConversations = async () => {
    if (!user) return;
    setLoadingConversations(true);
    try {
      const { data, error } = await (supabase as any)
        .from('admin_conversations')
        .select('*')
        .eq('admin_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setConversations((data || []).map((c: any) => ({
        ...c,
        messages: (c.messages || []).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      })));
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const saveConversation = async (convId: string, msgs: Message[], topic?: string) => {
    if (!user) return;
    const serializedMsgs = msgs.map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      pendingAction: m.pendingAction || undefined,
    }));

    try {
      const updateData: any = {
        messages: serializedMsgs,
        updated_at: new Date().toISOString(),
      };
      if (topic) updateData.topic = topic;

      const { error } = await supabase
        .from('admin_conversations')
        .update(updateData)
        .eq('id', convId);
      if (error) throw error;

      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, messages: msgs, ...(topic ? { topic } : {}), updated_at: new Date().toISOString() } : c
      ));
    } catch (err) {
      console.error('Error saving conversation:', err);
    }
  };

  const createNewConversation = async () => {
    if (!user) return;
    try {
      const welcomeMsg: Message = {
        id: Date.now().toString(),
        text: '🌙 Salam ! Je suis votre Assistant Lune, prêt à vous aider dans la gestion de votre application. Que puis-je faire pour vous ?',
        type: 'assistant',
        timestamp: new Date()
      };

      const { data, error } = await (supabase as any)
        .from('admin_conversations')
        .insert({
          admin_id: user.id,
          user_id: user.id,
          topic: 'Nouvelle conversation',
          messages: [{ ...welcomeMsg, timestamp: welcomeMsg.timestamp.toISOString() }],
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      const newConv: Conversation = {
        id: data.id,
        topic: data.topic || 'Nouvelle conversation',
        messages: [welcomeMsg],
        created_at: data.created_at,
        updated_at: data.updated_at || data.created_at,
      };
      setConversations(prev => [newConv, ...prev]);
      openConversation(newConv);
    } catch (err) {
      console.error('Error creating conversation:', err);
      toast({ title: 'Erreur', description: 'Impossible de créer la conversation', variant: 'destructive' });
    }
  };

  const deleteConversation = async (convId: string) => {
    try {
      const { error } = await supabase.from('admin_conversations').delete().eq('id', convId);
      if (error) throw error;
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
        setShowConversationList(true);
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  const openConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages);
    setShowConversationList(false);
  };

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!moonRef.current) return;
    const rect = moonRef.current.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
    setHasMoved(false);
    moonRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setHasMoved(true);
    const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 56));
    const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 56));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (!hasMoved) {
      setIsOpen(prev => !prev);
    }
  };

  const generateTopicFromMessages = (msgs: Message[]): string => {
    const firstUserMsg = msgs.find(m => m.type === 'user');
    if (!firstUserMsg) return 'Nouvelle conversation';
    const text = firstUserMsg.text.slice(0, 50);
    return text.length < firstUserMsg.text.length ? text + '…' : text;
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !activeConversationId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      type: 'user',
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    // Auto-generate topic from first user message
    const isFirstUserMessage = !messages.some(m => m.type === 'user');

    try {
      const { data, error } = await supabase.functions.invoke('admin-assistant', {
        body: {
          message: userMsg.text,
          conversationHistory: updatedMessages.slice(-20)
        }
      });

      if (error) throw error;

      const responseText = data?.response || '🌙 Désolé, je n\'ai pas pu traiter votre demande.';

      let pendingAction = null;
      const actionMatch = responseText.match(/```action\n([\s\S]*?)\n```/);
      if (actionMatch) {
        try { pendingAction = JSON.parse(actionMatch[1]); } catch {}
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText.replace(/```action\n[\s\S]*?\n```/g, '').trim(),
        type: 'assistant',
        timestamp: new Date(),
        pendingAction
      };

      const allMessages = [...updatedMessages, assistantMsg];
      setMessages(allMessages);

      // Save to DB with auto-topic
      const topic = isFirstUserMessage ? generateTopicFromMessages(allMessages) : undefined;
      await saveConversation(activeConversationId, allMessages, topic);
    } catch (err) {
      console.error('Assistant error:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: '🌙 Une erreur est survenue. Veuillez réessayer.',
        type: 'assistant',
        timestamp: new Date()
      };
      const allMessages = [...updatedMessages, errorMsg];
      setMessages(allMessages);
      await saveConversation(activeConversationId, allMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = async (msg: Message) => {
    if (!msg.pendingAction || !activeConversationId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-assistant', {
        body: { action: msg.pendingAction }
      });

      if (error) throw error;

      const updatedMsgs = messages.map(m =>
        m.id === msg.id ? { ...m, pendingAction: undefined } : m
      );
      const resultMsg: Message = {
        id: Date.now().toString(),
        text: data?.response || '🌙 Action exécutée.',
        type: 'assistant',
        timestamp: new Date()
      };
      const allMessages = [...updatedMsgs, resultMsg];
      setMessages(allMessages);
      await saveConversation(activeConversationId, allMessages);

      toast({ title: "Action exécutée", description: msg.pendingAction.description });
    } catch (err) {
      toast({ title: "Erreur", description: "L'action a échoué", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const rejectAction = async (msg: Message) => {
    if (!activeConversationId) return;
    const updatedMsgs = messages.map(m =>
      m.id === msg.id ? { ...m, pendingAction: undefined } : m
    );
    const cancelMsg: Message = {
      id: Date.now().toString(),
      text: '🌙 Action annulée. Que puis-je faire d\'autre ?',
      type: 'assistant',
      timestamp: new Date()
    };
    const allMessages = [...updatedMsgs, cancelMsg];
    setMessages(allMessages);
    await saveConversation(activeConversationId, allMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      {/* Floating Moon Button */}
      <button
        ref={moonRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="fixed z-40 w-10 h-10 rounded-full flex items-center justify-center shadow-md select-none touch-none transition-all hover:scale-105 active:scale-95"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          backgroundColor: '#1a1a2e',
          border: '1px solid rgba(255,255,255,0.15)',
          transform: isDragging ? 'scale(1.15)' : undefined,
          cursor: isDragging ? 'grabbing' : 'pointer',
        }}
        aria-label="Assistant Admin"
      >
        <span style={{ fontSize: '18px', lineHeight: 1, filter: 'drop-shadow(0 0 4px rgba(200,180,255,0.6))' }}>🌙</span>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <Card
          className="fixed z-[9998] shadow-2xl border-2 border-amber-400/30 flex flex-col"
          style={{
            bottom: '16px',
            right: '16px',
            width: 'min(420px, calc(100vw - 32px))',
            height: 'min(600px, calc(100vh - 100px))',
          }}
        >
          <CardHeader className="pb-2 pr-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-t-lg">
            <CardTitle className="text-white text-base flex items-center gap-2">
              {!showConversationList && (
                <button
                  onClick={() => setShowConversationList(true)}
                  className="hover:bg-white/20 rounded p-0.5 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <Moon className="h-5 w-5" fill="white" />
              {showConversationList ? 'Assistant Admin' : (
                <span className="truncate text-sm">{activeConversation?.topic || 'Conversation'}</span>
              )}
            </CardTitle>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {showConversationList ? (
              /* Conversation List */
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b">
                  <Button
                    onClick={createNewConversation}
                    className="w-full bg-amber-500 hover:bg-amber-600"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle conversation
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  {loadingConversations ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Aucune conversation</p>
                      <p className="text-xs mt-1">Créez-en une pour commencer</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {conversations.map(conv => {
                        const msgCount = conv.messages.filter(m => m.type === 'user').length;
                        const lastUpdate = new Date(conv.updated_at);
                        const timeStr = lastUpdate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div
                            key={conv.id}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                            onClick={() => openConversation(conv)}
                          >
                            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{conv.topic}</p>
                              <p className="text-[10px] text-muted-foreground">{timeStr} · {msgCount} msg</p>
                            </div>
                            <button
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Supprimer cette conversation ?')) deleteConversation(conv.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              /* Chat View */
              <>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                          msg.type === 'user'
                            ? 'bg-amber-500 text-white rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          
                          {msg.pendingAction && (
                            <div className="mt-2 p-2 bg-background/50 rounded-lg border border-amber-300">
                              <p className="text-xs font-medium mb-2">⚠️ Action proposée : {msg.pendingAction.description}</p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                  onClick={() => confirmAction(msg)}
                                  disabled={isLoading}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Confirmer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-red-400 text-red-500 hover:bg-red-50"
                                  onClick={() => rejectAction(msg)}
                                  disabled={isLoading}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Annuler
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-3 border-t flex gap-2">
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Posez votre question..."
                    className="min-h-[40px] max-h-[100px] resize-none text-sm"
                    rows={1}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || isLoading}
                    size="icon"
                    className="h-10 w-10 shrink-0 bg-amber-500 hover:bg-amber-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AdminMoonAssistant;
