# Media And CDN Runtime Strategy

## What Was Implemented

Media URL generation is centralized in `src/common/media/MediaUrlService`.
Uploads stored by `UploadsService` now build public URLs through that service.

Current media runtime:

- provider: local disk only;
- storage root: `UPLOAD_LOCAL_DIR`, default `uploads`;
- served path: `/uploads`;
- public local base: `UPLOAD_PUBLIC_BASE_URL`;
- future provider/fronting base: `CDN_BASE_URL`.

`CDN_BASE_URL` has no fake default. While `UPLOAD_STORAGE_PROVIDER=local`,
returned upload URLs use `UPLOAD_PUBLIC_BASE_URL` so they honestly point at the
API/static upload server. `CDN_BASE_URL` is reserved for a real configured
provider/fronting setup and should stay empty for local storage.

## Why This Strategy

The app needs stable media URLs without pretending cloud storage exists.
Centralizing URL generation lets screens keep consuming returned URLs while the
storage provider remains honest and local.

## Configuration

- `UPLOAD_STORAGE_PROVIDER=local`
- `UPLOAD_LOCAL_DIR=uploads`
- `UPLOAD_PUBLIC_BASE_URL=http://<api-host>/uploads`
- `CDN_BASE_URL=` leave empty until a real provider/fronting setup exists
- `MAX_VIDEO_SIZE_MB`
- `ALLOWED_VIDEO_FORMATS`

When storage is local, returned URLs use `UPLOAD_PUBLIC_BASE_URL`.

## Production-Ready Now

- local upload validation and storage;
- public serving through `/uploads`;
- byte-range friendly static serving for videos;
- cache headers for immutable uploaded files;
- centralized URL construction;
- CDN-ready URL abstraction without fake CDN generation;
- no fake CDN upload claims;
- no synthesized provider URLs for thumbnails or processed media.

## Delivery And Performance

The API serves local uploads with `express.static` mounted at `/uploads`.
Express static delivery supports HTTP byte range requests, so video clients can
request partial content instead of downloading the full file before playback.

Uploaded file names are generated with ULIDs and are treated as immutable. The
server sets cache headers on `/uploads` responses:

- `Cache-Control` with a 30 day max age and `immutable`;
- `ETag` and `Last-Modified`;
- `Content-Disposition: inline`;
- `X-Content-Type-Options: nosniff`.

This is enough for development and small single-instance deployments. For a
heavier production deployment, serve `/uploads` directly from NGINX or another
static file server in front of the same durable upload directory. NGINX should
preserve range requests and use the same cache policy.

Client-side performance currently depends on:

- resizing/compressing post images before upload with `expo-image-manipulator`;
- resizing/compressing profile avatars before upload;
- disk-backed image caching through `expo-image` on feed, post detail,
  bookmarks, and profile media grids;
- mounting only active video players in FYP/reels;
- using video posters only when an actual thumbnail URL exists.

## Intentionally Not Implemented

- no S3, Cloudinary, R2, Cloudflare, or other storage adapter;
- no CDN provider selection;
- no real thumbnail generation;
- no server-side image resizing pipeline;
- no video transcoding or fast-start remuxing pipeline;
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
6. Keep `CDN_BASE_URL` empty for local storage. Introduce it only with a real
   provider/fronting implementation and test fetches end to end.

Media persistence test:

1. Upload an image, video, and avatar as User A.
2. Copy the raw returned media URL from the upload response or API payload.
3. Open the copied media URL directly in a browser and confirm it renders inline.
4. Stop Expo.
5. Clear the Expo cache:

   ```bash
   npx expo start --clear
   ```

6. Restart the app and log in as User B.
7. Confirm the same media appears in reels/FYP, post detail, profile, and avatar
   surfaces.
8. If safe in the current environment, stop and restart the backend.
9. Open the copied direct media URL again and confirm it still works.
10. If using Docker Compose, restart the API container and confirm media still
    exists because `docker-compose.yml` mounts `api_uploads:/app/uploads`.

Range/cache validation:

```bash
curl -I <media-url>
curl -H "Range: bytes=0-1023" -o /dev/null -i <video-url>
```

Expected:

- image/video responses include cache headers;
- direct media opens inline instead of downloading by default;
- ranged video requests return partial-content behavior from the static server.

## Known Risks

- Local Docker volume storage is not enough for multi-instance production.
- Rebuilding or replacing a host without preserving `api_uploads` can lose media.
- CDN fronting only improves delivery; it does not add durable cloud storage.
- Thumbnail and metadata fields remain unavailable until real processors are
  implemented.
- Very large videos are stored as uploaded. Without transcoding, fast-start
  remuxing, and generated thumbnails, slow networks can still see delayed first
  frame behavior.

## Future Provider Steps

1. Implement a storage adapter for the selected provider.
2. Upload files to that provider during ingest.
3. Store the provider key/path in the database.
4. Set the provider or CDN public base URL.
5. Update `MediaUrlService` to build URLs from provider keys.
6. Test upload, fetch, cache purge, and delete flows end to end.
