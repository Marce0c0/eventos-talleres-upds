import { join } from 'path';

const PORT = 8080;
const DIR = import.meta.dir;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    let pathname = new URL(req.url).pathname;
    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }
    const filePath = join(DIR, pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    // Fallback a index.html para navegación SPA si no tiene extensión de archivo
    if (!pathname.includes('.')) {
      return new Response(Bun.file(join(DIR, 'index.html')));
    }

    return new Response('404 Not Found', { status: 404 });
  },
});

console.log(`🚀 Frontend UPDS corriendo exitosamente en http://localhost:${server.port}`);
