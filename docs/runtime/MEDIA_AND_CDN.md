# Media And CDN Runtime Strategy

## What Was Implemented

Media URL generation is centralized in `src/common/media/MediaUrlService`.
Uploads stored by `UploadsService` now build public URLs through that service.

Current media runtime:

- provider: local disk only;
- storage root: `UPLOAD_LOCAL_DIR`, default `uploads`;
- served path: `/uploads`;
- public local base: `UPLOAD_PUBLIC_BASE_URL`;
- optional fronting base: `CDN_BASE_URL`.

`CDN_BASE_URL` no longer has a fake default. It is used only when explicitly
configured, and only as a public URL front for files still served from
`/uploads`.

## Why This Strategy

The app needs stable media URLs without pretending cloud storage exists.
Centralizing URL generation lets screens keep consuming returned URLs while the
storage provider remains honest and local.

## Configuration

- `UPLOAD_STORAGE_PROVIDER=local`
- `UPLOAD_LOCAL_DIR=uploads`
- `UPLOAD_PUBLIC_BASE_URL=http://<api-host>/uploads`
- `CDN_BASE_URL=` optional; set only when a real CDN fronts `/uploads`
- `MAX_VIDEO_SIZE_MB`
- `ALLOWED_VIDEO_FORMATS`

If `CDN_BASE_URL` is empty, returned URLs use `UPLOAD_PUBLIC_BASE_URL`.
If `CDN_BASE_URL` is set, returned URLs use it as a fronting base only.

## Production-Ready Now

- local upload validation and storage;
- public serving through `/uploads`;
- centralized URL construction;
- optional CDN-fronted URL base;
- no fake CDN upload claims;
- no synthesized provider URLs for thumbnails or processed media.

## Intentionally Not Implemented

- no S3, Cloudinary, R2, Cloudflare, or other storage adapter;
- no CDN provider selection;
- no real thumbnail generation;
- no real ffprobe/metadata extraction;
- no local-to-cloud replication.

`UploadProcessor` now resolves an existing attachment URL or a URL derived from
local upload storage. If neither exists, it fails instead of generating a fake
CDN URL. Generated thumbnails are stored as `null` until real processing exists.

## How To Operate And Test

Run unit tests:

```bash
npm test -- media-url.service.spec.ts
```

Manual smoke test:

1. Set `UPLOAD_PUBLIC_BASE_URL` to the public API or NGINX upload URL.
2. Leave `CDN_BASE_URL` empty.
3. Upload an image or video through `POST /api/upload`.
4. Confirm the returned URL starts with `UPLOAD_PUBLIC_BASE_URL`.
5. Fetch the returned URL and confirm the file is served.
6. Set `CDN_BASE_URL` only after a real CDN fronts `/uploads`, then repeat.

## Known Risks

- Local Docker volume storage is not enough for multi-instance production.
- Rebuilding or replacing a host without preserving `api_uploads` can lose media.
- CDN fronting only improves delivery; it does not add durable cloud storage.
- Thumbnail and metadata fields remain unavailable until real processors are
  implemented.

## Future Provider Steps

1. Implement a storage adapter for the selected provider.
2. Upload files to that provider during ingest.
3. Store the provider key/path in the database.
4. Set the provider or CDN public base URL.
5. Update `MediaUrlService` to build URLs from provider keys.
6. Test upload, fetch, cache purge, and delete flows end to end.
