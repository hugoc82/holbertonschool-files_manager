// utils/redis.mjs
import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.isV4 = typeof this.client.connect === 'function'; // v4 si connect() existe
    this.connected = false;

    this.client.on?.('error', (err) => console.error('Redis Client Error:', err));

    if (this.isV4) {
      // redis v4
      this.client.connect()
        .then(() => { this.connected = true; })
        .catch((err) => console.error('Redis Connect Error:', err));
    } else {
      // redis v2/v3
      this.client.on?.('connect', () => { this.connected = true; });
      this.client.on?.('ready', () => { this.connected = true; });

      // callbacks -> Promises
      this.getCb = this.client.get ? promisify(this.client.get).bind(this.client) : null;
      this.delCb = this.client.del ? promisify(this.client.del).bind(this.client) : null;
      this.setexCb = this.client.setex ? promisify(this.client.setex).bind(this.client) : null;
      this.setCb = this.client.set ? promisify(this.client.set).bind(this.client) : null;
    }
  }

  isAlive() {
    if (this.isV4) return this.client?.isOpen === true;
    return this.connected;
  }

  async get(key) {
    try {
      if (this.isV4) return await this.client.get(key);
      if (this.getCb) return await this.getCb(key);
      return null;
    } catch (err) {
      console.error('Redis GET Error:', err);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      if (this.isV4) {
        // v4 syntaxe moderne
        await this.client.set(key, value, { EX: duration });
        return;
      }
      // v2/v3: privilégier SETEX
      if (this.setexCb) {
        await this.setexCb(key, duration, value);
        return;
      }
      // fallback v2/v3: SET key value 'EX' duration
      if (this.setCb) {
        await this.setCb(key, value, 'EX', duration);
      }
    } catch (err) {
      console.error('Redis SET Error:', err);
    }
  }

  async del(key) {
    try {
      if (this.isV4) {
        await this.client.del(key);
        return;
      }
      if (this.delCb) await this.delCb(key);
    } catch (err) {
      console.error('Redis DEL Error:', err);
    }
  }
}

const redisClient = new RedisClient();
export { redisClient };
export default redisClient;

