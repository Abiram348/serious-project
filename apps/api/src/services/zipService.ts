import archiver from 'archiver';
import { PassThrough } from 'stream';
import db from '../prisma/client';

/**
 * Build a ZIP buffer from all ProjectFile rows for a project.
 * Reads from PostgreSQL (primary storage) — no R2 dependency required.
 */
export async function buildProjectZip(projectId: string): Promise<Buffer> {
  const files = await db.projectFile.findMany({
    where: { projectId },
    orderBy: { path: 'asc' },
  });

  if (files.length === 0) {
    throw new Error('No files to export');
  }

  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const passthrough = new PassThrough();
    const chunks: Buffer[] = [];

    passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));
    passthrough.on('end', () => resolve(Buffer.concat(chunks)));
    passthrough.on('error', reject);
    archive.on('error', reject);

    archive.pipe(passthrough);

    for (const file of files) {
      archive.append(file.content ?? '', { name: file.path.replace(/^\//, '') });
    }

    void archive.finalize();
  });
}
