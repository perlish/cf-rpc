interface Env {
	CORS_ALLOW_ORIGIN: string;
	HELIUS_API_KEY: string;
}

export default {
	async fetch(request: Request, env: Env) {
		const allowedOrigins = [
			'https://train.synesis.one',
			'https://dyf-staging.synesis.one',
			'https://kanon.exchange',
			'https://kanon.synesis.one',
			'https://kanon-staging.synesis.one'
		];

		const corsHeaders: Record<string, string> = {
			"Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
			"Access-Control-Allow-Headers": "*",
		}
		const requestOrigin = request.headers.get('Origin');
		console.log('requestOrigin:', requestOrigin)
		if (allowedOrigins.includes(requestOrigin)) {
			corsHeaders['Access-Control-Allow-Origin'] = requestOrigin;
		} else {
			const mobileHeader = request.headers.get('X-Synesis-Mobile')
			if (mobileHeader && mobileHeader === 'true') {
				corsHeaders['Access-Control-Allow-Origin'] = '*'
			}else{
				corsHeaders['Access-Control-Allow-Origin'] = 'null';
			}
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
