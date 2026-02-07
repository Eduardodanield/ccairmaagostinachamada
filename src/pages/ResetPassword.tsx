import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GraduationCap } from 'lucide-react';
import loginBackground from '@/assets/login-background.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  const passwordsMatch = useMemo(() => {
    if (!password || !confirmPassword) return true;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  useEffect(() => {
    // When the user lands here from the recovery email, the auth client will
    // pick up the session from the URL and store it.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setHasRecoverySession(!!data.session);
    };
    check().catch(() => setHasRecoverySession(false));
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast({
        title: 'Senha obrigatória',
        description: 'Digite uma nova senha.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Senha fraca',
        description: 'Use pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: 'As senhas não conferem',
        description: 'Digite a mesma senha nos dois campos.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Erro ao redefinir senha',
        description: 'Tente novamente abrindo o link mais recente do email.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Senha atualizada!',
      description: 'Agora você já pode entrar com a nova senha.',
    });

    // Optional: sign out to ensure next login uses new password explicitly
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-fade-in"
        style={{ backgroundImage: `url(${loginBackground})` }}
      />
      <div className="absolute inset-0 bg-black/40" />

      <Card className="relative z-10 w-full max-w-md animate-scale-in bg-background/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Redefinir senha</CardTitle>
          <CardDescription>
            Defina uma nova senha para acessar o Controle de Frequência.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasRecoverySession === false ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Este link não é válido ou expirou. Volte ao login e clique em{' '}
                <span className="font-medium">Esqueci minha senha</span> para enviar um novo link.
              </p>
              <Button className="w-full" onClick={() => navigate('/login')}>
                Voltar para o login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                {!passwordsMatch && (
                  <p className="text-sm text-destructive">As senhas não conferem.</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || hasRecoverySession === null}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar nova senha
              </Button>

              <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/login')}>
                Cancelar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
