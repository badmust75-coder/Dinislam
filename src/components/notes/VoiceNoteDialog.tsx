import { useState, useRef, useEffect } from 'react';
import { Mic, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VoiceNoteDialog = ({ open, onOpenChange }: VoiceNoteDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for speech recognition support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setMessage(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Non supporté',
        description: 'La reconnaissance vocale n\'est pas supportée sur ce navigateur',
        variant: 'destructive',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setMessage('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_messages')
        .insert({
          user_id: user.id,
          message: message.trim(),
        });

      if (error) throw error;

      toast({
        title: 'Message envoyé',
        description: 'Votre message a été transmis à l\'administrateur',
      });

      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Ma Note</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Microphone Button */}
          <div className="flex justify-center">
          <button
            onClick={toggleRecording}
            className={`
              relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
              ${isRecording 
                ? 'bg-emerald-500 animate-pulse' 
                : 'bg-destructive'
              }
            `}
          >
            <Mic className="h-10 w-10 text-primary-foreground" />
            
            {/* Sound waves animation when recording */}
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-30" />
                <span className="absolute inset-[-8px] rounded-full border-2 border-emerald-400 animate-pulse opacity-50" />
                <span className="absolute inset-[-16px] rounded-full border-2 border-emerald-300 animate-pulse opacity-30" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {isRecording 
            ? 'Parlez maintenant... Appuyez pour arrêter'
              : 'Appuyez pour dicter votre message'
            }
          </p>

          {/* Message Textarea */}
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Votre message apparaîtra ici..."
            rows={4}
            className="resize-none"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || isSubmitting}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Valider
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceNoteDialog;
