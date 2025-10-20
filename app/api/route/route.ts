import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

async function getPeajes() {
  const csvPath = path.join(process.cwd(), 'app/api/route/Peajes.csv');
  const fileContent = await fs.readFile(csvPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true
  });
  return records;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const origin = url.searchParams.get('origin');
    const destination = url.searchParams.get('destination');
    
    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origen y destino son requeridos' }, { status: 400 });
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!key) {
      return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${key}`
    );

    const data = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json({ error: 'Error obteniendo la ruta' }, { status: 500 });
    }

    const route = data.routes[0];
    const leg = route.legs[0];
    const distance = leg.distance.value / 1000;
    const duration = leg.duration.value / 60;
    const polyline = route.overview_polyline.points;

    // Obtener peajes
    const peajes = await getPeajes();

    return NextResponse.json({
      distance,
      duration,
      polyline,
      bounds: route.bounds,
      peajes,
      route: data.routes[0]
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 });
  }
}