import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { payments } from './payments';

const app = new Hono();
app.route('/payments', payments);

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`API http://localhost:${port}`);
