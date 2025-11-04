// API Service Entry Point
// This will be used for optional Fastify API if needed

import { fastify } from 'fastify';

const server = fastify({
  logger: true
});

server.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
    console.log('API server running on http://localhost:3001');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
