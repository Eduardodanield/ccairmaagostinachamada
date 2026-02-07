import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Home, BarChart2, LogOut, GraduationCap, Calendar } from 'lucide-react';

const navItems = [
  { title: 'Turmas', url: '/teacher', icon: Home },
  { title: 'Atividades', url: '/teacher/activities', icon: Calendar },
  { title: 'Estatísticas', url: '/teacher/stats', icon: BarChart2 },
];

interface TeacherLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function TeacherLayout({ children, title, showBack, onBack }: TeacherLayoutProps) {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-full items-center px-4">
          {showBack ? (
            <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
              ← Voltar
            </Button>
          ) : (
            <div className="flex items-center gap-2 mr-4">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Frequência</span>
            </div>
          )}
          <h1 className="text-lg font-semibold flex-1">{title}</h1>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="flex h-full items-center justify-around px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === '/teacher'}
              className="flex flex-col items-center gap-1 px-6 py-2 text-muted-foreground transition-colors"
              activeClassName="text-primary"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.title}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
