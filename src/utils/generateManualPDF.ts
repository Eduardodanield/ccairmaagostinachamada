import jsPDF from 'jspdf';

export function generateManualPDF() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const addTitle = (text: string, size = 18) => {
    checkPageBreak(size + 10);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(text, margin, y);
    y += size * 0.6;
  };

  const addSubtitle = (text: string) => {
    checkPageBreak(16);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(text, margin, y);
    y += 7;
  };

  const addText = (text: string, indent = 0) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, maxWidth - indent);
    for (const line of lines) {
      checkPageBreak(6);
      doc.text(line, margin + indent, y);
      y += 5;
    }
    y += 2;
  };

  const addBullet = (text: string, indent = 5) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, maxWidth - indent - 5);
    checkPageBreak(6);
    doc.text('•', margin + indent, y);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) checkPageBreak(6);
      doc.text(lines[i], margin + indent + 5, y);
      y += 5;
    }
    y += 1;
  };

  const addNumbered = (num: string, text: string, indent = 5) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, maxWidth - indent - 8);
    checkPageBreak(6);
    doc.setFont('helvetica', 'bold');
    doc.text(num, margin + indent, y);
    doc.setFont('helvetica', 'normal');
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) checkPageBreak(6);
      doc.text(lines[i], margin + indent + 8, y);
      y += 5;
    }
    y += 1;
  };

  const addSpacer = (h = 5) => { y += h; };

  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 20;
    }
  };

  const addDivider = () => {
    checkPageBreak(8);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  };

  // ========== CAPA ==========
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('Manual do Sistema', pageWidth / 2, 60, { align: 'center' });

  doc.setFontSize(18);
  doc.setTextColor(60, 60, 60);
  doc.text('CCA Chamada Digital', pageWidth / 2, 75, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('CCA Irmã Agostina', pageWidth / 2, 95, { align: 'center' });
  doc.text('Guia Completo de Uso do Sistema', pageWidth / 2, 105, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Acesso: ccairmaagostinachamada.lovable.app', pageWidth / 2, 125, { align: 'center' });

  const today = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${today}`, pageWidth / 2, 140, { align: 'center' });

  // ========== PÁGINA ADMIN ==========
  doc.addPage();
  y = 20;

  addTitle('VISÃO DO ADMINISTRADOR (Diretor)', 16);
  addSpacer(5);

  // Login
  addSubtitle('1. Como Fazer Login');
  addNumbered('1.', 'Abra o navegador (Chrome, Firefox, Safari ou Edge)');
  addNumbered('2.', 'Acesse: ccairmaagostinachamada.lovable.app');
  addNumbered('3.', 'Digite seu email e senha');
  addNumbered('4.', 'Clique em "Entrar"');
  addNumbered('5.', 'Você será redirecionado ao painel do administrador');
  addSpacer();

  addDivider();

  // Dashboard
  addSubtitle('2. Dashboard (Página Inicial)');
  addBullet('Ao entrar, você verá o painel com estatísticas gerais');
  addBullet('Total de alunos cadastrados, presenças do dia e salas ativas');
  addBullet('Use o menu lateral esquerdo para navegar entre as seções');
  addSpacer();

  addDivider();

  // Alunos
  addSubtitle('3. Gerenciar Alunos (Menu: Alunos)');
  addText('Nesta seção você gerencia todos os alunos do CCA.');
  addSpacer(2);

  addText('Ver alunos:', 3);
  addBullet('A lista mostra todos os alunos ativos', 8);
  addBullet('Use o filtro de sala para ver alunos de uma sala específica', 8);
  addSpacer(2);

  addText('Cadastrar novo aluno:', 3);
  addNumbered('1.', 'Clique no botão "Novo Aluno"', 8);
  addNumbered('2.', 'Preencha: nome, idade, data de nascimento, sala', 8);
  addNumbered('3.', 'Opcionais: RG, CPF, nome da mãe, telefone, gênero', 8);
  addNumbered('4.', 'Clique em "Salvar"', 8);
  addSpacer(2);

  addText('Editar aluno:', 3);
  addBullet('Clique no ícone de lápis ao lado do aluno', 8);
  addBullet('Altere os dados desejados e salve', 8);
  addSpacer(2);

  addText('Mudar aluno de sala:', 3);
  addBullet('Clique no ícone de setas (⇄) ao lado do aluno', 8);
  addBullet('Selecione a nova sala e confirme', 8);
  addSpacer(2);

  addText('Arquivar aluno:', 3);
  addBullet('Clique no ícone de arquivo para remover da lista ativa', 8);
  addBullet('Os dados do aluno são mantidos no sistema', 8);
  addSpacer(2);

  addText('Importar planilha Excel:', 3);
  addBullet('Clique em "Importar Excel"', 8);
  addBullet('Selecione o arquivo .xls ou .xlsx com os dados dos alunos', 8);
  addBullet('Confira os dados na pré-visualização e confirme', 8);
  addSpacer();

  addDivider();

  // Salas
  addSubtitle('4. Gerenciar Salas (Menu: Salas)');
  addText('Criar nova sala:', 3);
  addNumbered('1.', 'Clique em "Nova Sala"', 8);
  addNumbered('2.', 'Informe o nome da sala (ex: Grupo Alessandra)', 8);
  addNumbered('3.', 'Selecione o turno: Manhã ou Tarde', 8);
  addNumbered('4.', 'Clique em "Salvar"', 8);
  addSpacer(2);

  addText('Editar sala:', 3);
  addBullet('Clique no ícone de edição para alterar nome ou turno', 8);
  addSpacer(2);

  addText('Gerar relatório PDF:', 3);
  addBullet('Clique no ícone de relatório na sala desejada', 8);
  addBullet('Selecione o mês', 8);
  addBullet('O PDF será gerado com a presença de todos os alunos', 8);
  addSpacer();

  addDivider();

  // Professores
  addSubtitle('5. Gerenciar Professores (Menu: Professores)');
  addText('Convidar novo professor:', 3);
  addNumbered('1.', 'Clique em "Convidar Professor"', 8);
  addNumbered('2.', 'Preencha: nome completo, email e senha temporária', 8);
  addNumbered('3.', 'Selecione a sala que o professor irá gerenciar', 8);
  addNumbered('4.', 'Clique em "Criar"', 8);
  addNumbered('5.', 'Compartilhe o email e senha com o professor', 8);
  addSpacer(2);

  addText('Editar sala do professor:', 3);
  addBullet('Clique em "Editar" ao lado do professor', 8);
  addBullet('Altere a sala atribuída e salve', 8);
  addSpacer(2);

  addText('Desativar professor:', 3);
  addBullet('Clique em "Desativar" para remover o acesso sem apagar dados', 8);
  addSpacer();

  addDivider();

  // Presença e Analytics
  addSubtitle('6. Presença (Menu: Presença)');
  addBullet('Consulte registros de presença de todos os alunos');
  addBullet('Filtre por sala e por data');
  addSpacer();

  addSubtitle('7. Analytics (Menu: Analytics)');
  addBullet('Veja gráficos de frequência por sala');
  addBullet('Acompanhe métricas e tendências');
  addSpacer();

  addDivider();

  // Alterar credenciais
  addSubtitle('8. Alterar Suas Credenciais');
  addNumbered('1.', 'No rodapé da barra lateral, clique no seu nome');
  addNumbered('2.', 'Altere seu nome, email ou senha');
  addNumbered('3.', 'Salve as alterações');
  addSpacer();

  // ========== PÁGINA PROFESSOR ==========
  doc.addPage();
  y = 20;

  addTitle('VISÃO DO PROFESSOR', 16);
  addSpacer(5);

  // Login
  addSubtitle('1. Como Fazer Login');
  addNumbered('1.', 'Abra o navegador no celular ou computador');
  addNumbered('2.', 'Acesse: ccairmaagostinachamada.lovable.app');
  addNumbered('3.', 'Use o email e senha fornecidos pelo diretor');
  addNumbered('4.', 'Clique em "Entrar"');
  addNumbered('5.', 'Você será redirecionado ao painel do professor');
  addSpacer();

  addDivider();

  // Home
  addSubtitle('2. Página Inicial (Home)');
  addBullet('Resumo do dia: alunos na sua sala e presenças registradas');
  addBullet('Acesso rápido para fazer a chamada do dia');
  addSpacer();

  addDivider();

  // Chamada
  addSubtitle('3. Fazer a Chamada (Menu: Chamada)');
  addText('Este é o recurso principal do professor. Siga os passos:');
  addSpacer(2);
  addNumbered('1.', 'Acesse a seção "Chamada" no menu');
  addNumbered('2.', 'Sua sala aparece automaticamente (definida pelo diretor)');
  addNumbered('3.', 'A data de hoje já vem selecionada (pode alterar se necessário)');
  addNumbered('4.', 'A lista de alunos da sua sala será exibida');
  addNumbered('5.', 'Marque "Presente" ou "Ausente" para cada aluno');
  addNumbered('6.', 'Clique em "Salvar" para registrar a chamada');
  addSpacer(2);
  addText('⚠️ Importante: A chamada pode ser editada no mesmo dia caso precise corrigir.');
  addSpacer();

  addDivider();

  // Atividades
  addSubtitle('4. Atividades (Menu: Atividades)');
  addText('Planeje e registre as atividades do mês:');
  addSpacer(2);
  addText('Adicionar atividade:', 3);
  addNumbered('1.', 'Clique em um dia do calendário', 8);
  addNumbered('2.', 'Preencha o título e descrição da atividade', 8);
  addNumbered('3.', 'Salve', 8);
  addSpacer(2);
  addText('Editar ou excluir:', 3);
  addBullet('Clique em uma atividade existente para modificar ou remover', 8);
  addSpacer();

  addDivider();

  // Estatísticas
  addSubtitle('5. Estatísticas (Menu: Estatísticas)');
  addBullet('Veja a frequência dos alunos da sua sala');
  addBullet('Gráficos mostram a presença ao longo do tempo');
  addSpacer();

  addDivider();

  // Esqueci senha
  addSubtitle('6. Esqueci Minha Senha');
  addNumbered('1.', 'Na tela de login, clique em "Esqueci minha senha"');
  addNumbered('2.', 'Digite seu email cadastrado');
  addNumbered('3.', 'Clique em "Enviar"');
  addNumbered('4.', 'Acesse seu email e clique no link de recuperação');
  addNumbered('5.', 'Crie uma nova senha');
  addSpacer();

  // ========== OBSERVAÇÕES ==========
  doc.addPage();
  y = 20;

  addTitle('OBSERVAÇÕES IMPORTANTES', 16);
  addSpacer(5);

  addSubtitle('Perguntas Frequentes');
  addSpacer(3);

  addText('Quem cria as contas dos professores?', 3);
  addBullet('Somente o diretor (administrador) pode criar contas', 8);
  addSpacer(3);

  addText('O professor pode escolher sua sala?', 3);
  addBullet('Não. A sala é definida pelo diretor no momento do cadastro', 8);
  addSpacer(3);

  addText('Os dados são salvos automaticamente?', 3);
  addBullet('Sim, todos os dados são salvos na nuvem automaticamente', 8);
  addSpacer(3);

  addText('Funciona no celular?', 3);
  addBullet('Sim, o sistema funciona em qualquer dispositivo com navegador', 8);
  addSpacer(3);

  addText('Precisa instalar algum aplicativo?', 3);
  addBullet('Não, funciona direto no navegador de internet', 8);
  addSpacer(3);

  addText('E se eu esquecer minha senha?', 3);
  addBullet('Use a opção "Esqueci minha senha" na tela de login', 8);
  addBullet('Ou peça ao diretor para redefinir sua senha', 8);
  addSpacer(5);

  addDivider();

  addSubtitle('Suporte');
  addText('Em caso de dúvidas, entre em contato com a coordenação do CCA Irmã Agostina.');

  // Footer em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `CCA Chamada Digital — Manual do Sistema — Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    );
  }

  doc.save('Manual_CCA_Chamada_Digital.pdf');
}
