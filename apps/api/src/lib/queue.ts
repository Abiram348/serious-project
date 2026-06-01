import { Queue, Worker } from 'bullmq';
import { redis } from './redis';

const QUEUE_NAME = 'swarmdev-agent-jobs';

export const agentQueue = new Queue(QUEUE_NAME, { connection: redis });

// Worker to process jobs
export const agentWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { project_id, user_id, user_prompt, tech_stack } = job.data;

    console.log(`📦 Processing job for project ${project_id}`);

    // Call orchestrator
    const response = await fetch(process.env.ORCHESTRATOR_URL + '/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id, user_id, user_prompt, tech_stack }),
    });

    return response.json();
  },
  { connection: redis, concurrency: 5 }
);

agentWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

agentWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});
