# Telier v2 — Naming & Contracts (PR de padronização incremental)

> Referências lidas e consideradas: `AGENTS.md`, `docs/redesign/masterplan.md` e `docs/redesign/redesign-audit.md`.
> Escopo deste PR: estabilizar nomenclatura de contratos com compatibilidade retroativa, sem redesign visual e sem mudança de fluxo.

## 1) Convenções adotadas

## 1.1 Entidades (domínio)

- Entidades em **snake_case** no banco e payload interno do worker.
- Recursos HTTP no **plural** e em português (padrão já existente): `/usuarios`, `/projetos`, `/tarefas`, `/tempo`.

## 1.2 Campos de payload e respostas da API

- API pública padronizada para:
  - `usuario_login` (canônico na borda da API)
  - `complexidade` (canônico para tarefa/template na borda da API)
- Campos legados permanecem como compatibilidade temporária:
  - `login` como alias de `usuario_login`
  - `dificuldade` como alias de `complexidade`

## 1.3 Parâmetros de rota

- Identificadores de rota permanecem no padrão atual por estabilidade:
  - `:id` na rota
  - sufixos de prefixo no valor (`usr_`, `prj_`, `tsk_`, etc.)
- Em documentação, usar nome semântico quando necessário (`:usuarioId`, `:projetoId`) sem alterar rota real nesta fase.

## 1.4 Frontend

- Frontend passa a enviar `complexidade` **e** `dificuldade` em criação/edição de tarefa para compatibilidade bidirecional durante migração.
- Frontend continua consumindo `complexidade` como campo principal de UI.

---

## 2) Mapeamento antigo -> canônico

| Contexto | Antigo | Canônico | Estratégia nesta fase |
|---|---|---|---|
| Usuário (input) | `login` | `usuario_login` | backend aceita ambos |
| Usuário (output) | `login` | `usuario_login` | backend devolve ambos |
| Tarefa/template (input) | `dificuldade` | `complexidade` | backend aceita ambos |
| Tarefa/template (output) | `dificuldade` | `complexidade` | backend devolve ambos |

---

## 3) Compatibilidades temporárias criadas

1. **Normalização de login no backend**
   - Worker passa a aceitar `usuario_login` ou `login` na entrada.
   - Respostas relevantes de usuário passam a incluir `usuario_login` e `login` sincronizados.

2. **Normalização de complexidade no backend**
   - Worker passa a aceitar `complexidade` e `dificuldade` para tarefa/template.
   - Respostas de tarefa/template passam a incluir `complexidade` e `dificuldade` alinhados.

3. **Compatibilidade no frontend para criação/edição de tarefa**
   - Frontend envia os dois campos (`complexidade` e `dificuldade`) temporariamente.

4. **Contrato crítico `/auth/foco-global` encapsulado**
   - Endpoint foi formalizado no backend para eliminar 404 silencioso já mapeado no audit.
   - Shape estabilizado com `tarefa_id`, `tarefa_nome`, `projeto_id`, `projeto_nome` (mantendo também aliases compatíveis).
   - Mantém comportamento de baixo risco (pode retornar `null` quando não há foco aplicável).
   - Frontend aplica normalização defensiva da resposta para evitar quebra se vier shape inesperado.

---

## 4) Pontos mantidos temporariamente por segurança

1. Banco continua com coluna física `dificuldade` (sem migração de schema nesta fase).
2. Rotas e parâmetros de URL não foram renomeados.
3. Estrutura monolítica de `src/index.html` e `src/worker.js` foi preservada (apenas ajustes pontuais de contrato).

---

## 5) Débitos remanescentes (próximos PRs)

1. Centralizar normalizadores de contrato em módulo dedicado após extração do backend.
2. Definir data de descontinuação dos aliases (`login`, `dificuldade`) com estratégia de rollout.
3. Revisar endpoints de listagem/admin para garantir consistência total de aliases em todos os recursos.
4. Criar testes automatizados de contrato (request/response) para evitar regressão de naming.

---

## 6) Trade-off desta fase

Optamos por **padronização com alias retrocompatível** em vez de corte brusco. Isso reduz risco operacional imediato, ao custo de manter campos duplicados temporariamente até as próximas fases de extração e limpeza.
