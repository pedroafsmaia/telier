# Domínio organizacional (campus e unidade) — preparação Fase 0

Objetivo: reservar o ponto de entrada do domínio institucional sem alterar comportamento atual.

## Vocabulário alvo

- `campus`: contexto institucional maior (ex.: campus universitário)
- `unidade`: entidade operacional vinculada ao campus (faculdade, hospital, clínica etc.)

## Planejamento para fases seguintes

1. Introduzir entidades persistentes de campus/unidade.
2. Associar projetos a `unidade_id` (e unidade a `campus_id`).
3. Evoluir filtros, relatórios e permissões para recorte institucional.
4. Manter compatibilidade retroativa durante migração.

## Fora do escopo da Fase 0

- sem alterações no banco
- sem alterações de endpoint
- sem mudanças visuais
