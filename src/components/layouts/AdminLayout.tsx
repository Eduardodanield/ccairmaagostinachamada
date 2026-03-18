import { ReactNode, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  LayoutDashboard, Users, School, UserCog, ClipboardList, BarChart3, LogOut, GraduationCap, Settings,
} from 'lucide-react';
import { ManualDialog } from '@/components/ManualDialog';
import { BackupCleanupDialog } from '@/components/BackupCleanupDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { title: 'Painel', url: '/admin', icon: LayoutDashboard },
  { title: 'Alunos', url: '/admin/students', icon: Users },
  { title: 'Salas', url: '/admin/classrooms', icon: School },
  { title: 'Professores', url: '/admin/teachers', icon: UserCog },
  { title: 'Frequência', url: '/admin/attendance', icon: ClipboardList },
  { title: 'Relatórios', url: '/admin/analytics', icon: BarChart3 },
];

function AdminSidebar() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleOpenEdit = () => {
    setNewEmail(profile?.email || '');
    setNewName(profile?.full_name || '');
    setNewPassword('');
    setIsEditOpen(true);
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const body: Record<string, string> = {};
      if (newEmail && newEmail !== profile?.email) body.email = newEmail;
      if (newPassword) body.password = newPassword;
      if (newName && newName !== profile?.full_name) body.fullName = newName;

      if (Object.keys(body).length === 0) {
        toast({ title: 'Nenhuma alteração detectada' });
        setIsEditOpen(false);
        setIsSaving(false);
        return;
      }

      const { data: result, error } = await supabase.functions.invoke('update-admin-credentials', { body });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      toast({ title: 'Credenciais atualizadas com sucesso', description: 'Faça login novamente com as novas credenciais.' });
      setIsEditOpen(false);

      // Sign out so the admin re-logs with new credentials
      if (body.email || body.password) {
        await signOut();
        navigate('/login');
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <GraduationCap className="h-6 w-6 text-sidebar-primary mr-2" />
        <span className="font-semibold text-sidebar-foreground">Frequência</span>
      </div>
      <SidebarContent className="flex flex-col h-[calc(100vh-4rem)]">
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin'}
                      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="p-4 border-t border-sidebar-border">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'Diretor'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <ManualDialog variant="admin" />
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground hover:text-sidebar-foreground"
                  onClick={handleOpenEdit}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Editar Credenciais
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Credenciais</DialogTitle>
                  <DialogDescription>
                    Altere seu nome, email ou senha. Após alterar email ou senha, você será desconectado.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveCredentials} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Nome</Label>
                    <Input id="adminName" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email</Label>
                    <Input id="adminEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Nova Senha</Label>
                    <Input id="adminPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Deixe vazio para manter" minLength={6} />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border flex items-center px-6 bg-background">
            <SidebarTrigger className="mr-4" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto bg-muted/30">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
