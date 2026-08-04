import request from 'supertest';
import app from '../index';

describe('API Routes', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  describe('GET /', () => {
    it('should return API info', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('SwarmDev API');
    });
  });

  describe('POST /api/auth/webhook', () => {
    it('should reject missing Svix headers', async () => {
      const res = await request(app)
        .post('/api/auth/webhook')
        .send({ type: 'user.created' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Missing Svix headers');
    });
  });
});

// Auth-protected routes return 401 without a Clerk session token.
describe('Auth-protected routes', () => {
  it('should require authentication for project access', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });
});

describe('Rate Limiting', () => {
  it('should skip rate limiting for localhost IPs', async () => {
    // Rate limiter is configured to skip localhost (127.0.0.1, ::1)
    // This test verifies that localhost requests are not rate limited
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);

    // Make a batch of requests - all should pass on localhost
    const requests = Array(20).fill(null).map(() =>
      request(app).get('/health')
    );
    const results = await Promise.all(requests);
    const blocked = results.filter(r => r.status === 429);

    expect(blocked.length).toBe(0);
  });
});
