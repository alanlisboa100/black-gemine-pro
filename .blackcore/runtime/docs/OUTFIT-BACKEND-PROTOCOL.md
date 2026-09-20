# BLACKCORE Outfit Backend Protocol v1

This is a small interoperability contract for a GPU service that runs photo and/or video virtual try-on. BLACKCORE ships the client, not third-party model code or weights.

## Health

`GET /health`

```json
{
  "ready": true,
  "backend": "swifttry",
  "capabilities": ["image", "video", "temporal-consistency", "auto-mask"]
}
```

## Submit video

`POST /v1/outfit/video` using `multipart/form-data`:

- `person_video`: required video file.
- `garment_image`: required garment reference image.
- `mask`: optional clothing mask image or video.
- `backend`: `swifttry`, `catv2ton` or `generic`.
- `category`: `upper_body`, `lower_body`, `dress` or `full_body`.
- `garment_description`: optional plain text.
- `resolution`: `720p`, `1080p` or `2k`.
- `quality`: `draft`, `medium` or `high`.
- `seed`: optional integer.
- `preserve_audio`: always `true`; BLACKCORE restores source audio locally.
- `preserve_identity`, `preserve_background`: boolean strings.
- `temporal_consistency`: `high`.
- `safety_mode`: always `clothed-only`.

The response may be `video/mp4` directly, or JSON:

```json
{
  "job_id": "job_123",
  "status": "queued",
  "status_url": "/v1/outfit/jobs/job_123"
}
```

## Submit photo

`POST /v1/outfit/image` using `multipart/form-data`:

- `person_image`: required person photo.
- `garment_image`: required garment reference image.
- `mask_image`: optional clothing-only image mask.
- `backend`: `swifttry`, `catv2ton`, `catvton` or `generic`.
- `category`: `upper_body`, `lower_body`, `dress` or `full_body`.
- `garment_description`: optional plain text.
- `quality`: `draft`, `medium` or `high`.
- `output_format`: `jpg`, `jpeg`, `png` or `webp`.
- `seed`: optional integer.
- `preserve_identity`, `preserve_background`, `preserve_composition`: boolean strings.
- `identity_lock`: `high`.
- `safety_mode`: always `clothed-only`.

The response may be an image directly, or use the same asynchronous job envelope. A completed photo job may return `result_url`, `output_url` or `image_url`. The generated image must keep the source composition and aspect ratio. BLACKCORE normalizes it back to the exact source dimensions and rejects a result whose normalized pixels remain materially unchanged.

## Poll

`GET /v1/outfit/jobs/{job_id}`

Running:

```json
{"job_id":"job_123","status":"running","progress":58}
```

Complete video:

```json
{"job_id":"job_123","status":"completed","result_url":"/v1/outfit/jobs/job_123/result.mp4"}
```

Complete photo:

```json
{"job_id":"job_456","status":"completed","image_url":"/v1/outfit/jobs/job_456/result.png"}
```

Failed:

```json
{"job_id":"job_123","status":"failed","error":"bounded public-safe message"}
```

The result must preserve frame order, speed and duration. It should contain only the generated picture; BLACKCORE remuxes the untouched source soundtrack and performs the final phone export. Redirects are intentionally rejected. Authentication is optional bearer-token authentication loaded from a named BLACKCORE secret.

`status_url` must stay on the configured backend origin. A cross-origin signed `result_url` is supported, but BLACKCORE deliberately removes the backend authorization header before downloading it.

## Backend adapter guidance

- Prefer a permissively licensed base such as [SwiftTry](https://github.com/VinAIResearch/SwiftTry) when distributing an adapter.
- [CatV2TON](https://github.com/Zheng-Chong/CatV2TON) is a useful architecture reference, but verify its current code/weight terms before redistribution.
- Never log uploaded media, bearer tokens or signed result URLs.
- Delete temporary uploads/results according to an explicit retention policy.
- Enforce clothed-only output on the server as well as in the client.
