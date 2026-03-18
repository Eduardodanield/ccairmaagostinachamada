import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Trash2 } from 'lucide-react';
import type { Profile } from '@/types/database';

export default function AdminTeachers() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'teacher');
      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);
      if (profilesError) throw profilesError;
      return profiles as Profile[];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string }) => {
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: { email: data.email, password: data.password, fullName: data.fullName, role: 'teacher' },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsInviteOpen(false);
      setEmail(''); setFullName(''); setPassword('');
      toast({ title: 'Professor criado com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao criar professor', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: result, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast({ title: 'Professor excluído com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Falha ao excluir professor', description: error.message, variant: 'destructive' });
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ email, password, fullName });
  };

  return (
    <AdminLayout title="Professores" description="Gerenciar contas de professores">
      <div className="flex justify-end mb-6">
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEmail(''); setFullName(''); setPassword(''); }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Professor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Novo Professor</DialogTitle>
              <DialogDescription>
                Crie uma nova conta de professor.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Maria Silva" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="professor@escola.com.br" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? 'Criando...' : 'Criar Conta'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : teachers && teachers.length > 0 ? (
              teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.full_name}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir professor?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação é permanente. O professor <strong>{teacher.full_name}</strong> será removido completamente do sistema.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate(teacher.user_id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum professor encontrado. Convide seu primeiro professor!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
