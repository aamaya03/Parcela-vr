// sw.js — GENERADO AUTOMÁTICAMENTE (no editar a mano). Guarda el recorrido en el navegador
// para poder usarlo SIN internet. Versión del contenido: 7d01d8c7
const CACHE = 'recorrido-parcela';
const ARCHIVOS = [
  "index.html",
  "aframe.min.js?v=54c06228",
  "camara_segmentacion.jpg?v=632dafcd",
  "dashboard_humedad.mp4?v=1603f99d",
  "dashboard_microclima.mp4?v=e60735b6",
  "dashboard_sucrologgers.mp4?v=fc7582da",
  "estacion_desinstalada.jpg?v=9959a3f2",
  "estacion_instalada.jpg?v=b34e336a",
  "ndvi_cultivo.mp4?v=edae7e6f",
  "sensor_humedad_suelo.jpg?v=f722554f",
  "sensor_microclima_zoom.jpg?v=bf97fd49",
  "slide_camara.jpg?v=5ec87846",
  "slide_datalogger.jpg?v=debe0bbb",
  "slide_estacion.jpg?v=93ab235f",
  "slide_multivariable.jpg?v=f88f67cb",
  "slide_nivel_freatico.jpg?v=360e56e7",
  "slide_npk.jpg?v=207b7da4",
  "slide_parcela.jpg?v=4dc60a8c",
  "slide_pluviometro.jpg?v=ff4ce8a7",
  "slide_pot_matrico.jpg?v=9e96a761",
  "slide_temp_suelo.jpg?v=b56adb0a",
  "vista_interior_2.jpg?v=d7c8dd48",
  "vista_superior.jpg?v=d67fa837"
];
const PAGINA = new URL('index.html', self.location).href;

const esperar = (ms) => new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('lento')), ms));

async function avisar(mensaje) {
  const clientes = await self.clients.matchAll({ includeUncontrolled: true });
  clientes.forEach((c) => c.postMessage(mensaje));
}

async function contarGuardados() {
  const cache = await caches.open(CACHE);
  let hechos = 0;
  for (const url of ARCHIVOS) {
    const clave = url === './' ? PAGINA : url;
    if (await cache.match(clave, { ignoreVary: true })) hechos++;
  }
  return hechos;
}

// ---- Instalación: descarga y guarda todos los archivos ----
self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const total = ARCHIVOS.length;
    let hechos = 0;
    await avisar({ tipo: 'inicio', hechos, total });
    for (const url of ARCHIVOS) {
      const clave = url === './' ? PAGINA : url;
      try {
        // Los archivos llevan su "huella" en el nombre: si ya está guardado, es el mismo; no se vuelve a bajar
        if (url === './' || url === 'index.html' || !(await cache.match(clave, { ignoreVary: true }))) {
          const respuesta = await fetch(clave, { cache: 'reload' });
          if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
          await cache.put(clave, respuesta);
        }
      } catch (error) {
        // sin conexión o archivo faltante: se reintenta la próxima vez que se abra con internet
      }
      hechos++;
      await avisar({ tipo: 'progreso', hechos, total });
    }
    await self.skipWaiting();
  })());
});

// ---- Activación: borra copias de versiones viejas ----
self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const vigentes = new Set(ARCHIVOS.map((u) => new URL(u === './' ? 'index.html' : u, self.location).href));
    for (const peticion of await cache.keys()) {
      const dir = new URL(peticion.url);
      if (dir.origin === self.location.origin && !vigentes.has(peticion.url)) await cache.delete(peticion);
    }
    await self.clients.claim();
    await avisar({ tipo: 'estado', hechos: await contarGuardados(), total: ARCHIVOS.length });
  })());
});

// ---- Los videos piden "pedazos" (Range); una copia guardada hay que cortarla ----
async function respuestaConRango(respuesta, rango) {
  const datos = await respuesta.clone().arrayBuffer();
  const total = datos.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(rango || '');
  if (!m) return respuesta;
  let ini, fin;
  if (m[1] === '') { const n = Number(m[2]); ini = Math.max(0, total - n); fin = total - 1; }
  else { ini = Number(m[1]); fin = m[2] === '' ? total - 1 : Math.min(Number(m[2]), total - 1); }
  if (ini >= total || ini > fin) {
    return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + total } });
  }
  return new Response(datos.slice(ini, fin + 1), {
    status: 206, statusText: 'Partial Content',
    headers: {
      'Content-Type': respuesta.headers.get('Content-Type') || 'video/mp4',
      'Content-Range': 'bytes ' + ini + '-' + fin + '/' + total,
      'Content-Length': String(fin - ini + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

async function cachePrimero(peticion, evento) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(peticion.url, { ignoreVary: true });
  if (guardada) {
    const rango = peticion.headers.get('range');
    return rango ? respuestaConRango(guardada, rango) : guardada;
  }
  try {
    const red = await fetch(peticion);
    if (red.ok && red.status === 200) evento.waitUntil(cache.put(peticion.url, red.clone()));   // lo aprende para la próxima
    return red;
  } catch (error) {
    return new Response('Sin conexión y sin copia guardada', { status: 503 });
  }
}

async function paginaPrimero(peticion, evento) {
  const cache = await caches.open(CACHE);
  try {
    // Con internet: siempre la versión más nueva (máx. 4 s de espera; si la señal es mala, usa la guardada)
    const red = await Promise.race([fetch(peticion, { cache: 'no-cache' }), esperar(4000)]);
    if (red.ok) evento.waitUntil(cache.put(PAGINA, red.clone()));
    return red;
  } catch (error) {
    return (await cache.match(PAGINA, { ignoreVary: true })) || new Response('Sin conexión y sin copia guardada', { status: 503 });
  }
}

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (peticion.mode === 'navigate' && url.origin === self.location.origin) {
    evento.respondWith(paginaPrimero(peticion, evento));
  } else if (url.origin === self.location.origin || url.hostname === 'cdn.aframe.io') {
    evento.respondWith(cachePrimero(peticion, evento));
  }
});

// ---- La página pregunta cuántos archivos están guardados ----
self.addEventListener('message', (evento) => {
  if (evento.data === 'estado') {
    evento.waitUntil((async () => {
      const mensaje = { tipo: 'estado', hechos: await contarGuardados(), total: ARCHIVOS.length };
      if (evento.source) evento.source.postMessage(mensaje); else await avisar(mensaje);
    })());
  }
});
