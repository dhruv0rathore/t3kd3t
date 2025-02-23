import { NextRequest } from 'next/server';
import { POST } from '@/app/api/analyze/route';

describe('Analyze API', () => {
  it('should validate required fields', async () => {
    const req = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
  });

  it('should accept valid analysis request', async () => {
    const req = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: JSON.stringify({
        projectId: '123',
        repoUrl: 'https://github.com/test/repo.git',
        provider: 'github',
        accessToken: 'test-token'
      }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('analyzing');
  });
}); 