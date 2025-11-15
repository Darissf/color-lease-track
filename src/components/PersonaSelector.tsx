import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Persona {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  avatar_emoji: string | null;
  is_default: boolean;
}

interface PersonaSelectorProps {
  selectedPersonaId: string | null;
  onPersonaChange: (personaId: string | null) => void;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({ 
  selectedPersonaId, 
  onPersonaChange 
}) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    avatar_emoji: '🤖',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    const { data } = await supabase
      .from('ai_personas')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (data) {
      setPersonas(data);
      if (!selectedPersonaId && data.length > 0) {
        const defaultPersona = data.find(p => p.is_default) || data[0];
        onPersonaChange(defaultPersona.id);
      }
    }
  };

  const savePersona = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingPersona) {
      await supabase
        .from('ai_personas')
        .update(formData)
        .eq('id', editingPersona.id);
      toast({ title: "Persona updated" });
    } else {
      await supabase
        .from('ai_personas')
        .insert({ ...formData, user_id: user.id });
      toast({ title: "Persona created" });
    }

    fetchPersonas();
    setIsDialogOpen(false);
    resetForm();
  };

  const deletePersona = async (id: string) => {
    await supabase.from('ai_personas').delete().eq('id', id);
    toast({ title: "Persona deleted" });
    fetchPersonas();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      system_prompt: '',
      avatar_emoji: '🤖',
    });
    setEditingPersona(null);
  };

  const openEdit = (persona: Persona) => {
    setEditingPersona(persona);
    setFormData({
      name: persona.name,
      description: persona.description || '',
      system_prompt: persona.system_prompt,
      avatar_emoji: persona.avatar_emoji || '🤖',
    });
    setIsDialogOpen(true);
  };

  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedPersonaId || undefined} onValueChange={onPersonaChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select persona">
            {selectedPersona && (
              <div className="flex items-center gap-2">
                <span>{selectedPersona.avatar_emoji}</span>
                <span>{selectedPersona.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {personas.map((persona) => (
            <SelectItem key={persona.id} value={persona.id}>
              <div className="flex items-center gap-2">
                <span>{persona.avatar_emoji}</span>
                <span>{persona.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" onClick={resetForm}>
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPersona ? 'Edit' : 'Create'} AI Persona</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Financial Expert"
              />
            </div>
            <div>
              <Label>Emoji</Label>
              <Input
                value={formData.avatar_emoji}
                onChange={(e) => setFormData({ ...formData, avatar_emoji: e.target.value })}
                placeholder="🤖"
                maxLength={2}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
            <div>
              <Label>System Prompt</Label>
              <Textarea
                value={formData.system_prompt}
                onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                placeholder="You are a..."
                rows={6}
              />
            </div>
            <div className="flex justify-between">
              <Button onClick={savePersona}>Save Persona</Button>
              {editingPersona && (
                <Button 
                  variant="destructive" 
                  onClick={() => deletePersona(editingPersona.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedPersona && !selectedPersona.is_default && (
        <Button variant="ghost" size="icon" onClick={() => openEdit(selectedPersona)}>
          <Edit className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
