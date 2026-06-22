import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import db from '../prisma/client';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET || 'swarmdev';

const isR2Configured = () =>
  Boolean(
    process.env.CLOUDFLARE_R2_ENDPOINT &&
      process.env.CLOUDFLARE_R2_ACCESS_KEY &&
      process.env.CLOUDFLARE_R2_SECRET_KEY
  );

// Bound the concurrency of R2 uploads + Prisma reads so the background
// job doesn't exhaust the DB connection pool on large projects.
const SYNC_CONCURRENCY = Number(process.env.R2_SYNC_CONCURRENCY || 4);

async function runWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

export const syncService = {
  /**
   * Sync all project files to R2 (Issue #12).
   * Streams files in bounded batches to avoid pool exhaustion on large projects.
   */
  async syncProjectToR2(projectId: string): Promise<void> {
    if (!isR2Configured()) {
      console.warn(`[syncService] R2 not configured, skipping sync for project ${projectId}`);
      return;
    }

    // Use a paginated cursor instead of loading every file into memory.
    const BATCH = 100;
    let cursor: string | undefined;
    let total = 0;

    do {
      const page = await db.projectFile.findMany({
        where: { projectId },
        take: BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      });
      if (page.length === 0) break;

      await runWithLimit(page, SYNC_CONCURRENCY, async (file) => {
        const key = `projects/${projectId}/${file.path}`;
        try {
          await r2Client.send(
            new PutObjectCommand({
              Bucket: BUCKET,
              Key: key,
              Body: file.content ?? '',
              ContentType: 'text/plain',
            })
          );
          total += 1;
        } catch (err) {
          console.warn(`[syncService] R2 upload failed for ${key}:`, (err as Error).message);
        }
      });

      cursor = page[page.length - 1].id;
    } while (cursor);

    console.log(`✅ Synced ${total} files to R2 for project ${projectId}`);
  },

  /**
   * Sync single file to R2. No-op when R2 is not configured so callers
   * can fire-and-forget without crashing the request.
   */
  async syncFileToR2(projectId: string, path: string, content: string): Promise<void> {
    if (!isR2Configured()) return;
    const key = `projects/${projectId}/${path}`;
    try {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: content,
          ContentType: 'text/plain',
        })
      );
    } catch (err) {
      console.warn(`[syncService] R2 upload failed for ${key}:`, (err as Error).message);
    }
  },
};

// Start background sync job. Returns a handle so callers (tests) can stop it.
let backgroundTimer: NodeJS.Timeout | null = null;

export const startBackgroundSync = () => {
  if (backgroundTimer) return;
  if (!isR2Configured()) {
    console.warn('[syncService] Background R2 sync disabled — credentials not set');
    return;
  }
  backgroundTimer = setInterval(async () => {
    try {
      const allProjects = await db.project.findMany({
        select: { id: true, status: true },
      });
      const syncable = allProjects.filter((p) =>
        ['IN_PROGRESS', 'REVIEWING', 'COMPLETED'].includes(p.status as string)
      );
      for (const project of syncable) {
        await syncService.syncProjectToR2(project.id);
      }
    } catch (error) {
      console.error('[syncService] Background sync error:', error);
    }
  }, 60000);
};

export const stopBackgroundSync = () => {
  if (backgroundTimer) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
  }
};
