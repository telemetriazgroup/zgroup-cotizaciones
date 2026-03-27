const Redis = require('ioredis');

let client = null;

function getRedis() {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  client.on('error', (err) => console.error('Redis error:', err.message));
  return client;
}

/** Marca refresh token como invalidado en Redis (TTL acotado al tiempo restante del token). */
async function revokeRefreshInCache(refreshTokenId, ttlSeconds) {
  const r = getRedis();
  if (!r) return;
  const key = `refresh_revoked:${refreshTokenId}`;
  const ttl = Math.max(1, Math.min(ttlSeconds, 7 * 24 * 3600));
  try {
    await r.set(key, '1', 'EX', ttl);
  } catch (e) {
    console.warn('Redis revoke failed:', e.message);
  }
}

async function isRefreshRevokedInCache(refreshTokenId) {
  const r = getRedis();
  if (!r) return false;
  try {
    const v = await r.get(`refresh_revoked:${refreshTokenId}`);
    return v === '1';
  } catch (e) {
    console.warn('Redis get failed:', e.message);
    return false;
  }
}

module.exports = { getRedis, revokeRefreshInCache, isRefreshRevokedInCache };
