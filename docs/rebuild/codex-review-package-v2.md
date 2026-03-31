# Telier — Pacote Operacional para Codex (v2)

## Papel do Codex
Revisar se a nova arquitetura finalmente se traduziu em experiência perceptível e, ao final, revisar se o legado foi completamente abandonado e a base limpa.

## Regra principal
O Codex deve avaliar não só se o código mudou, mas se:
- a função da tela ficou mais clara;
- a hierarquia visual melhorou;
- a redundância caiu;
- a navegação ficou mais limpa;
- ainda há semelhança indevida com o estado anterior;
- ainda restam cascas de migração ou legado no fim.

## Revisão final obrigatória — abandono do legado e limpeza

### O que o Codex deve revisar
- se o legado foi realmente removido;
- se rotas antigas foram eliminadas;
- se componentes legados mortos ainda existem;
- se helpers/adapters temporários de transição ainda restam;
- se flags de migração ainda estão presentes sem necessidade;
- se há wiring morto entre app nova e antiga;
- se a estrutura final do frontend está limpa;
- se ainda há sinais de “migração em aberto” no código.

### Prompt final para o Codex
```text
Faça uma revisão técnica e de aderência da fase final de abandono do legado e limpeza geral do código do Telier.

Seu papel é revisar, não reimplementar.

Regras:
- compare a implementação com AGENTS.md;
- compare a implementação com o operational masterplan;
- compare a implementação com os documentos de interface v2;
- aponte somente problemas reais, concretos e verificáveis;
- não elogie genericamente;
- não considere a migração concluída se ainda houver restos estruturais do legado;
- procure especialmente por rotas antigas, componentes mortos, flags de transição, wiring temporário, helpers duplicados, estilos mortos, comentários temporários e qualquer dependência residual da UI antiga.

Entregue a revisão neste formato:
1. veredito geral: APROVADA ou NÃO APROVADA;
2. o legado foi realmente abandonado? explique;
3. itens limpos corretamente;
4. restos concretos ainda encontrados;
5. riscos técnicos;
6. correções mínimas necessárias para aprovação final.

Se ainda houver qualquer resto estrutural relevante da migração, diga explicitamente que o rebuild não deve ser considerado encerrado.
```
