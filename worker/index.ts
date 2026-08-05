/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    const permanentRedirects: Record<string, string> = {
      "/index.html": "/",
      "/rishennia/index.html": "/rishennia",
      "/komplekty/index.html": "/komplekty",
      "/yak-tse-pratsiuie/index.html": "/yak-tse-pratsiuie",
      "/vidhuky/index.html": "/vidhuky",
      "/faq/index.html": "/faq",
      "/kontakty/index.html": "/kontakty",
      "/umovy/index.html": "/umovy",
      "/karcher-puzzi.html": "/rishennia/textile",
      "/jimmy-jv35.html": "/rishennia/mattress",
      "/karcher-sc2.html": "/rishennia/steam",
      "/abir-wd8.html": "/rishennia/windows",
    };
    const redirectTarget = permanentRedirects[url.pathname];
    if (redirectTarget) {
      return Response.redirect(new URL(`${redirectTarget}${url.search}`, url), 301);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
