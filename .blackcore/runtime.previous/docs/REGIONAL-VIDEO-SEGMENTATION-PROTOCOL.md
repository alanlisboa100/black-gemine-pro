# Regional video segmentation protocol

Set `BLACKCORE_VIDEO_SEGMENT_ENDPOINT` to the base URL of a temporal segmentation adapter. A Grounded SAM 2-compatible service can implement this contract; BLACKCORE does not claim the model is running until this endpoint returns a verified mask.

## Request

`POST /v1/video/mask` as `multipart/form-data`:

- `video`: source video;
- `region_prompt`: semantic target such as `window`, `eyes`, `shirt`, `water` or a more precise description;
- `output`: `grayscale-mask-video`;
- `white_means`: `edit-selected-region`;
- `tracking`: `temporal-consistent`.

If `BLACKCORE_VIDEO_SEGMENT_TOKEN` exists, BLACKCORE sends it as `Authorization: Bearer ...`. A non-loopback upload requires `allowRemote=true` and remains subject to the active permission profile.

## Response

Return HTTP 200 with `Content-Type: video/*` or `application/octet-stream`. The body must be a playable grayscale mask video with the same duration as the source. White selects pixels to edit; black preserves pixels. Soft gray edges are allowed.

BLACKCORE rejects empty/full masks, missing video streams, duration mismatch, oversized responses and non-video output. No endpoint or failed tracking means the edit stops; it never becomes a global filter.
