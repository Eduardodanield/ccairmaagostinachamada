import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Loader2 } from 'lucide-react';
import loginBackground from '@/assets/login-background.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Falha no Login',
        description: 'Email ou senha incorretos.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Bem-vindo(a)!',
      description: 'Login realizado com sucesso.',
    });

    navigate(from, { replace: true });
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast({
        title: 'Email obrigatório',
        description: 'Por favor, insira seu email.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingReset(true);

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/login`,
    });

    setIsSendingReset(false);

    if (error) {
      // Check if it's a rate limit error
      if (error.message?.includes('after') || error.status === 429) {
        toast({
          title: 'Aguarde um momento',
          description: 'Por segurança, aguarde alguns segundos antes de tentar novamente.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Erro ao enviar email',
          description: 'Não foi possível enviar o email de recuperação.',
          variant: 'destructive',
        });
      }
      return;
    }

    toast({
      title: 'Email enviado!',
      description: 'Verifique sua caixa de entrada para redefinir sua senha.',
    });

    setShowForgotPassword(false);
    setForgotEmail('');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Background Image with Fade In */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-fade-in"
        style={{ backgroundImage: `url(${loginBackground})` }}
      />
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-md animate-scale-in bg-background/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Controle de Frequência CCA Irmã Agostina</CardTitle>
          <CardDescription>Entre com sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@escola.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-sm text-muted-foreground"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Esqueci minha senha
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu email e enviaremos um link para redefinir sua senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="voce@escola.com.br"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForgotPassword(false)}>
              Cancelar
            </Button>
            <Button onClick={handleForgotPassword} disabled={isSendingReset}>
              {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
