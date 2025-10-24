"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type Toll = { name: string; lat: number; lng: number; cost: number; radiusMeters?: number };

type Props = {
  initialOrigin?: string;
  initialDestination?: string;
  initialWaypoints?: Array<{ location: google.maps.LatLngLiteral | string }>;
  tollsCatalog?: Toll[];
  onDistanceChange?: (km: number) => void;
  onTollsChange?: (totalUSD: number, hits: Toll[]) => void;
  onRouteChange?: (data: {
    origin: string;
    destination: string;
    waypoints: string[];
    routeName?: string;
  }) => void;
  showTollsEditor?: boolean;
  onBorderCrossing?: (crossed: boolean) => void;
  onCountryKm?: (data: { RL: boolean; kmEC: number; kmPE: number}) => void;
};

const DEFAULT_TOLLS: Toll[] = [
  { name: "PINTAG", lat: -0.3162990164, lng: -78.3679148792, cost: 12.0 },
  { name: "CADENA", lat: -1.7785029485, lng: -80.2946557717, cost: 12.0 },
  { name: "CHIVERIA/SALITRE", lat: -1.9479212065, lng: -80.0121586935, cost: 12.0 },
  { name: "PROGRESO", lat: -2.5654404175, lng: -80.390849785, cost: 12.0 },
  { name: "CHONGON", lat: -2.2220812691, lng: -80.0894121547, cost: 12.0 },
  { name: "PANCALEO", lat: -1.0738072702, lng: -78.5961022978, cost: 12.0 },
  { name: "SAN ANDRES", lat: -1.5748054007, lng: -78.7161636124, cost: 12.0 },
  { name: "MACHACHI", lat: -0.5458101832, lng: -78.585372261, cost: 12.0 },
  { name: "GOB PROVINCIAL DE LOS TSACHILAS", lat: -0.2757445935, lng: -79.0778689346, cost: 12.0 },
  { name: "LOS ANGELES", lat: -0.6902675492, lng: -79.4626554722, cost: 12.0 },
  { name: "CONGOMA", lat: -0.3597579431, lng: -79.2570198951, cost: 12.0 },
  { name: "PAN", lat: -2.0463756072, lng: -79.7968842157, cost: 12.0 },
  { name: "NARANJAL", lat: -2.5538646868, lng: -79.5506578966, cost: 12.0 },
  { name: "MILAGRO", lat: -2.2310036916, lng: -79.6398101674, cost: 12.0 },
  { name: "BOLICHE", lat: -2.2022161237, lng: -79.7534180399, cost: 12.0 },
  { name: "LA AVANZADA", lat: -3.5255312091, lng: -79.9936985859, cost: 12.0 },
  { name: "GARRIDO", lat: -3.1266593587223754, lng: -79.7762697926154, cost: 12.0 },
  { name: "JAIME ROLDOS", lat: -2.7952894633, lng: -79.7061981095, cost: 12.0 },
  { name: "SERPENTIN", lat: -11.743974955, lng: -77.1649078525, cost: 35.66 },
  { name: "PARAISO (HUACHO)", lat: -11.1914738393, lng: -77.5714041605, cost: 35.66 },
  { name: "FORTALEZA", lat: -10.6025104395, lng: -77.8710436897, cost: 36.92 },
  { name: "HUARMEY", lat: -9.9241887371, lng: -78.2200381219, cost: 36.28 },
  { name: "CASMA (ANCASH)", lat: -9.2965783589, lng: -78.4126386261, cost: 37.6 },
  { name: "SANTA", lat: -9.0491670632, lng: -78.515638473, cost: 30.04 },
  { name: "VIRU", lat: -8.3781225328, lng: -78.860087293, cost: 37.6 },
  { name: "CHICAMA", lat: -7.8760235374, lng: -79.1321020244, cost: 36.22 },
  { name: "PACANGUILLA", lat: -7.1119217459, lng: -79.4968601182, cost: 35.82 },
  { name: "MORROPE", lat: -6.5009298865, lng: -80.0722009184, cost: 28.94 },
  { name: "BAYOVAR", lat: -5.6928667421, lng: -80.5626875064, cost: 27.51 },
  { name: "SULLANA", lat: -5.0386733023, lng: -80.7015871764, cost: 36.06 },
  { name: "TALARA", lat: -4.6014502442, lng: -81.1632251495, cost: 11.14, radiusMeters: 500 },
  { name: "CANCAS", lat: -3.9323499342, lng: -80.916840906, cost: 11.14 },
  { name: "MONTERRICO", lat: -12.0676160806, lng: -76.971702123, cost: 22.62 },
  { name: "JAHUAY", lat: -13.3870450224, lng: -76.2018885707, cost: 66.52 },
  { name: "TAMBOGRANDE", lat: -4.9345321799, lng: -80.5468530932, cost: 18.03 },
  {name:"DURAN/TAMBO",lat: -2.219504243, lng: -79.77147501, cost: 12.0},
];

