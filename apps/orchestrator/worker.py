"""
BullMQ Python Worker for SwarmDev Orchestrator.
Consumes jobs from Redis queue and processes them.
"""

import os
import asyncio
import json
from bullmq import Worker, Queue
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUE_NAME = "swarmdev-agent-jobs"

async def process_job(job):
    """Process an agent job from the queue."""
    print(f"📦 Processing job: {job.id}")

    project_id = job.data.get("project_id")
    user_id = job.data.get("user_id")
    user_prompt = job.data.get("user_prompt")
    tech_stack = job.data.get("tech_stack", {})

    try:
        # Import and run the LangGraph workflow
        import sys
        sys.path.append(os.path.dirname(__file__))

        from graph.graph import app as langgraph_app
        from graph.state import ProjectState

        # Build initial state
        initial_state: ProjectState = {
            "project_id": project_id,
            "user_id": user_id,
            "user_prompt": user_prompt,
            "status": "PLANNING",
            "files": {},
            "task_plan": [],
        }

        if tech_stack:
            initial_state["tech_stack"] = tech_stack

        # Run the workflow
        result = await langgraph_app.ainvoke(initial_state)

        print(f"✅ Job {job.id} completed for project {project_id}")
        return {"success": True, "result": result}

    except Exception as e:
        print(f"❌ Job {job.id} failed: {str(e)}")
        raise e

async def main():
    """Start the worker."""
    queue = Queue(QUEUE_NAME, {"connection": {"url": REDIS_URL}})

    worker = Worker(
        QUEUE_NAME,
        process_job,
        {
            "connection": {"url": REDIS_URL},
            "concurrency": 5,
        }
    )

    print(f"🚀 Worker started, listening on queue: {QUEUE_NAME}")
    print(f"📡 Redis: {REDIS_URL}")

    # Keep the worker running
    await worker.wait_until_ready()

    # Graceful shutdown
    try:
        while True:
            await asyncio.sleep(3600)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down worker...")
        await worker.close()
        await queue.close()

if __name__ == "__main__":
    asyncio.run(main())
