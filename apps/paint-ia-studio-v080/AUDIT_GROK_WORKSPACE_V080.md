# BLACK PAINT STUDIO v0.8.0 — Auditoria da revisão externa

## Resumo executivo

O arquivo `grok-workspace.zip` foi auditado junto com o pacote v0.7.0 original. A conclusão principal é objetiva:

1. O ZIP v0.7.0 anexado dentro do workspace externo é **byte a byte o mesmo pacote** que havia sido entregue antes. SHA-256 em ambos: `7644331a1286addfa3010f7d5ac39bf7ec184f4cf9e12ec028e4b7d14463d354`.
2. A outra IA não alterou o core Python/Node do v0.7.0; ela criou uma aplicação web paralela em TanStack/React/Vercel e um fluxo opcional de geração em nuvem usando xAI.
3. Há boas ideias arquiteturais nessa aplicação externa, especialmente separação Director/Imagine/Critic, identity lock, presets, galeria/memória de UI e separação entre score técnico e estrutural.
4. Essas ideias foram reaproveitadas no core local **sem tornar xAI ou qualquer API externa obrigatória**.
5. Uma nova auditoria do nosso v0.7 revelou um problema crítico não detectado antes: os checkpoints usavam telemetry estrutural com vários valores otimistas fixos. Portanto o checkpoint parecia “real”, mas parte do score ainda era sintético. Isso foi removido na v0.8.

## O que foi encontrado no workspace externo

### Fluxo de IA em nuvem

`src/lib/ai/studio.ts` contém:

- DirectorAgent via modelo `grok-4.5`;
- geração/edição via `grok-imagine-image-2.0`;
- CriticVision com `technicalScore` e `structuralScore` separados;
- instrução explícita para não conceder 98–100 de identidade apenas por contraste;
- JSON de planejamento com prompt, modo, mood, framing, negatives, checkpoints, character profile e seed.

Isso é útil como referência de arquitetura, mas depende de API e consumo externo. O objetivo do BLACK PAINT STUDIO local é continuar útil sem esse requisito.

### Presets e identity lock

`src/lib/paint/presets.ts` possui presets e uma `MISUKI_BIBLE` com identidade e negativos. Essa ideia foi mantida, mas o core v0.8 usa memória runtime real e regras carregadas pelo motor, em vez de só injetar texto num prompt de nuvem.

### Memória

`src/lib/paint/memory.ts` registra dados em localStorage. É útil para UX, mas não ensina anatomia nem corrige a construção da personagem. O v0.8 continua usando memória auditável no core local e adiciona memória canônica operacional da Misuki.

### Testes do workspace externo

O comando de testes do workspace externo executou 195 testes:

- 187 passaram;
- 8 falharam.

As falhas observadas ficam no plugin de metadata/PWA/OG (`grok-pwa-plugin.test.mjs`), incluindo testes de `og:title`, `og:image`, injeção sem `<head>` e `apple-mobile-web-app-title`. Não são falhas do nosso core de desenho, mas significa que o workspace externo não estava 100% verde.

## Falhas críticas encontradas no v0.7.0

### 1. Telemetry estrutural parcialmente hardcoded

No v0.7, o `MisukiCheckpointBuilder` inicializava métricas como integração de chifre, taper, flatness, eye ratio, torso rectangularity e outras com valores otimistas. O StageCritic consumia esses números e podia aprovar uma estrutura sem medi-los de verdade no que foi executado.

**Correção v0.8:** telemetry agora é preenchida a partir da geometria realmente construída e, onde possível, de checagens dos pixels renderizados. O campo `telemetry_source` informa explicitamente `executed_geometry_and_pixel_checks`.

### 2. Checkpoints checavam coisas antes de elas existirem

Exemplos do v0.7:

- P02 podia avaliar volume/taper do chifre antes do volume do chifre ser construído;
- P03 podia avaliar franja antes da franja existir.

**Correção v0.8:** regras do StageCritic foram reordenadas para validar cada atributo apenas depois do estágio que o constrói.