declare global {
  interface Window {
    initMap: () => void;
  }
}

export default function RoutePlanner(props: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const originRef = useRef<HTMLInputElement | null>(null);
  const destRef = useRef<HTMLInputElement | null>(null);
  const waypointsContainerRef = useRef<HTMLDivElement | null>(null);
  const tollsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const thresholdRef = useRef<HTMLInputElement | null>(null);
  const showEditor = props.showTollsEditor ?? false;
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const HUAQUILLAS = { lat: -3.4819, lng: -80.2141 };
  const HUAQUILLAS_RADIUS_M = 2000; // 4 km aprox, ajusta si necesitas


  const [ready, setReady] = useState(false);
  const [distanceKm, setDistanceKm] = useState<string>("—");
  const [tollCount, setTollCount] = useState<number>(0);
  const [tollTotal, setTollTotal] = useState<string>("—");
  const [tollList, setTollList] = useState<Toll[]>([]);

  const [mapObj, setMapObj] = useState<google.maps.Map | null>(null);
  const [renderer, setRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [service, setService] = useState<google.maps.DirectionsService | null>(null);
  const [autoCompletes, setAutoCompletes] = useState<google.maps.places.Autocomplete[]>([]);
  const [tollMarkers, setTollMarkers] = useState<google.maps.Marker[]>([]);
  const [currentTolls, setCurrentTolls] = useState<Toll[]>(props.tollsCatalog || DEFAULT_TOLLS);
  const [waypointInputs, setWaypointInputs] = useState<HTMLInputElement[]>([]);
  

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Pinta los peajes en el textarea (editable)
  useEffect(() => {
    if (showEditor && tollsTextareaRef.current) {
      tollsTextareaRef.current.value = JSON.stringify(DEFAULT_TOLLS, null, 2);
    }
  }, []);

  // Init map when script loads
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: -1.8312, lng: -78.1834 },
      zoom: 6,
      mapTypeControl: false,
    });
    setMapObj(map);

    const ds = new google.maps.DirectionsService();
    setService(ds);

    const dr = new google.maps.DirectionsRenderer({ draggable: true, map });
    setRenderer(dr);

    dr.addListener("directions_changed", () => {
      const res = dr.getDirections();
      if (res) processDirections(res);
      scrollSummaryIntoView();
    });

    // Autocomplete para inputs (EC y PE)
    const opts: google.maps.places.AutocompleteOptions = {
      fields: ["place_id", "geometry", "name"],
    };
    const ac: google.maps.places.Autocomplete[] = [];
    if (originRef.current) ac.push(new google.maps.places.Autocomplete(originRef.current, opts));
    if (destRef.current) ac.push(new google.maps.places.Autocomplete(destRef.current, opts));
    setAutoCompletes(ac);


    // Waypoints iniciales (si vienen como props)
    clearWaypoints();
    if (props.initialWaypoints && props.initialWaypoints.length > 0) {
      props.initialWaypoints.forEach((wp) => addWaypointInput(typeof wp.location === "string" ? wp.location : ""));
    } else {
      // agrega 2 inputs vacíos por comodidad
      addWaypointInput();
      addWaypointInput();
    }

    // Marcadores de peajes
    renderTollMarkers(map, currentTolls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Rellena inputs con props iniciales al montar / cambiar
  useEffect(() => {
    if (originRef.current && props.initialOrigin) originRef.current.value = props.initialOrigin;
    if (destRef.current && props.initialDestination) destRef.current.value = props.initialDestination;
  }, [props.initialOrigin, props.initialDestination]);

  // Si viene un catálogo desde props, actualízalo
  useEffect(() => {
    if (props.tollsCatalog) setCurrentTolls(props.tollsCatalog);
  }, [props.tollsCatalog]);

  function addWaypointInput(val: string = "") {
    if (!waypointsContainerRef.current) return;

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Waypoint (opcional)";
    input.className = "w-full rounded-lg border border-gray-300 px-3 py-2";
    (input as HTMLInputElement).value = val;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Quitar";
    removeBtn.className = "rounded-lg border px-3 py-2 text-sm";
    removeBtn.onclick = () => {
      waypointsContainerRef.current?.removeChild(wrapper);
      setWaypointInputs((prev) => prev.filter((i) => i !== input));
    };

    const wrapper = document.createElement("div");
    wrapper.className = "flex items-center gap-2 mb-2";
    wrapper.appendChild(input);
    wrapper.appendChild(removeBtn);
    waypointsContainerRef.current?.appendChild(wrapper);

    // Autocomplete para cada waypoint
    const ac = new google.maps.places.Autocomplete(input);
    setAutoCompletes((prev) => [...prev, ac]);
    setWaypointInputs((prev) => [...prev, input]);
  }

  function clearWaypoints() {
    if (!waypointsContainerRef.current) return;
    waypointsContainerRef.current.innerHTML = "";
    setWaypointInputs([]);
  }

  function getLocationFromInput(inputEl: HTMLInputElement | null) {
    const text = (inputEl?.value || "").trim();
    // Si usas Autocomplete y quieres priorizar place_id:
    // (si no tienes esto montado, deja solo el return text)
    try {
      const ac = (window as any)._acMap?.get?.(inputEl); // opcional si guardas refs de Autocomplete
      const place = ac?.getPlace?.();
      if (place?.place_id) return { placeId: place.place_id };
    } catch {}
    return text || undefined;
  }

  function buildRouteFromInputs() {
    if (!service || !renderer) return;

    const originLoc = getLocationFromInput(originRef.current);
    const destLoc   = getLocationFromInput(destRef.current);

    if (!originLoc || !destLoc) {
      alert("Por favor ingresa Origen y Destino.");
      return;
    }

    // 1) Lee los waypoints como “Destinos C, D, …” (en ese orden)
    const extraStops = waypointInputs
      .map(i => getLocationFromInput(i))
      .filter(Boolean) as any[];

    // 2) Construye TODAS las paradas en orden: A (origen), B (destino), C... (waypoints)
    const stops = [originLoc, destLoc, ...extraStops];

    // 3) Arma el request: origin = primero, destination = último, waypoints = intermedios
    const origin = stops[0];
    const destination = stops[stops.length - 1];
    const wps = stops.slice(1, -1).map(loc => ({ location: loc, stopover: true }));

    const req: google.maps.DirectionsRequest = {
      origin,
      destination,
      waypoints: wps,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false,          // ← IMPORTANTE para respetar tu orden
      provideRouteAlternatives: false,
    };

    service.route(req, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        renderer.setDirections(result);
        processDirections(result);
        // si tienes el helper:
        scrollSummaryIntoView?.();
      } else if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
        alert("No se encontró ruta. Elige las opciones del Autocomplete o especifica ciudad/país.");
      } else {
        alert("No se pudo generar la ruta: " + status);
      }
    });
  }

  function getDensePathFrom(result: google.maps.DirectionsResult): google.maps.LatLng[] {
    const pts: google.maps.LatLng[] = [];
    const route = result.routes[0];
    if (!route) return pts;
    for (const leg of route.legs) {
      for (const step of leg.steps) {
        if (step.path?.length) pts.push(...step.path);
      }
    }
    return pts;
  }

  // Interpola puntos cada N metros entre pares para evitar “saltos”
  function densifyPath(points: google.maps.LatLng[], everyMeters = 100): google.maps.LatLng[] {
    if (points.length < 2) return points;
    const out: google.maps.LatLng[] = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const dist = google.maps.geometry.spherical.computeDistanceBetween(a, b);
      const steps = Math.max(1, Math.floor(dist / everyMeters));
      for (let s = 1; s <= steps; s++) {
        const frac = s / (steps + 1);
        out.push(new google.maps.LatLng(
          a.lat() + (b.lat() - a.lat()) * frac,
          a.lng() + (b.lng() - a.lng()) * frac
        ));
      }
      out.push(b);
    }
    return out;
  }

  function distPointToSeg(p: google.maps.LatLng, a: google.maps.LatLng, b: google.maps.LatLng) {
    const l2 = google.maps.geometry.spherical.computeDistanceBetween(a, b) ** 2;
    if (l2 === 0) return google.maps.geometry.spherical.computeDistanceBetween(p, a);

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const av = { x: toRad(a.lng()), y: toRad(a.lat()) };
    const bv = { x: toRad(b.lng()), y: toRad(b.lat()) };
    const pv = { x: toRad(p.lng()), y: toRad(p.lat()) };

    const vx = bv.x - av.x, vy = bv.y - av.y;
    const wx = pv.x - av.x, wy = pv.y - av.y;
    let t = (vx * wx + vy * wy) / (vx * vx + vy * vy);
    t = Math.max(0, Math.min(1, t));

    const proj = new google.maps.LatLng(
      a.lat() + (b.lat() - a.lat()) * t,
      a.lng() + (b.lng() - a.lng()) * t
    );
    return google.maps.geometry.spherical.computeDistanceBetween(p, proj);
  }

  function touchesHuaquillas(path: google.maps.LatLng[], radiusMeters = HUAQUILLAS_RADIUS_M) {
    if (!path || path.length < 2) return false;
    const P = new google.maps.LatLng(HUAQUILLAS.lat, HUAQUILLAS.lng);

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];

      // filtro barato para no calcular de más
      const minEnd = Math.min(
        google.maps.geometry.spherical.computeDistanceBetween(P, a),
        google.maps.geometry.spherical.computeDistanceBetween(P, b)
      );
      if (minEnd > 10000) continue; // ambos extremos a >10km

      if (distancePointToSegment(P, a, b) <= radiusMeters) return true;
    }
    return false;
  }

  function dedupeTolls(list: Toll[]): Toll[] {
    // Preferimos la clave por nombre; si temes nombres repetidos,
    // usa también una llave geo redondeada.
    const seen = new Set<string>();
    const out: Toll[] = [];
    for (const t of list) {
      const key =
        (t.name?.trim().toLowerCase() || "") +
        "|" +
        Math.round(t.lat * 1e5) +
        "|" +
        Math.round(t.lng * 1e5);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(t);
      }
    }
    return out;
  }

  /** Devuelve los km desde que el path entra en el radio del punto frontera hasta el final. */
  function kmFromBorder(
    path: google.maps.LatLng[],
    border: { lat: number; lng: number },
    radiusMeters: number
  ): number {
    if (!path || path.length < 2) return 0;
    const borderLL = new google.maps.LatLng(border.lat, border.lng);

    // Precalcula qué puntos están dentro del radio del cruce
    const inside: boolean[] = path.map(p =>
      google.maps.geometry.spherical.computeDistanceBetween(p, borderLL) <= radiusMeters
    );

    // primer índice “dentro del radio”
    const firstIn = inside.findIndex(Boolean);
    if (firstIn < 0) return 0; // nunca se acercó a la frontera

    // último índice “dentro del radio”
    let lastIn = -1;
    for (let i = inside.length - 1; i >= 0; i--) {
      if (inside[i]) { lastIn = i; break; }
    }

    // ¿la ruta EMPIEZA en Perú? (al sur del paralelo de Huaquillas)
    const startsInPeru = path[0].lat() < border.lat;

    let startIdx: number;
    let endIdx: number;

    if (lastIn > firstIn) {
      // IDA Y VUELTA: tramo peruano = entre el primer y último contacto
      startIdx = firstIn;
      endIdx = lastIn;
    } else {
      // SOLO IDA: decidir desde dónde hasta dónde sumar
      if (startsInPeru) {
        // empieza en Perú y cruza hacia Ecuador
        startIdx = 0;
        endIdx = firstIn; // hasta tocar la frontera
      } else {
        // empieza en Ecuador y cruza hacia Perú
        startIdx = firstIn;       // desde tocar la frontera
        endIdx = path.length - 1; // hasta el final
      }
    }

    // Suma distancias en ese rango
    let meters = 0;
    for (let i = startIdx; i < endIdx; i++) {
      meters += google.maps.geometry.spherical.computeDistanceBetween(path[i], path[i + 1]);
    }
    return meters / 1000; // km
  }


  function processDirections(result: google.maps.DirectionsResult) {
    const route = result.routes[0];
    if (!route) return;

    // km totales
    let meters = 0;
    route.legs.forEach(leg => meters += leg.distance?.value || 0);
    const kmNum = meters / 1000;
    setDistanceKm((meters / 1000).toFixed(2));

    // camino denso + densificación
    let path = getDensePathFrom(result);
    path = densifyPath(path, 80); // cada ~80 m

    const defaultThreshold = parseFloat(
      (thresholdRef.current?.value || (showEditor ? "250" : "400"))
    );
    const found = detectTollsAlongPath(path, currentTolls, defaultThreshold);

    setTollList(found);
    setTollCount(found.length);
    setTollTotal(found.reduce((a, t) => a + (t.cost || 0), 0).toFixed(2));

    // Callbacks
    props.onDistanceChange?.(meters / 1000);
    props.onTollsChange?.(
      found.reduce((a, t) => a + (t.cost || 0), 0),
      found
    );
    props.onRouteChange?.({
      origin: route.legs[0]?.start_address || "",
      destination: route.legs[route.legs.length - 1]?.end_address || "",
      waypoints: route.legs.slice(1, -1).map(leg => leg.start_address || ""),
      routeName: route.summary || undefined,
    });

    const crossed = touchesHuaquillas(path);
    props.onBorderCrossing?.(crossed);

    if (kmNum >= 1600){
      const kmPE = kmFromBorder(path, HUAQUILLAS, HUAQUILLAS_RADIUS_M);
      const kmEC = kmNum - kmPE;
      const RL = true;
      props.onCountryKm?.({
        RL,
        kmEC: Math.round(kmEC),
        kmPE: Math.round(kmPE),
      });
    } else {
      const kmEC = 0;
      const kmPE = 0;
      const RL = false;
      props.onCountryKm?.({
        RL,
        kmEC: Math.round(kmEC),
        kmPE: Math.round(kmPE),
      });
    }
  }



  function detectTollsAlongPath(
    pathLatLngs: google.maps.LatLng[],
    tolls: Toll[],
    defaultThresholdMeters: number
  ): Toll[] {
    const found: Toll[] = [];
    if (!pathLatLngs || pathLatLngs.length < 2) return found;

    for (const t of tolls) {
      const p = new google.maps.LatLng(t.lat, t.lng);
      const radius = t.radiusMeters ?? defaultThresholdMeters;

      let hit = false;
      for (let i = 0; i < pathLatLngs.length - 1; i++) {
        const a = pathLatLngs[i], b = pathLatLngs[i + 1];

        // filtro aproximado: si ambos extremos están >5km, sigue
        const minEnd = Math.min(
          google.maps.geometry.spherical.computeDistanceBetween(p, a),
          google.maps.geometry.spherical.computeDistanceBetween(p, b)
        );
        if (minEnd > 5000) continue;

        const d = distancePointToSegment(p, a, b);
        if (d <= radius) { hit = true; break; }
      }

      if (hit) {
        // evitar duplicados por ida/vuelta
        if (!found.some(x => x.name === t.name)) found.push(t);
      }
    }
    return found;
  }



  function distancePointToSegment(p: google.maps.LatLng, v: google.maps.LatLng, w: google.maps.LatLng) {
    const l2 = google.maps.geometry.spherical.computeDistanceBetween(v, w) ** 2;
    if (l2 === 0) return google.maps.geometry.spherical.computeDistanceBetween(p, v);

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const v2 = { x: toRad(v.lng()), y: toRad(v.lat()) };
    const w2 = { x: toRad(w.lng()), y: toRad(w.lat()) };
    const p2 = { x: toRad(p.lng()), y: toRad(p.lat()) };

    const vx = w2.x - v2.x, vy = w2.y - v2.y;
    const wx = p2.x - v2.x, wy = p2.y - v2.y;
    const c1 = vx * wx + vy * wy;
    const c2 = vx * vx + vy * vy;
    let t = c1 / c2;
    t = Math.max(0, Math.min(1, t));

    const proj = new google.maps.LatLng(
      v.lat() + (w.lat() - v.lat()) * t,
      v.lng() + (w.lng() - v.lng()) * t
    );
    return google.maps.geometry.spherical.computeDistanceBetween(p, proj);
  }

  function loadTollsFromTextarea() {
    try {
      const txt = tollsTextareaRef.current?.value || "[]";
      const data = JSON.parse(txt);
      if (!Array.isArray(data)) throw new Error("Debe ser un arreglo JSON.");
      const mapped = data.map((t: any) => ({
        name: String(t.name || "Peaje"),
        lat: Number(t.lat),
        lng: Number(t.lng),
        cost: Number(t.cost || 0),
      })) as Toll[];
      setCurrentTolls(mapped);
      if (mapObj) renderTollMarkers(mapObj, mapped);
      alert(`Peajes cargados (${mapped.length}).`);
    } catch (e: any) {
      alert("JSON inválido: " + e.message);
    }
  }

  function exportTollsToTextarea() {
    if (!tollsTextareaRef.current) return;
    tollsTextareaRef.current.value = JSON.stringify(currentTolls, null, 2);
    alert("Peajes exportados al cuadro de texto.");
  }

  function renderTollMarkers(map: google.maps.Map, tolls: Toll[]) {
    // Borrar anteriores
    tollMarkers.forEach((m) => m.setMap(null));
    setTollMarkers([]);
    const ms: google.maps.Marker[] = [];
    tolls.forEach((t) => {
      const m = new google.maps.Marker({
        position: { lat: t.lat, lng: t.lng },
        map,
        title: `${t.name} ($${Number(t.cost).toFixed(2)})`,
      });
      ms.push(m);
    });
    setTollMarkers(ms);
  }

  function scrollSummaryIntoView() {
  // Opción 1: usar scrollIntoView (simple)
  summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // (Opcional) Opción 2: calcular desplazamiento manual
  // if (leftPanelRef.current && summaryRef.current) {
  //   const top = summaryRef.current.offsetTop - 12; // margen
  //   leftPanelRef.current.scrollTo({ top, behavior: "smooth" });
  // }
  }

  return (
    <div className="grid h-[calc(100vh-2rem)] grid-cols-[360px_1fr] gap-0 rounded-xl border border-gray-200 bg-white shadow-sm">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey || ""}&libraries=places,geometry`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />

      <div ref={leftPanelRef} className="h-full overflow-auto p-4 border-r">
      <h2 className="mb-2 text-xl font-semibold">Planificador de Ruta con Peajes</h2>
      <p className="text-sm text-gray-600">
        Arrastra la ruta en el mapa para ajustar el recorrido. Se recalculan kilómetros y peajes automáticamente.
      </p>

      {/* Origen / Destino / Waypoints */}
      <div className="mt-4 space-y-4">
        <div>
          <label className="text-xs text-gray-700">Origen</label>
          <input
            ref={originRef}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Ej: Puerto Bolívar, Ecuador"
            defaultValue={props.initialOrigin || "LOGISBUR SA - Centro Logístico, Via Balosa Machala, Machala, Ecuador"}
          />
        </div>
        <div>
          <label className="text-xs text-gray-700">Destino</label>
          <input
            ref={destRef}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Ej: Quito, Ecuador"
            defaultValue={props.initialDestination || ""}
          />
        </div>
        <div>
          <label className="text-xs text-gray-700">Waypoints</label>
          <div ref={waypointsContainerRef} className="mt-1" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => addWaypointInput()} className="rounded-lg border px-3 py-2 text-sm">+ Añadir waypoint</button>
            <button onClick={clearWaypoints} className="rounded-lg border px-3 py-2 text-sm">Limpiar</button>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Los waypoints se consideran paradas <b>después del destino</b>. Para ida y vuelta, añade de waypoint el mismo origen.
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={buildRouteFromInputs} className="rounded-lg bg-gray-900 px-3 py-2 text-white">
            Generar ruta
          </button>
        </div>
      </div>

      {/* === Resumen + Detalle SIEMPRE visible === */}
      <div ref={summaryRef} className="border-t pt-4">
        <div className="flex items-center justify-between">
          <span className="inline-block rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800">Resumen</span>
          <span className="text-xs text-gray-500">Unidades: km y USD</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div>Distancia total</div>
          <div className="font-semibold">{distanceKm} km</div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div>Peajes en ruta</div>
          <div className="font-semibold">{tollCount}</div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div>Total peajes</div>
          <div className="font-semibold tabular-nums">${tollTotal}</div>
        </div>

        <div className="mt-3 rounded-lg border border-dashed p-2">
          <div className="mb-1 font-semibold">Detalle de peajes detectados</div>
          {tollList.length === 0 ? (
            <div className="text-sm text-gray-500">—</div>
          ) : (
            <div className="space-y-1">
              {tollList.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{t.name}</span>
                  <span className="tabular-nums">${t.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* === Catálogo JSON SOLO si showEditor === */}
      {showEditor && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="inline-block rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800">
              Catálogo de Peajes
            </span>
            <span className="text-xs text-gray-500">Edita y pega tus coordenadas/costos</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Formato: [{"{"}"name":"Peaje X","lat":-3.26,"lng":-79.96,"cost":1.50{"}"} , ...]
          </div>
          <textarea
            ref={tollsTextareaRef}
            className="mt-2 h-36 w-full rounded-lg border border-gray-300 p-2 font-mono text-sm"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={loadTollsFromTextarea} className="rounded-lg border px-3 py-2 text-sm">Cargar peajes</button>
            <button onClick={exportTollsToTextarea} className="rounded-lg border px-3 py-2 text-sm">Exportar JSON</button>
          </div>
          <div className="mt-2">
            <label className="text-xs text-gray-700">Umbral de detección (m)</label>
            <input ref={thresholdRef} defaultValue="500" type="number" className="ml-2 w-24 rounded-lg border border-gray-300 px-2 py-1" />
          </div>
        </div>
      )}

      <div className="border-t pt-4 text-xs text-gray-500">
        © LOGISBUR — Utilidad interna. Requiere Maps JavaScript API y Places API.
      </div>
    </div>


      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
}
