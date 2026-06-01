/**
 * Storage Service - Cloudflare R2 integration for file storage
 *
 * This service manages file storage in Cloudflare R2 buckets.
 * Files are synced from E2B sandboxes to R2 for persistence.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

export interface StorageService {
  uploadFile(projectId: string, path: string, content: string): Promise<void>;
  downloadFile(projectId: string, path: string): Promise<string>;
  deleteFile(projectId: string, path: string): Promise<void>;
  listFiles(projectId: string, prefix?: string): Promise<string[]>;
  downloadProjectZip(projectId: string): Promise<Buffer>;
}

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET || 'swarmdev-files';

export const storageService = {
  async uploadFile(projectId: string, path: string, content: string): Promise<void> {
    const key = `projects/${projectId}/${path}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: content,
        ContentType: getContentType(path),
      })
    );

    console.log(`Uploaded ${key} to R2`);
  },

  async downloadFile(projectId: string, path: string): Promise<string> {
    const key = `projects/${projectId}/${path}`;

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );

    const body = response.Body as { toString: () => string };
    return body.toString();
  },

  async deleteFile(projectId: string, path: string): Promise<void> {
    const key = `projects/${projectId}/${path}`;

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );

    console.log(`Deleted ${key} from R2`);
  },

  async listFiles(projectId: string, prefix?: string): Promise<string[]> {
    const basePrefix = `projects/${projectId}/`;
    const fullPrefix = prefix ? `${basePrefix}${prefix}` : basePrefix;

    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: fullPrefix,
      })
    );

    const files = response.Contents?.map((obj) => {
      return obj.Key?.replace(basePrefix, '') || '';
    }).filter((key) => key && !key.endsWith('/')) || [];

    return files;
  },

  async downloadProjectZip(projectId: string): Promise<Buffer> {
    // TODO: Generate ZIP archive of all project files
    // For now, this is a placeholder
    throw new Error('ZIP download not yet implemented');
  },
};

// Helper function to determine content type based on file extension
function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();

  const contentTypes: Record<string, string> = {
    ts: 'text/typescript',
    tsx: 'text/typescript',
    js: 'text/javascript',
    jsx: 'text/javascript',
    py: 'text/x-python',
    html: 'text/html',
    css: 'text/css',
    json: 'application/json',
    md: 'text/markdown',
    yml: 'text/yaml',
    yaml: 'text/yaml',
    xml: 'application/xml',
    sql: 'text/sql',
    sh: 'text/x-sh',
  };

  return contentTypes[ext || 'txt'] || 'text/plain';
}

export default storageService;