### 3. “Programa do Paint” era grosso demais

O plano anterior dizia o que fazer por fase, mas não detalhava operações suficientes.

**Correção v0.8:** `BLACKCORE_MISUKI_PAINT_PROGRAM v4` contém 51 operações pequenas para a personagem, mais 12–14 operações S01–S08 para o cenário. O plano completo chega a 63–65 ações, com ferramenta, ação, geometria normalizada, stroke, instrução, validação, dependência e retry.

### 4. Não havia cenários bonitos de verdade no runtime

O EnvironmentBuilder antigo era praticamente um único tipo de paisagem procedural.

**Correção v0.8:** sistema de cenários com 10 perfis e pipeline S01–S08 de composição, profundidade, luz, props, atmosfera, foreground e scene gate.

### 5. Falha estrutural não interrompia realmente o fluxo

No v0.7 o sistema registrava checkpoints, mas ainda podia continuar desenhando etapas posteriores.

**Correção v0.8:** falha estrutural crítica gera hard stop, devolve render parcial de diagnóstico, marca `blocked_at`, bloqueia P14 e exige repair/retry antes de continuar. A exportação aprovada só acontece depois do gate.

## O que a v0.8 incorporou da revisão externa

### Adotado

- Director mais rico para interpretar pedido + cenário;
- character identity lock;
- negatives explícitos;
- separação score técnico x score estrutural;
- ideia de checkpoints como contrato de execução;
- controles de cenário na interface;
- memória compacta + documentação longa separadas;
- cenário como parte da composição, não apenas decoração.

### Adaptado

- Em vez de depender de Grok Imagine, o v0.8 mantém o builder procedural local e produz plano de execução detalhado.
- Em vez de checkpoints apenas descritos em prompt, o v0.8 os executa no runtime e pode bloquear avanço/exportação.
- Em vez de localStorage ser “aprendizado de personagem”, o core usa memória canônica carregada pelo runtime.

### Não adotado

- dependência obrigatória de `XAI_API_KEY`;
- geração principal em nuvem;
- score visual sem referência canônica real;
- seed tratada como garantia de determinismo de um serviço remoto;
- bloat do template web que não melhora o motor local.

## Sistema de cenários v0.8

Perfis incluídos:

1. Minimal Studio
2. Gothic Bedroom
3. Moonlit Cathedral
4. Cyber Rain City
5. Occult Library
6. Dark Rose Garden
7. Throne Chamber
8. Neon Lab
9. Moon Balcony
10. Forest Shrine

Cada perfil define:

- mood;
- composição;
- câmera;
- luz;
- paleta;
- planos de profundidade;
- props;
- foreground;
- atmosfera;
- elementos proibidos;
- clearance da personagem.

O scene gate exige que:

- rosto seja o primeiro ponto focal;
- chifres permaneçam legíveis;
- detalhe/contraste atrás do rosto seja reduzido;
- exista separação de profundidade;
- a luz tenha direção coerente;
- props não atravessem rosto/chifres.

## Limitação importante — sem maquiagem técnica

A v0.8 continua sendo um renderizador local procedural usando Pillow/Canvas. Ela **não virou um modelo neural de imagem**. Portanto:

- ela ganhou arquitetura de execução muito melhor;
- consegue produzir cenas e regras muito mais organizadas;
- possui checkpoints e score mais honestos;
- mas não possui ainda percepção semântica profunda equivalente a um modelo visual treinado.

O `structural_fidelity` é explicitamente um `structural_geometry_proxy` e continua limitado a 90. `reference_similarity` permanece `null` até existir um modelo visual realmente capaz de comparar o render com a referência canônica.

## Recomendação de próxima fase

A próxima evolução de maior impacto não é adicionar mais prompts. É conectar um avaliador visual real ou um pequeno modelo de visão local que compare:

- referência canônica;
- checkpoint atual;
- diferença de silhueta/rosto/cabelo/chifres;
- mapa de correção.

Até isso existir, o v0.8 deve continuar tratando scores estruturais como proxies, não como prova de identidade perfeita.
