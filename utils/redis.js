import { Redis } from 'ioredis';

const redisClient=()=>{
    if(process.env.REDIS_URL){
        console.log("Redis Connected");
        return process.env.REDIS_URL;
    }
    throw new Error("Redis connection failed");
}
const redis= new Redis(redisClient(),{tls: {rejectUnauthorized: false}});

export default redis;