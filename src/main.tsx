import { Hono } from 'hono';

export interface Env {
	mortgage_explorer: KVNamespace;
	ASSETS: Fetcher; // provided by Workers Static Assets binding
}

const app = new Hono<{ Bindings: Env }>();

// API routes
app.get('/api/state/:key', async (c) => {
	const key = c.req.param('key');
	const value = await c.env.mortgage_explorer.get(key);
	return c.json({ value });
});

app.put('/api/state/:key', async (c) => {
	const key = c.req.param('key');
	const { value } = await c.req.json<{ value: string }>();
	await c.env.mortgage_explorer.put(key, value);
	return c.json({ success: true });
});

export default app;
