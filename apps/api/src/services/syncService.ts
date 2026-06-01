import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import prisma from '../prisma/client';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'swarmdev';

export const syncService = {
  /**
   * Sync all project files to R2 (Issue #12)
   */
  async syncProjectToR2(projectId: string): Promise<void> {
    const files = await prisma.projectFile.findMany({
      where: { projectId },
    });

    const uploadPromises = files.map(async (file) => {
      const key = `projects/${projectId}/${file.path}`;

      await r2Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: file.content,
          ContentType: 'text/plain',
        })
      );

      console.log(`📦 Synced to R2: ${key}`);
    });

    await Promise.all(uploadPromises);
    console.log(`✅ Synced ${files.length} files to R2 for project ${projectId}`);
  },

  /**
   * Sync single file to R2
   */
  async syncFileToR2(projectId: string, path: string, content: string): Promise<void> {
    const key = `projects/${projectId}/${path}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: content,
        ContentType: 'text/plain',
      })
    );

    console.log(`📦 Synced to R2: ${key}`);
  },
};

// Start background sync job (every 60 seconds) - Issue #12
export const startBackgroundSync = () => {
  setInterval(async () => {
    try {
      const projects = await prisma.project.findMany({
        where: {
          status: { in: ['IN_PROGRESS', 'REVIEWING', 'COMPLETED'] },
        },
        select: { id: true },
      });

      for (const project of projects) {
        await syncService.syncProjectToR2(project.id);
      }
    } catch (error) {
      console.error('Background sync error:', error);
    }
  }, 60000); // 60 seconds
};
