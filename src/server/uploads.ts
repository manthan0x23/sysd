import { randomBytes } from "node:crypto";
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { UPLOAD_KEY } from "@/lib/avatar";
import { UserError } from "./doc";
import { teamLevel } from "./access";

/**
 * Custom avatars and team logos live in a Cloudflare R2 bucket. The browser uploads straight to R2 with a
 * short-lived presigned PUT, so image bytes never pass through our server. Our side decides the object key,
 * the content type and the exact size, and checks the object afterwards before anyone can point a profile at it.
 *
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, NEXT_PUBLIC_R2_PUBLIC_URL (the public
 * address of the bucket, for example https://img.sysd.live). Without them uploads are off and the picker hides the tab.
 */
export const MAX_UPLOAD_BYTES = 256 * 1024;
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const PRESIGN_SECONDS = 300;

const env = () => ({
  account: process.env.R2_ACCOUNT_ID, key: process.env.R2_ACCESS_KEY_ID, secret: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET, publicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
});
export const uploadsEnabled = () => { const e = env(); return Boolean(e.account && e.key && e.secret && e.bucket && e.publicUrl); };

let client: S3Client | undefined;
function r2(): { s3: S3Client; bucket: string } {
  const e = env();
  if (!uploadsEnabled()) throw new UserError("Uploads are not set up yet.");
  client ??= new S3Client({
    region: "auto", endpoint: `https://${e.account}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: e.key!, secretAccessKey: e.secret! },
  });
  return { s3: client, bucket: e.bucket! };
}

export type UploadScope = { scope: "avatar" } | { scope: "team"; teamId: string };

export interface UploadTicket { url: string; key: string; headers: Record<string, string> }

/** Hands out a presigned PUT for one image. The size and type are signed, so R2 refuses anything else. */
export async function requestUpload(userId: string, target: UploadScope, contentType: string, size: number): Promise<UploadTicket> {
  const ext = TYPES[contentType];
  if (!ext) throw new UserError("Use a PNG, JPG or WebP image.");
  if (!Number.isInteger(size) || size < 1 || size > MAX_UPLOAD_BYTES) throw new UserError(`Images can be up to ${MAX_UPLOAD_BYTES / 1024} KB. Pick a smaller one.`);
  let owner = userId;
  if (target.scope === "team") {
    if ((await teamLevel(userId, target.teamId)) !== "owner") throw new UserError("Only the team owner can change the logo.");
    owner = target.teamId;
  }
  const key = `${target.scope === "team" ? "teams" : "avatars"}/${owner}/${randomBytes(16).toString("hex")}.${ext}`;
  const { s3, bucket } = r2();
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size, CacheControl: "public, max-age=31536000, immutable" });
  // Signing these headers means the PUT must send exactly this type and length.
  const url = await getSignedUrl(s3, cmd, { expiresIn: PRESIGN_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) });
  return { url, key, headers: { "Content-Type": contentType, "Content-Length": String(size) } };
}

/** True when the key was made for this owner (user id for avatars, team id for logos). */
export function keyBelongsTo(key: string, target: UploadScope, userId: string): boolean {
  if (!UPLOAD_KEY.test(key)) return false;
  const [prefix, owner] = key.split("/");
  return target.scope === "team" ? prefix === "teams" && owner === target.teamId : prefix === "avatars" && owner === userId;
}

/** After the browser says it uploaded: the object must exist, with the allowed type and size. Otherwise it is deleted. */
export async function verifyUpload(key: string): Promise<void> {
  const { s3, bucket } = r2();
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const okType = head.ContentType != null && head.ContentType in TYPES;
    if (!okType || (head.ContentLength ?? Infinity) > MAX_UPLOAD_BYTES) { await deleteUpload(key); throw new UserError("That file is not an allowed image."); }
  } catch (e) {
    if (e instanceof UserError) throw e;
    throw new UserError("The upload did not arrive. Try again.");
  }
}

/** Best effort: a replaced or refused image should not stay in the bucket. */
export async function deleteUpload(key: string): Promise<void> {
  if (!uploadsEnabled() || !UPLOAD_KEY.test(key)) return;
  try { const { s3, bucket } = r2(); await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); } catch (e) { console.error("[uploads] delete failed", e); }
}
