// utils/redis.mjs
import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.connected = false;

    // Toujours loguer les erreurs
    this.client.on?.('error', (err) => console.error('Redis Client Error:', err));

    // redis v4 => méthode connect() existe
    if (typeof this.client.connect === 'function') {
      this.client.connect()
        .then(() => { this.connected = true; })
        .catch((err) => console.error('Redis Connect Error:', err));
    } else {
      // redis v3 => pas de connect(), on écoute 'connect' / 'ready'
      this.client.on?.('connect', () => { this.connected = true; });
      this.client.on?.('ready', () => { this.connected = true; });

      // Préparer des versions promisifiées (v3 callback API)
      this.getCb = this.client.get ? promisify(this.client.get).bind(this.client) : null;
      this.delCb = this.client.del ? promisify(this.client.del).bind(this.client) : null;
      this.setexCb = this.client.setex ? promisify(this.client.setex).bind(this.client) : null;
      this.setCb = this.client.set ? promisify(this.client.set).bind(this.client) : null;
    }
  }

  isAlive() {
    // v4 expose isOpen, sinon on se base sur les events v3
    if (typeof this.client.isOpen === 'boolean') return this.client.isOpen;
    return this.connected;
  }

  async get(key) {
    try {
      // v4: get retourne une Promise (signature courte)
      if (typeof this.client.get === 'function' && this.client.get.length < 2) {
        return await this.client.get(key);
      }
      // v3: get via callback -> promisify
      if (this.getCb) return await this.getCb(key);
      return null;
    } catch (err) {
      console.error('Redis GET Error:', err);
      return null;
    }
  }

  async set(key, value, duration) {
    try {
      // v4: set supporte { EX }
      if (typeof this.client.set === 'function' && this.client.set.length < 3) {
        await this.client.set(key, value, { EX: duration });
        return;
      }
      // v3: utiliser setex si dispo
      if (this.setexCb) {
        await this.setexCb(key, duration, value);
        return;
      }
      // v3 fallback: set key value 'EX' duration
      if (this.setCb) {
        await this.setCb(key, value, 'EX', duration);
      }
    } catch (err) {
      console.error('Redis SET Error:', err);
    }
  }

  async del(key) {
    try {
      // v4: del retourne une Promise (signature courte)
      if (typeof this.client.del === 'function' && this.client.del.length < 2) {
        await this.client.del(key);
        return;
      }
      // v3: del via callback -> promisify
      if (this.delCb) await this.delCb(key);
    } catch (err) {
      console.error('Redis DEL Error:', err);
    }
  }
}

const redisClient = new RedisClient();
export { redisClient };
export default redisClient;

