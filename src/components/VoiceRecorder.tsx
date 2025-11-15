import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { AudioRecorder, blobToBase64 } from '@/utils/audioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscript, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    recorderRef.current = new AudioRecorder();
    return () => {
      if (recorderRef.current?.isRecording()) {
        recorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      await recorderRef.current?.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return;

    try {
      setIsProcessing(true);
      const audioBlob = await recorderRef.current.stop();
      setIsRecording(false);

      // Convert to base64 and send to Whisper
      const base64Audio = await blobToBase64(audioBlob);
      
      const { data, error } = await supabase.functions.invoke('ai-document-intelligence', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data?.text) {
        onTranscript(data.text);
        toast({
          title: "Voice transcribed",
          description: "Your voice has been converted to text",
        });
      }
    } catch (error) {
      console.error('Failed to process audio:', error);
      toast({
        title: "Error",
        description: "Failed to transcribe audio",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (isRecording) {
    return (
      <Button 
        variant="destructive" 
        size="icon" 
        onClick={stopRecording}
        disabled={disabled}
      >
        <Square className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={startRecording}
      disabled={disabled}
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
};
