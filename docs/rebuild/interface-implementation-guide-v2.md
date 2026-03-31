# Telier — Guia de Implementação de Interface (v2)

## Objetivo
Traduzir o masterplan de interface em execução prática, sem abrir novos domínios funcionais e sem reabrir arquitetura central.

## Sequência recomendada desta rodada
A. Navegação e barra global
B. Tarefas
C. Projetos
D. Projeto e Grupo
E. Registros
F. Modais
G. Cor e microcopy
H. Administração
I. Login

## Regra operacional
- uma fase por vez
- melhoria perceptível, não só estrutural
- revisão obrigatória após cada fase
- não abrir escopo fora da fase

## Fase final obrigatória após esta rodada
Depois da consolidação de interface e da validação de paridade, executar:
- abandono do legado
- limpeza geral do código
- remoção de restos da migração

## O que revisar nesta etapa
O revisor deve sempre perguntar:
1. a melhoria ficou visível ao usuário?
2. a função da tela ficou mais clara?
3. a redundância diminuiu?
4. a hierarquia visual melhorou?
5. ainda há sinais fortes do sistema antigo?

## Registro de continuidade (30 de março de 2026)
- Risco ativo: `CollapsibleSection` passou a suportar modo controlado por `isOpen`, com impacto potencial em qualquer seção colapsável.
- Atenção obrigatória nas próximas fases: validar que telas que dependem só de `defaultOpen` continuam sem regressão de abertura/fechamento.
- Check mínimo por fase: revisar manualmente Projeto, Grupo e blocos colapsáveis de Tarefas após mudanças no primitive.
