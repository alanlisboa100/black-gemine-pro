# BLACKCORE Engineering Loop

O runtime nativo usa um protocolo determinístico em volta do modelo para impedir que uma implementação termine cedo demais.

## Fluxo

- **Fast:** entender → responder.
- **Standard:** entender → inspecionar → executar → verificar → reparar se necessário → reportar.
- **Deep:** entender → inspecionar → planejar → executar → verificar → reparar se necessário → revisar → aceitação → reportar.

## Regras principais

1. Trabalho profundo que altera estado exige um plano curto no `todo` antes da primeira mutação.
2. Cada mutação bem-sucedida aumenta a revisão de trabalho. Verificação e revisão só valem para a revisão atual.
3. Uma verificação falha ativa um ciclo de reparo baseado na evidência real. O padrão é no máximo 3 ciclos por tarefa.
4. Depois de uma verificação verde, trabalho profundo revisa o diff/arquivos alterados. Qualquer correção feita nessa revisão invalida a verificação anterior.
5. A aceitação final compara o resultado com objetivo, restrições, sinais explícitos de conclusão e lista de tarefas.
6. Checkpoints de arquivos continuam reversíveis; rollback só acontece quando o usuário pede ou uma política explícita autoriza.
7. Limites de turnos, chamadas de ferramenta e tempo de parede impedem loops sem fim.

## Configuração

```json
{
  "maxAgentTurns": 48,
  "maxAgentToolCalls": 250,
  "maxAgentWallMs": 1800000,
  "agentRepairCycles": 3
}
```

`agentRepairCycles` aceita de 0 a 6.
