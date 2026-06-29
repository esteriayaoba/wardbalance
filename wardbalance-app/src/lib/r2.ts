import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

// Development fallback check
const isConfigured = !!(accountId && accessKeyId && secretAccessKey && bucketName);

// Initialize S3Client scoped to Cloudflare R2
const s3Client = isConfigured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    })
  : null;

/**
 * Generates a presigned PUT URL for uploading a receipt/proof.
 * Falls back to a mock/simulation url in development when keys are not configured.
 */
export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  contentLength: number
): Promise<{ uploadUrl: string; key: string; isMock: boolean }> {
  if (!isConfigured) {
    // In local development mock mode, redirect uploads to a local API simulation
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const uploadUrl = `${appUrl}/api/portal/payments/mock-upload-target?key=${encodeURIComponent(key)}`;
    return { uploadUrl, key, isMock: true };
  }

  const command = new PutObjectCommand({
    Bucket: bucketName!,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  // Expire in 10 minutes (600 seconds)
  const uploadUrl = await getSignedUrl(s3Client!, command, { expiresIn: 600 });
  return { uploadUrl, key, isMock: false };
}

/**
 * Generates a presigned GET URL with a short-lived TTL (15 minutes) for admins to view receipts.
 * Falls back to returning a placeholder or local asset path in development.
 */
export async function getPresignedGetUrl(key: string): Promise<string> {
  if (!isConfigured || !key) {
    // In dev mock mode, return placeholder or local path if simulated
    if (key && (key.startsWith("mock-") || key.includes("proof_upload"))) {
      return `/logo-v5.png`; // Fallback placeholder image asset
    }
    return key || "";
  }

  const command = new GetObjectCommand({
    Bucket: bucketName!,
    Key: key,
  });

  // Expire in 15 minutes (900 seconds)
  return await getSignedUrl(s3Client!, command, { expiresIn: 900 });
}
