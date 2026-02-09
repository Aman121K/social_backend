const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL || ''; // e.g. https://pub-xxx.r2.dev or custom domain

let client = null;

function getClient() {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials missing: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return client;
}

/**
 * Upload a buffer to R2 and return the public URL.
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - e.g. image/jpeg
 * @param {string} [folder] - Optional folder prefix (e.g. 'posts', 'profiles')
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadBuffer(buffer, mimeType, folder = 'uploads') {
  if (!bucketName) throw new Error('R2_BUCKET_NAME is not set');
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/gif' ? 'gif' : 'jpg';
  const key = `${folder}/${randomUUID()}.${ext}`;

  const s3 = getClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  if (publicUrl) {
    const base = publicUrl.replace(/\/$/, '');
    return `${base}/${key}`;
  }
  return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;
}

function isR2Configured() {
  return !!(accountId && accessKeyId && secretAccessKey && bucketName);
}

module.exports = { uploadBuffer, isR2Configured };
