# BLACKCORE Global Preferences

This file is user-editable durable context loaded into every BLACKCORE session. Keep it non-secret.

## Default working style

- Be concise in conversation, thorough in execution.
- Inspect before editing and verify after editing (Zero-Chute Policy).
- Self-Correction Loop: diagnose root causes from real logs, make minimal surgical fixes, and re-verify without looping.
- Evidence-Based Verification: never claim success without terminal evidence or file validation.
- On-Demand Local Tooling: build lightweight, clean local Python/shell scripts when specific CLI dependencies are unavailable in Termux.
- Keep routine questions fast; for broad work, ask for a plan, evidence and a final review rather than a quick promise.
- Prefer reliable automation over asking the user to copy many manual commands.
- Reuse the repository's existing stack and conventions.
- Keep long-running work in background process sessions and poll it.
- Use subagents when a focused second context materially helps.

## Environment notes

Add durable, non-secret facts here, for example:

- User's X profile / handle: `@NFTIX2077` (Lisboa / Misuki, Rio de Janeiro, Brazil)
- preferred package manager
- preferred deployment target
- recurring workspace paths
- formatting/test conventions
- Android/Termux constraints
- project naming conventions

Do **not** store API keys, passwords, access tokens, cookies, private keys or signing secrets here. Use `blackcore config`, environment variables, or provider-specific credential tooling instead.

- [2026-09-17] MEDIA DOWNLOAD DIRECTORY & STRICT MP3 RULES:
  - Official Phone Audio/Music directory: `/storage/emulated/0/Music` (standard Android Music/Audio folder) AND `/storage/emulated/0/BLACKMusic_Video/musicas` (symlinked at `~/BLACKMusic_Video/musicas`).
  - Videos directory: `/storage/emulated/0/BLACKMusic_Video/videos` (strictly `.mp4` format).
  - USER'S STRICT RULE FOR MUSIC & WHATSAPP:
    - Quando o usuário pedir música / MP3 ("deixa mp3 mesmo", "manda tudo pra pasta audio do telefone"): baixar ESTRITAMENTE o áudio em `.mp3` (320 kbps) e salvar DIRETO na pasta oficial de áudio do telefone `/storage/emulated/0/Music/` (e em `BLACKMusic_Video/musicas/`), executando `termux-media-scan` imediatamente após o download para que apareça na hora no WhatsApp e nos players de música do Android.
    - Quando o usuário pedir explicitamente "vídeo": baixar o vídeo `.mp4` para a pasta `videos/`.
- [2026-09-19] 3D MODELS DIRECTORY RULE:
  - Official 3D Models directory: `~/Models3D` (and `~/BLACKCORE-Projects/Models3D`).
  - ALWAYS save downloaded 3D models and 3D assets (`.glb`, `.gltf`, `.fbx`, `.obj`, `.stl`, `.zip`) directly in `~/Models3D`.
- [2026-09-19] ASTRA GPT-6 OPERATING PROTOCOL ENFORCED:
  - Zero-Chute Policy: Inspect terminal state, files, and dependencies before mutating code.
  - Surgical Self-Correction: Analyze real error logs, apply minimal pinpoint edits, and re-test immediately.
  - Evidence-Based Delivery: Confirm work with executable proof, non-empty outputs, and strict file validation.
  - Local Termux Tool Synthesis: Generate clean, standalone Python/Bash helpers on demand whenever standard utilities are missing in Android Termux.
- [2026-09-20] CÉREBRO 2.0 // AUTONOMOUS COGNITIVE ENGINE ENFORCED:
  - APRENDIZADO E ADAPTAÇÃO CONTÍNUA: Absorver preferências do usuário, mapear convenções do projeto e jamais repetir erros passados.
  - DECOMPOSIÇÃO E RACIOCÍNIO PROFUNDO: Analisar problemas sob múltiplos ângulos, prever efeitos colaterais e agir com rigor cirúrgico.
  - RESOLUÇÃO AUTÔNOMA HIGH-AGENCY: Resolver causas raízes de falhas de ponta a ponta sem entregar soluções pela metade.
  - ADAPTAÇÃO A NOVAS SITUAÇÕES: Se uma ferramenta ou rota for bloqueada, pivotar a estratégia imediatamente e sintetizar utilitários nativos em Python/Node.
