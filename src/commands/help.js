import {VERSION} from "../config/defaults.js";

export const HELP=`BLACKCORE Native ${VERSION} — natural conversation

You do not need to memorize commands. Speak naturally in Portuguese, English,
or another language. BLACKCORE keeps your input unchanged; it never translates
paths, identifiers, source code, quoted text, or task details automatically.

Examples:
  "analyze this entire project and fix every real error"
  "usa o OpenAI Terra no xhigh e corrige esse projeto"
  "use Luna for a fast implementation, then run the tests"
  "only review it; do not change files"
  "now apply the safe fixes"
  "undo the last change"
  "create a website, test the build and prepare Vercel"
  "run the Netlify dry-run and fix errors"
  "check Supabase and test the Edge Functions"
  "verify the Resend domain without sending email"
  "create an interactive game and validate mouse, touch and keyboard controls"
  "use Sol at max reasoning for this architecture review"
  "reply in Portuguese"
  "review @screenshot.png and fix the responsive layout"
  "faça uma auditoria completa, rode os gates e salve o Markdown em Downloads"

BLACKCORE chooses when to inspect files, edit, test, use Git/GitHub, browser
verification, Vercel, Netlify, Supabase, Resend, Expo/EAS, MCP and other tools.
It asks for confirmation only when the safety policy requires it.

GOOGLE MULTI-KEY
  blackcore login google 1    primary Google key (GEMINI_API_KEY)
  blackcore login google 2    second Google key
  blackcore login google 3    third Google key
  blackcore login google 4    fourth Google key
  blackcore login google 5    fifth Google key
  blackcore login google 6    sixth Google key
  blackcore login google 7    seventh Google key
  blackcore login google 8    eighth Google key
  blackcore logout google 2   remove one slot without touching the others

OPTIONAL POWER-USER SHORTCUTS
  /             open the command palette
  /status       compact panel: model, tools and safe API-key state
  /work         show adaptive work protocol; fast|standard|deep overrides it
  /review        compact Git diff review; add full for patch preview
  /review staged  review only the staged patch
  /worktree      list isolated Git workspaces
  /worktree create <branch> [path]
  /worktree remove <path> [--force]
  /models       provider → model → reasoning
  /language     show/set response language: auto|en|pt-BR
  /doctor       environment diagnostic
  /budget       show/set shared task token/cost budget
  /memory-history  show automatic project history
  /graph        show the current dependency task graph
  /resume-task   resume an interrupted agent task/checkpoint
  /undo         undo last task checkpoint
  /redo         redo the most recently undone task checkpoint
  /help         this screen
  /quit         exit
  !command      run shell and include output in the conversation

Legacy advanced commands remain available, but normal conversation is enough.`;
