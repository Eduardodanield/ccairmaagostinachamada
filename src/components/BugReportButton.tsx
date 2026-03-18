import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Bug, Loader2 } from 'lucide-react';

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject || !description) return;

    setIsSending(true);

    const { error } = await supabase.from('bug_reports').insert({
      user_id: user.id,
      user_email: profile?.email || user.email || '',
      user_name: profile?.full_name || 'Usuário',
      subject,
      description,
      page_url: window.location.href,
    });

    setIsSending(false);

    if (error) {
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar o relato. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Relato enviado!',
      description: 'Obrigado por reportar. Vamos analisar o problema.',
    });

    setSubject('');
    setDescription('');
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground shadow-lg hover:bg-destructive/90 transition-colors"
        title="Relatar um problema"
      >
        <Bug className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Relatar Erro</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              Relatar um Problema
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bug-subject">Assunto</Label>
              <Input
                id="bug-subject"
                placeholder="Ex: Botão não funciona na página de chamada"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bug-description">Descreva o problema</Label>
              <Textarea
                id="bug-description"
                placeholder="O que aconteceu? O que você esperava que acontecesse?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Página atual: {window.location.pathname}
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={isSending}>
                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Relato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
