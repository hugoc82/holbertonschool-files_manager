import { createClient } from 'redis';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    // connexion immédiate
    this.ready = this.client.connect().catch((err) => {
      console.error('Redis Connect Error:', err);
    });
  }

  isAlive() {
    return this.client?.isOpen === true;
  }

  async get(key) {
    try {
      return await this.client.get(key);
    } catch (err) {
      console.error('Redis GET Error:', err);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      await this.client.set(key, value, { EX: duration });
    } catch (err) {
      console.error('Redis SET Error:', err);
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
    } catch (err) {
      console.error('Redis DEL Error:', err);
    }
  }
}

const redisClient = new RedisClient();
export { redisClient };
export default redisClient;

