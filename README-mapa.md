
# Módulo de Mapa con Peajes (Next.js + Google Maps)

Nueva ruta: **/mapa**

## Variables de entorno
Debes configurar en Vercel (Project Settings → Environment Variables):
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` = tu clave de Google (habilitar Maps JavaScript API y Places API)

## Uso
1. Abre `/mapa`
2. Escribe Origen, Destino y Waypoints (opcional), y haz clic en **Generar ruta**.
3. Puedes arrastrar la ruta en el mapa para ajustar el recorrido.
4. Pega tu catálogo de peajes en JSON y presiona **Cargar peajes**.
5. Ajusta el umbral de detección si lo necesitas.

## Tip
Si la detección no encuentra un peaje que está sobre la vía, incrementa el umbral (por ejemplo 300–500 m).
