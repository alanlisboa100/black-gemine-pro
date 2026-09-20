# Photo segmentation protocol

Selective photo editing always supports a local manual mask. Automatic semantic selection is optional and may be provided by a local or remote service.

Installation paths and phone/GPU requirements are documented in [PHOTO-AI-INSTALLATION.md](PHOTO-AI-INSTALLATION.md). The provided Grounded SAM 2 installer installs the upstream model stack on NVIDIA Linux; it does not claim to be an HTTP server. A compatible adapter must implement this contract.

## Configuration

Set the endpoint as a tool argument or named secret:

```text
BLACKCORE_PHOTO_SEGMENT_ENDPOINT=http://127.0.0.1:9000/
BLACKCORE_PHOTO_SEGMENT_TOKEN=optional-bearer-token
```

The endpoint receives `POST /v1/photo/mask` as `multipart/form-data` with these fields:

| Field | Meaning |
|---|---|
| `image` | source image file |
| `scope` | `subject`, `background`, `detail` or `mask` |
| `region_prompt` | requested semantic detail, empty for general scopes |
| `region_target` | normalized target such as `eyes`, `window`, `water` or `custom` |
| `region_boxes` | JSON array of normalized point/box prompts; useful for MobileSAM refinement |
| `region_polygons` | JSON array of normalized polygon prompts |
| `output` | always `grayscale-mask` |
| `white_means` | always `edit-selected-region` |

Return HTTP 200 with an image response (`image/png` recommended). The returned mask can have any image dimensions; BLACKCORE auto-orients and resizes it to the oriented source dimensions. White pixels select the edited region and black pixels preserve the original.

## Privacy and safety

- Loopback endpoints are treated as local but still pass the private-network permission check.
- A non-loopback endpoint requires `allowRemote=true` because the source image leaves the phone.
- The safe permission profile blocks remote segmentation.
- Balanced profiles ask for upload confirmation.
- Bearer credentials come only from named environment/config secrets and are never returned in the edit report.
- Redirects are disabled and mask downloads are capped at 30 MB.

## Local alternatives

For `subject` and `background`, BLACKCORE first looks for meaningful source alpha and then for an installed `rembg` command. A supplied mask always takes priority. `detail` requires either a supplied mask or the semantic endpoint; it is never guessed from global color alone. MobileSAM-compatible services may refine supplied boxes/polygons, but named text needs a detector capable of grounding that phrase.

On Termux, install the optional isolated CPU path from the release directory:

```bash
bash scripts/install-photo-ai.sh --mode rembg
```

## Acceptance gate

The composite is accepted only when sampled pixel measurements show sufficient change within the mask, a non-trivial changed fraction inside it and negligible change outside it. This gate runs before crop, text and watermark overlays so those global operations cannot fake a successful regional edit.
