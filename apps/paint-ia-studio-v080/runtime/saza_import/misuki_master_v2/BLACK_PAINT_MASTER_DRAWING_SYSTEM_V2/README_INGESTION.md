# BLACK PAINT MASTER DRAWING SYSTEM V2

Este pacote foi feito para ingestao por IA/runtime.

Arquivos principais:
- MASTER_DRAWING_SYSTEM_V2.pdf: manual visual e operacional completo.
- MASTER_SPEC_V2.json: especificacao de maquina.
- RUNTIME_MEMORY_V2.txt: memoria curta para contexto permanente.
- TRAINING_CURRICULUM_V2.md: exercicios e ordem de aprendizado.
- visual_plates/: folhas visuais de construcao e falhas.
- references/: referencia canonica e resultados procedurais atuais.

Ingestao recomendada:
1. Coloque RUNTIME_MEMORY_V2.txt na memoria permanente.
2. Indexe PDF + JSON + visual_plates no RAG/visual library.
3. Execute uma etapa por vez e salve checkpoint.
4. Nao permita avancar se um checkpoint estrutural falhar.
5. Use as imagens atuais como negative examples, nao como target.
