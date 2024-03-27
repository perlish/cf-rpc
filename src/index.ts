interface Env {
	CORS_ALLOW_ORIGIN: string;
	HELIUS_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env) {

		// If the request is an OPTIONS request, return a 200 response with permissive CORS headers
		// This is required for the Helius RPC Proxy to work from the browser and arbitrary origins
		// If you wish to restrict the origins that can access your Helius RPC Proxy, you can do so by
		// changing the `*` in the `Access-Control-Allow-Origin` header to a specific origin.
		// For example, if you wanted to allow requests from `https://example.com`, you would change the
		// header to `https://example.com`. Multiple domains are supported by verifying that the request
		// originated from one of the domains in the `CORS_ALLOW_ORIGIN` environment variable.
		const supportedDomains = env.CORS_ALLOW_ORIGIN ? env.CORS_ALLOW_ORIGIN.split(',') : undefined;
		const corsHeaders: Record<string, string> = {
			"Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
			"Access-Control-Allow-Headers": "*",
		}

		const mobileHeader = request.headers.get('X-Synesis-Mobile')
		if (mobileHeader || mobileHeader === 'true') {
			corsHeaders['Access-Control-Allow-Origin'] = '*'
		} else {
			corsHeaders['Access-Control-Allow-Origin'] = '*.synesis.one'
		}

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: corsHeaders,
			});
		}

		const upgradeHeader = request.headers.get('Upgrade')
		if (upgradeHeader || upgradeHeader === 'websocket') {
			return await fetch(`https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`, request)
		}


		const { pathname, search } = new URL(request.url)
		const payload = await request.text();
		let baseUrl;

		if (pathname === '/das') {
			baseUrl = 'api.helius.xyz';
		} else {
			baseUrl = 'mainnet.helius-rpc.com';
		}

		const queryString = `api-key=${env.HELIUS_API_KEY}${search ? `&${search.slice(1)}` : ''}`;
		const fullUrl = `https://${baseUrl}${pathname}?${queryString}`;

		const proxyRequest = new Request(fullUrl, {
			method: request.method,
			body: payload || null,
			headers: {
				'Content-Type': 'application/json',
				'X-Helius-Cloudflare-Proxy': 'true',
			}
		});

		return await fetch(proxyRequest).then(res => {
			return new Response(res.body, {
				status: res.status,
				headers: corsHeaders
			});
		});
	},
};
