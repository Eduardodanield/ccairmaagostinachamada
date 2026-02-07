

# Plano para Resolver Tela Branca

## Resumo do Problema
A aplicacao mostra uma tela completamente branca antes mesmo de chegar na tela de login. No meu ambiente de teste, a aplicacao funciona corretamente (redireciona para `/login` quando nao ha usuario logado), indicando que o problema pode estar relacionado a:
1. Cache/sessao corrompida no seu navegador
2. Erro silencioso que nao aparece nos logs
3. Estado inconsistente do AuthContext

## Diagnostico Realizado
- **Banco de dados OK**: Seu usuario `edwardpf02@gmail.com` tem role `director` corretamente atribuido
- **Codigo parece correto**: `AuthContext.tsx` usa `maybeSingle()` para evitar erros 406
- **Teste funcionando**: No browser de teste, a aplicacao carrega e redireciona para login

---

## Solucao Proposta

### Passo 1: Adicionar Tratamento de Erro Global
Adicionar um handler de erro nao tratado no `App.tsx` para capturar qualquer erro silencioso que esteja causando a tela branca.

```typescript
// Em App.tsx - adicionar useEffect para capturar erros
useEffect(() => {
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error("Unhandled rejection:", event.reason);
    event.preventDefault();
  };
  window.addEventListener("unhandledrejection", handleRejection);
  return () => window.removeEventListener("unhandledrejection", handleRejection);
}, []);
```

### Passo 2: Adicionar Error Boundary
Criar um Error Boundary para capturar erros de renderizacao e mostrar uma mensagem util em vez de tela branca.

**Novo arquivo**: `src/components/ErrorBoundary.tsx`

### Passo 3: Melhorar Tratamento de Erro no AuthContext
Adicionar try/catch mais robusto no `fetchUserData` e garantir que `isLoading` seja sempre definido como `false` mesmo em caso de erro.

### Passo 4: Adicionar Logging Temporario
Adicionar console.logs estrategicos para entender onde o fluxo esta travando.

---

## Detalhes Tecnicos

### Arquivos a Modificar

1. **`src/App.tsx`**
   - Adicionar handler global para unhandled promise rejections
   - Envolver AppRoutes com ErrorBoundary

2. **`src/components/ErrorBoundary.tsx`** (novo)
   - Criar componente ErrorBoundary que mostra mensagem de erro + botao para limpar cache e recarregar

3. **`src/contexts/AuthContext.tsx`**
   - Melhorar tratamento de erro no `fetchUserData`
   - Garantir que `setIsLoading(false)` sempre execute

### Fluxo Apos Implementacao

```text
Usuario acessa "/"
       |
       v
  App.tsx carrega
       |
       v
  ErrorBoundary envolve tudo
       |
       v
  AuthProvider inicializa
       |
       +-- Se erro --> ErrorBoundary captura e mostra mensagem
       |
       +-- Se OK --> isLoading=true mostra skeleton
       |
       v
  getSession() executa
       |
       +-- Se nao tem sessao --> isLoading=false, redireciona /login
       |
       +-- Se tem sessao --> fetchUserData()
       |
       v
  Mostra dashboard ou login
```

---

## Acao Imediata (Voce Pode Fazer Agora)

Antes de eu implementar o codigo, tente isso:

1. **Limpar cache do navegador**:
   - Chrome: `Ctrl + Shift + Delete` -> selecione "Cookies" e "Cache" -> Limpar dados
   
2. **Abrir em aba anonima**:
   - `Ctrl + Shift + N` no Chrome
   - Acesse o site novamente

3. **Verificar console do navegador**:
   - `F12` -> aba "Console"
   - Veja se aparece algum erro vermelho

Se ainda aparecer tela branca apos essas tentativas, aprove este plano para eu implementar o Error Boundary e melhorar o tratamento de erros.

