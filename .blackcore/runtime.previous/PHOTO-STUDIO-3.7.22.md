# BLACKCORE Native 3.7.22 — acabamento e fundo de fotos

O editor de fotos ganhou um catálogo local de acabamentos reproduzíveis e duas operações reais de fundo. O processamento comum continua local com ImageMagick; nenhuma foto é enviada para a internet sem um backend remoto configurado e autorizado.

## Acabamentos

Use `photo_editor` com `action=list_effects` para consultar o catálogo. O `auto_edit` aceita `photoPreset`:

| Preset | Uso |
|---|---|
| `clean-natural` | correção discreta e natural |
| `cinematic-balanced` | contraste e cor cinematográfica equilibrados |
| `blackcore-dark` | pretos profundos e acabamento forte |
| `warm-vintage` | calor suave com aparência vintage |
| `social-pop` | cor e separação mais vivas para redes sociais |
| `mono-noir` | preto e branco de alto contraste |
| `studio-neutral` | produto, catálogo e retrato bem iluminado |

Os presets aplicam curvas, cor, ruído e detalhe com ImageMagick. Eles não fazem reconhecimento facial nem inventam textura; alterações em uma área específica continuam exigindo máscara, caixa, polígono ou segmentador real.

## Remoção e troca de fundo

Depois de instalar o componente opcional:

```bash
bash scripts/install-photo-ai.sh --mode rembg
```

O editor pode executar:

```json
{"action":"remove_background","input":"pessoa.jpg","output":"pessoa-sem-fundo.png"}
```

```json
{"action":"replace_background","input":"pessoa.jpg","backgroundInput":"praia.jpg","output":"pessoa-na-praia.jpg"}
```

O modelo padrão do BLACKCORE é `u2netp`, compacto para o telefone, com `-dc` para reduzir halo de cor nas bordas. Para trocar o modelo, use `BLACKCORE_REMBG_MODEL` ou `--model`; a instalação guarda a escolha em `~/.blackcore/photo-ai/rembg-model`. O modelo é baixado apenas no primeiro uso e fica fora do pacote principal.

`rembg` é MIT, mas cada peso de modelo possui sua própria licença. O BLACKCORE não seleciona automaticamente o modelo grande `bria-rmbg`, que pode ter restrição para uso comercial; escolha outro modelo conscientemente quando necessário.

## Garantias

- o original nunca é sobrescrito;
- remoção de fundo exige saída PNG/WebP transparente;
- troca de fundo exige uma segunda imagem fornecida pelo usuário;
- ausência do `rembg` gera instrução de instalação, sem simular resultado;
- o resultado passa por verificação de mudança mensurável;
- chaves e `~/.blackcore/config` ficam fora do pacote e não são alterados pelo instalador.
