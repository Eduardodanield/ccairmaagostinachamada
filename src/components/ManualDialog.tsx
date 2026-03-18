import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen } from 'lucide-react';

interface ManualDialogProps {
  variant: 'admin' | 'teacher';
  triggerClassName?: string;
}

function TeacherManualContent() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-primary mb-3">1. Login</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• Acesse: <span className="font-medium text-foreground">ccairmaagostinachamada.lovable.app</span></li>
          <li>• Use o email e senha fornecidos pelo diretor</li>
          <li>• Clique em <span className="font-medium text-foreground">"Entrar"</span></li>
          <li>• Você será redirecionado para o painel do professor</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">2. Página Inicial (Home)</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• Resumo do dia: quantos alunos na sua sala, presenças registradas</li>
          <li>• Acesso rápido para fazer a chamada</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">3. Fazer Chamada (Chamada)</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• A sala já aparece automaticamente (definida pelo diretor)</li>
          <li>• Selecione a <span className="font-medium text-foreground">data</span> (por padrão é o dia de hoje)</li>
          <li>• A lista de alunos da sua sala será exibida</li>
          <li>• Marque <span className="font-medium text-foreground">presente</span> ou <span className="font-medium text-foreground">ausente</span> para cada aluno</li>
          <li>• Clique em <span className="font-medium text-foreground">"Salvar"</span> para registrar a chamada</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">4. Atividades</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• Veja o calendário mensal de atividades planejadas</li>
          <li>• <span className="font-medium text-foreground">Adicionar atividade:</span> clique em um dia do calendário e registre o título e descrição</li>
          <li>• <span className="font-medium text-foreground">Editar/Excluir:</span> clique em uma atividade existente para modificar ou remover</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">5. Estatísticas</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• Acompanhe a frequência dos alunos da sua sala</li>
          <li>• Veja gráficos de presença por período</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">6. Esqueci minha senha</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• Na tela de login, clique em <span className="font-medium text-foreground">"Esqueci minha senha"</span></li>
          <li>• Digite seu email</li>
          <li>• Um link de redefinição será enviado para seu email</li>
          <li>• Clique no link e crie uma nova senha</li>
        </ul>
      </div>
    </div>
  );
}

function AdminManualContent() {
  return (
    <div className="space-y-6">
      {/* Admin sections */}
      <div className="pb-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">
          👔 Visão do Administrador (Diretor)
        </h2>
        <p className="text-xs text-muted-foreground">Acesso: ccairmaagostinachamada.lovable.app</p>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">1. Login</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• Acesse o link acima</li>
          <li>• Digite seu email e senha</li>
          <li>• Clique em <span className="font-medium text-foreground">"Entrar"</span></li>
          <li>• Você será redirecionado automaticamente para o painel do administrador</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">2. Dashboard (Página Inicial)</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• Visão geral com estatísticas: total de alunos, presenças do dia, salas ativas</li>
          <li>• Resumo rápido das informações mais importantes</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">3. Gerenciar Alunos (Menu: Alunos)</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• <span className="font-medium text-foreground">Ver todos os alunos</span> cadastrados com filtros por sala</li>
          <li>• <span className="font-medium text-foreground">Cadastrar novo aluno:</span> clique em "Novo Aluno", preencha nome, idade, data de nascimento, sala, e demais dados</li>
          <li>• <span className="font-medium text-foreground">Editar aluno:</span> clique no ícone de edição ao lado do aluno</li>
          <li>• <span className="font-medium text-foreground">Mudar aluno de sala:</span> clique no ícone de setas (⇄) para transferir o aluno para outra sala</li>
          <li>• <span className="font-medium text-foreground">Arquivar aluno:</span> remove o aluno da listagem ativa sem apagar os dados</li>
          <li>• <span className="font-medium text-foreground">Importar Excel:</span> clique em "Importar Excel" para cadastrar vários alunos de uma vez</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">4. Gerenciar Salas (Menu: Salas)</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• <span className="font-medium text-foreground">Ver todas as salas</span> com o turno (manhã/tarde)</li>
          <li>• <span className="font-medium text-foreground">Criar nova sala:</span> clique em "Nova Sala", informe o nome e o turno</li>
          <li>• <span className="font-medium text-foreground">Editar sala:</span> altere nome ou turno de uma sala existente</li>
          <li>• <span className="font-medium text-foreground">Excluir sala:</span> remova salas que não são mais necessárias</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">5. Gerenciar Professores (Menu: Professores)</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• <span className="font-medium text-foreground">Ver professores</span> cadastrados e suas salas atribuídas</li>
          <li>• <span className="font-medium text-foreground">Convidar professor:</span> clique em "Convidar Professor", preencha nome, email, senha temporária e selecione a sala</li>
          <li>• <span className="font-medium text-foreground">Editar professor:</span> clique em "Editar" para alterar a sala atribuída</li>
          <li>• <span className="font-medium text-foreground">Compartilhar credenciais:</span> envie ao professor o email e a senha temporária</li>
          <li>• <span className="font-medium text-foreground">Desativar professor:</span> desative a conta sem apagar os dados</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">6. Visualizar Presença (Menu: Presença)</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• Consulte os registros de presença de todos os alunos</li>
          <li>• Filtre por sala e por data</li>
          <li>• Veja quem esteve presente ou ausente em cada dia</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">7. Analytics (Menu: Analytics)</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• Gráficos de frequência por sala e por período</li>
          <li>• Métricas de acompanhamento para relatórios</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">8. Gerar Relatório PDF</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• Na página de Salas, clique no botão de relatório</li>
          <li>• Selecione o mês desejado</li>
          <li>• O sistema gera um PDF com a lista de presença completa do mês</li>
        </ul>
      </div>

      <div>
        <h3 className="text-base font-semibold text-primary mb-3">9. Alterar suas próprias credenciais</h3>
        <ul className="space-y-1.5 text-sm text-muted-foreground ml-4">
          <li>• No rodapé da barra lateral, clique no seu nome</li>
          <li>• Altere seu nome, email ou senha de acesso</li>
        </ul>
      </div>

      {/* Teacher section */}
      <div className="pt-4 border-t border-border">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          👨‍🏫 Visão do Professor
        </h2>
        <TeacherManualContent />
      </div>
    </div>
  );
}

export function ManualDialog({ variant, triggerClassName }: ManualDialogProps) {
  const [open, setOpen] = useState(false);

  const isAdmin = variant === 'admin';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className={triggerClassName || "w-full justify-start text-muted-foreground hover:text-sidebar-foreground"}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          {isAdmin ? 'Manual do Sistema' : 'Como usar'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            📘 {isAdmin ? 'Manual do Sistema' : 'Como Usar o Sistema'}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6 max-h-[calc(85vh-5rem)]">
          {isAdmin ? <AdminManualContent /> : <TeacherManualContent />}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
