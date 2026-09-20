# BLACKCORE Studio 3.4

Aplicativo web instalável e offline-first para organizar código, resumos e pesquisa. Ele funciona sem conta e sem build. A integração Supabase é opcional e adiciona autenticação e sincronização entre dispositivos.

## Abrir localmente

Na pasta `examples/blackcore-studio`:

```bash
python3 -m http.server 4173
```

Abra `http://127.0.0.1:4173`. Usar um servidor HTTP habilita o service worker; abrir `index.html` diretamente ainda permite a interface, mas não a instalação PWA.

## Supabase local

Requisitos: Node.js 20+, Supabase CLI e um runtime Docker compatível. A stack completa é pesada; a documentação oficial recomenda cerca de 7 GB de RAM.

```bash
npm install --save-dev supabase@2.113.0
npx supabase start
npx supabase db reset
npx supabase status
```

Copie a `API URL` e a chave `Publishable` mostradas pelo status. No Studio, abra **Supabase → Configurar conexão**, informe os dois valores e crie uma conta. Nunca coloque `service_role`, segredo JWT ou senha do banco no navegador.

O banco inclui:

- tabela `workspace_items`;
- tipos `code`, `summary` e `research`;
- índices por usuário/tipo/data;
- RLS forçada com políticas de select/insert/update/delete por `auth.uid()`;
- trigger de `updated_at`;
- Edge Function autenticada `research-digest`.

## Projeto remoto

As operações abaixo alteram o projeto remoto. Revise a migration e confirme o alvo antes de executá-las.

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db lint --linked
npx supabase db push --dry-run
npx supabase db push
npx supabase functions deploy research-digest
```

O BLACKCORE 3.4 também expõe essas operações por ações estruturadas, com confirmação para `db push`, deploy de Function, secrets e reset do banco.

## Segurança e privacidade

- itens ficam em `localStorage` até você pedir conexão;
- senha nunca é persistida;
- access token fica em `sessionStorage` e some ao fechar a aba;
- a chave publicável/anon pode existir no cliente; a proteção de dados vem da RLS;
- conteúdo criado pelo usuário entra no DOM por `textContent`, não por HTML;
- sync remoto só ocorre depois de login e ação explícita.

## Limitações

- O Studio organiza e sincroniza conteúdo; ele não executa código nem substitui um IDE.
- Conflitos são resolvidos pelo `updated_at` mais recente. Edição colaborativa em tempo real exigiria um protocolo próprio.
- A busca web do agente usa resultados de descoberta. O modelo ainda precisa abrir e comparar fontes antes de produzir uma conclusão.
- APK assinado, publicação e teste em aparelho pertencem ao fixture `creative-lab-mobile` e exigem EAS ou toolchain Android.

Referências: [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), [fluxo local](https://supabase.com/docs/guides/local-development/cli-workflows) e [CLI reference](https://supabase.com/docs/reference/cli).
