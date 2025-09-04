import redis from "redis";
import { promisify } from "util";

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    this.client.on("error", (err) => {
      console.error("Redis error:", err);
    });

    // Promisify only what we need
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setexAsync = promisify(this.client.setex).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    // Pour redis v3: connected === true si OK
    return this.client.connected;
  }

  async get(key) {
    const val = await this.getAsync(key);
    return val; // null si absent (ce que veut le checker)
  }

  async set(key, value, duration) {
    // set avec expiration en secondes
    await this.setexAsync(key, duration, value);
  }

  async del(key) {
    await this.delAsync(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
