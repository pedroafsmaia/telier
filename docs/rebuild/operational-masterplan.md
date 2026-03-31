# Telier — Operational Masterplan de Rebuild do Frontend

## Objetivo
Reconstruir o frontend do Telier de forma controlada, previsível e completa, preservando o backend quando possível, reaproveitando a identidade visual existente e eliminando integralmente o legado ao final.

## Estratégia
- Criar frontend-v2 separado do legado
- Migrar por fases
- Validar paridade
- Abandonar o legado
- Limpar o código geral antes de encerrar

## Fases macro
0. Congelamento, mapeamento e preparação
1. Fundação visual e técnica
2. Camada de dados e adapters
3. Tarefas
4. Drawer e tempo
5. Projeto
6. Grupo
7. Índice de Projetos
8. Índice de Grupos
9. Administração mínima
10. Formulários estruturados
11. Migração controlada e paridade
12. **Abandono do legado e limpeza geral do código**

## Fase 12 — Abandono do legado e limpeza geral do código

### Objetivo
Encerrar o rebuild de forma definitiva, sem deixar restos do frontend antigo, sem duplicações desnecessárias e sem dívida técnica residual evitável.

### Escopo obrigatório
- remover rotas legadas substituídas;
- remover componentes legados sem uso;
- remover helpers, adapters e normalizadores temporários que só existiam para a transição;
- remover feature flags de migração que não sejam mais necessárias;
- remover estilos, tokens, partials e assets legados sem referência;
- remover wiring morto entre app nova e app antiga;
- consolidar imports, aliases e caminhos finais;
- revisar nomes finais de arquivos e diretórios para refletir a base definitiva;
- rodar busca por código morto, TODOs e comentários temporários;
- padronizar comentários úteis e remover comentários de implementação provisória;
- validar que não resta nenhum acoplamento obrigatório à UI antiga.

### O que é proibido
- manter código legado “por segurança” sem justificativa;
- deixar feature flag permanente sem plano de remoção;
- manter duplicação de componente por preguiça de consolidação;
- encerrar a migração com diretórios mortos, estilos mortos ou rotas órfãs.

### Critérios de aceite
A fase só termina quando:
- a nova UI funciona sem dependência do legado;
- não há rotas antigas ainda servindo fluxo principal;
- não há componentes legados sem uso real;
- não há wiring temporário sem necessidade;
- a estrutura final do frontend está limpa e legível;
- a base está pronta para manutenção contínua sem “casca” de migração.

## Regra final
O rebuild não termina na paridade visual/funcional. Ele só termina quando a base final estiver limpa, consolidada e sem restos estruturais do legado.
