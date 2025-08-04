/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	ATTACHMENTS_BUCKET: R2Bucket;
}

function withCorsHeaders(resp: Response) {
	const newHeaders = new Headers(resp.headers);
	newHeaders.set("Access-Control-Allow-Origin", "*");
	newHeaders.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
	newHeaders.set("Access-Control-Allow-Headers", "Content-Type");
	return new Response(resp.body, {
		status: resp.status,
		statusText: resp.statusText,
		headers: newHeaders,
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Handle preflight OPTIONS request
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		// Handle file upload (POST /upload)
		if (request.method === "POST" && url.pathname === "/upload") {
			const formData = await request.formData();
			const file = formData.get("file") as File;
			const originalName = (formData.get("fileName") as string) || "file";
			const parentId = formData.get("parentId") as string;
			const parentType = formData.get("parentType") as string || "comment";
			const uniqueId = crypto.randomUUID();
			const fileName = `${parentType}s/${parentId}/${uniqueId}_${originalName}`;

			if (!file) {
				return withCorsHeaders(new Response("No file uploaded", { status: 400 }));
			}

			await env.ATTACHMENTS_BUCKET.put(fileName, file.stream(), {
				httpMetadata: { contentType: file.type }
			});

			return withCorsHeaders(new Response(JSON.stringify({ storage_path: fileName }), {
				headers: { "Content-Type": "application/json" }
			}));
		}

		// Handle file deletion (DELETE /delete/<filename>)
		if (request.method === "DELETE" && url.pathname.startsWith("/delete/")) {
			const fileName = url.pathname.replace("/delete/", "");
			
			try {
				await env.ATTACHMENTS_BUCKET.delete(fileName);
				return withCorsHeaders(new Response(JSON.stringify({ success: true }), {
					headers: { "Content-Type": "application/json" }
				}));
			} catch (error) {
				console.error('Error deleting file:', error);
				return withCorsHeaders(new Response(JSON.stringify({ error: "Failed to delete file" }), {
					status: 500,
					headers: { "Content-Type": "application/json" }
				}));
			}
		}

		// Handle file download (GET /file/<filename>)
		if (request.method === "GET" && url.pathname.startsWith("/file/")) {
			const fileName = url.pathname.replace("/file/", "");
			const object = await env.ATTACHMENTS_BUCKET.get(fileName);

			if (!object) {
				return withCorsHeaders(new Response("Not found", { status: 404 }));
			}

			return withCorsHeaders(new Response(object.body, {
				headers: {
					"Content-Type": object.httpMetadata?.contentType || "application/octet-stream"
				}
			}));
		}

		return withCorsHeaders(new Response("Not found", { status: 404 }));
	}
} satisfies ExportedHandler<Env>;
