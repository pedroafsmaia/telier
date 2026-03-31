# Telier — Pacote Operacional para Windsurf (v2)

## Regra principal
Esta rodada não deve reabrir arquitetura central. Ela deve traduzir a arquitetura já construída em experiência perceptível.

## Fases desta rodada
1. Navegação e contexto global
2. Tarefas como superfície operacional principal
3. Projetos como tela de localização
4. Diferenciação entre Projeto e Grupo
5. Rebaixamento visual dos registros
6. Redução de modais centrais
7. Cor funcional e microcopy
8. Administração e Login
9. **Abandono do legado e limpeza geral do código**

## Fase 9 — Abandono do legado e limpeza geral do código

### Objetivo
Encerrar a migração removendo completamente a casca de transição e qualquer resto do frontend antigo.

### Prompt-base para o Windsurf
```text
Você está executando a fase final do rebuild do Telier: abandono completo do legado e limpeza geral do código.

Fonte de verdade:
- AGENTS.md
- operational masterplan
- masterplan de interface e produto v2
- guia de implementação de interface v2
- pacote operacional do Windsurf
- pacote de revisão do Codex

Objetivo:
encerrar a migração sem deixar restos do legado, sem duplicação estrutural e sem dívida técnica de transição evitável.

Implemente exatamente:

1. remover rotas legadas já substituídas;
2. remover componentes legados sem uso real;
3. remover helpers, adapters, flags e wiring temporários de migração;
4. remover estilos, assets e arquivos mortos sem referência;
5. consolidar imports, aliases e caminhos finais;
6. remover comentários temporários, TODOs e marcadores de transição;
7. validar que a nova UI funciona sem dependência do legado;
8. preparar a base final como estrutura definitiva do produto.

Critérios de aceite:
- não há dependência do legado para fluxos principais;
- não há arquivos mortos relevantes ligados à migração;
- não há flags de transição sem necessidade;
- não há rotas antigas órfãs;
- a estrutura final ficou limpa e legível;
- o rebuild pode ser considerado encerrado sem restos estruturais do estado anterior.

Formato obrigatório da resposta final:
1. arquivos removidos;
2. arquivos consolidados/alterados;
3. o que foi limpo;
4. como foi garantido que o legado não ficou necessário;
5. validações rodadas;
6. riscos residuais reais, se existirem.
```

## Prompt de autoauditoria final para o Windsurf
```text
Faça uma autoauditoria crítica da fase final de abandono do legado.

Quero que você tente provar que ainda existem restos do estado anterior.

Entregue:
1. quais componentes, arquivos ou rotas podem ainda ser herança desnecessária;
2. quais flags, wiring ou helpers temporários podem ainda ter ficado;
3. quais riscos existem de o legado ainda estar acoplado silenciosamente;
4. o que ainda impediria chamar a base de definitiva e limpa.
```
