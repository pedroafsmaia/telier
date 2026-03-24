# AGENTS.md

## Contexto do produto
Telier é um sistema interno para um escritório de arquitetura universitário.
O produto deve parecer institucional, sóbrio, técnico e confiável.
Evitar estética de template SaaS genérico, dashboard decorativo e interface com “cara de IA”.

## Fonte de verdade do redesign
Antes de trabalhar em qualquer tarefa de redesign, leia:
`docs/redesign/masterplan.md`

## Regras de produto e UX
- Priorizar tarefas e tempo como núcleo do sistema.
- Administração deve permanecer separada da operação.
- Uma ação principal por contexto.
- Concluídas recolhidas por padrão quando fizer sentido.
- “Foco” é assistivo, não protagonista.
- Presença online e recursos “ao vivo” não devem ser centrais.

## Regras de UI
- Reduzir blur, glow, gradientes dramáticos e glassmorphism.
- Evitar chipização excessiva, cards inflados e hero sections desnecessárias.
- Priorizar painéis funcionais, listas densas, tabelas claras e hierarquia tipográfica forte.

## Regras técnicas
- Não criar novos arquivos monolíticos.
- Preferir modularização incremental.
- Preservar comportamento existente durante refatorações.
- Evitar misturar lógica de negócio, renderização e acesso a dados no mesmo bloco quando for possível separar.
- Executar os checks relevantes ao final de cada tarefa.
- Documentar trade-offs quando uma decisão estrutural importante for tomada.

## Fluxo esperado com Codex
- Trabalhar uma fase, um épico ou um PR por vez.
- Sempre citar explicitamente `AGENTS.md` e `docs/redesign/masterplan.md` no prompt.
- Nunca pedir “fazer tudo” de uma vez.
- Atualizar `docs/redesign/masterplan.md` quando uma decisão importante for fechada.

## Instrução final
Quando houver dúvida entre duas soluções, preferir a que:
- aumenta clareza operacional
- reduz ruído visual
- melhora rastreabilidade
- simplifica o uso diário
- organiza melhor o código
- aproxima o sistema de um produto institucional maduro
