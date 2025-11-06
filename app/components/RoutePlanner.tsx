/* app/components/RoutePlanner.tsx */
"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

/* ===== Tipos ===== */
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
  onCountryKm?: (data: { RL: boolean; kmEC: number; kmPE: number }) => void;
};

declare global {
  interface Window {
    initMap: () => void;
  }
}

/* ===== Catálogo por defecto ===== */
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
  { name: "DURAN/TAMBO", lat: -2.219504243, lng: -79.77147501, cost: 12.0 },
];

export default function RoutePlanner(props: Props) {
  /* ===== Refs de DOM ===== */
  const mapRef = useRef<HTMLDivElement | null>(null);
  const originRef = useRef<HTMLInputElement | null>(null);
  const destRef = useRef<HTMLInputElement | null>(null);
  const waypointsContainerRef = useRef<HTMLDivElement | null>(null);
  const tollsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const thresholdRef = useRef<HTMLInputElement | null>(null);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);

  /* ===== Estado/UI ===== */
  const showEditor = props.showTollsEditor ?? false;
  const [ready, setReady] = useState(false);
  const [distanceKm, setDistanceKm] = useState<string>("—");
  const [tollCount, setTollCount] = useState<number>(0);
  const [tollTotal, setTollTotal] = useState<string>("—");
  const [tollList, setTollList] = useState<Toll[]>([]);
  const [mapObj, setMapObj] = useState<google.maps.Map | null>(null);
  const [renderer, setRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [service, setService] = useState<google.maps.DirectionsService | null>(null);
  const [autoCompletes, setAutoCompletes] = useState<google.maps.places.Autocomplete[]>([]);
  const acMapRef = useRef<Map<HTMLInputElement, google.maps.places.Autocomplete>>(new Map());

  // Solo para mostrar en UI si quieres; la limpieza real usa ref:
  const [tollMarkers, setTollMarkers] = useState<google.maps.Marker[]>([]);

  /* ===== Refs de estado persistente ===== */
  const lastCenterRef = useRef<google.maps.LatLngLiteral | null>(null);
  const lastZoomRef = useRef<number | null>(null);
  const lastDirectionsRef = useRef<google.maps.DirectionsResult | null>(null);
  const tollMarkersRef = useRef<google.maps.Marker[]>([]);
  const serviceRef = useRef<google.maps.DirectionsService | null>(null);
  const isRecreatingRef = useRef(false);

  /* ===== Otros ===== */
  const [currentTolls, setCurrentTolls] = useState<Toll[]>(props.tollsCatalog || DEFAULT_TOLLS);
  const [waypointInputs, setWaypointInputs] = useState<HTMLInputElement[]>([]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const HUAQUILLAS = { lat: -3.4819, lng: -80.2141 };
  const HUAQUILLAS_RADIUS_M = 2000;

  /* ===== Helpers de repintado ===== */
  const hasCanvas = () => !!mapRef.current?.querySelector("canvas");

  function safeResize() {
    if (!mapObj) return;
    // @ts-ignore
    google.maps.event.trigger(mapObj, "resize");
    const c = mapObj.getCenter();
    const z = mapObj.getZoom();
    if (c && typeof z === "number") {
      mapObj.setZoom(z);
      mapObj.setCenter(c);
    }
    // Evitar llamar renderer.setMap en cada resize para no parpadear
  }

  function recreateMap(reason: "pageshow" | "visibilitychange" | "visible") {
    const host = mapRef.current;
    if (!host) return;

    const rect = host.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      requestAnimationFrame(() => recreateMap(reason));
      return;
    }

    try { renderer?.setMap(null); } catch {}
    try { tollMarkersRef.current.forEach(m => m.setMap(null)); } catch {}
    tollMarkersRef.current = [];

    const newMap = new google.maps.Map(host, {
      center: lastCenterRef.current || { lat: -1.8312, lng: -78.1834 },
      zoom: lastZoomRef.current ?? 6,
      mapTypeControl: false,
    });
    setMapObj(newMap);

    const newService = new google.maps.DirectionsService();
    setService(newService);
    serviceRef.current = newService;

    const newRenderer = new google.maps.DirectionsRenderer({ draggable: true, map: newMap });
    setRenderer(newRenderer);

    // Reinyecta ruta si existía
    if (lastDirectionsRef.current) {
      newRenderer.setDirections(lastDirectionsRef.current);
    }

    renderTollMarkers(newMap, currentTolls);

    // @ts-ignore
    google.maps.event.trigger(newMap, "resize");
    const c = newMap.getCenter(); const z = newMap.getZoom();
    if (c && typeof z === "number") { newMap.setZoom(z); newMap.setCenter(c); }
  }

  function maybeResurrect(reason: "pageshow" | "visibilitychange" | "visible") {
    if (isRecreatingRef.current) return;
    if (hasCanvas()) {
      safeResize();
      return;
    }
    isRecreatingRef.current = true;
    requestAnimationFrame(() => {
      recreateMap(reason);
      setTimeout(() => { isRecreatingRef.current = false; }, 150);
    });
  }

  /* ===== Inicialización del mapa ===== */
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
    serviceRef.current = ds;

    const dr = new google.maps.DirectionsRenderer({ draggable: true, map });
    setRenderer(dr);

    dr.addListener("directions_changed", () => {
      const res = dr.getDirections();
      if (res) {
        lastDirectionsRef.current = res;
        processDirections(res);
      }
      scrollSummaryIntoView();
    });

    // Autocomplete en inputs (origen/destino) con listeners y guardado en mapa
    const opts: google.maps.places.AutocompleteOptions = {
      fields: ["place_id", "geometry", "name", "formatted_address"],
      // opcional: restringe a EC/PE si quieres resultados más relevantes
      // componentRestrictions: { country: ["ec", "pe"] },
    };
    const acList: google.maps.places.Autocomplete[] = [];

    if (originRef.current) {
      const acOrigin = new google.maps.places.Autocomplete(originRef.current, opts);
      acOrigin.bindTo("bounds", map);
      acOrigin.addListener("place_changed", () => {
        const place = acOrigin.getPlace();
        // muestra algo legible en el input
        if (place?.formatted_address) originRef.current!.value = place.formatted_address;
        else if (place?.name) originRef.current!.value = place.name;
      });
      acMapRef.current.set(originRef.current, acOrigin);
      acList.push(acOrigin);
    }

    if (destRef.current) {
      const acDest = new google.maps.places.Autocomplete(destRef.current, opts);
      acDest.bindTo("bounds", map);
      acDest.addListener("place_changed", () => {
        const place = acDest.getPlace();
        if (place?.formatted_address) destRef.current!.value = place.formatted_address;
        else if (place?.name) destRef.current!.value = place.name;
      });
      acMapRef.current.set(destRef.current, acDest);
      acList.push(acDest);
    }

    setAutoCompletes(acList);


    // Waypoints iniciales
    clearWaypoints();
    if (props.initialWaypoints?.length) {
      props.initialWaypoints.forEach((wp) => addWaypointInput(typeof wp.location === "string" ? wp.location : ""));
    } else {
      addWaypointInput();
      addWaypointInput();
    }

    // Marcadores
    renderTollMarkers(map, currentTolls);

    // Cleanup (sin tocar mapRef.current)
    return () => {
      try { tollMarkersRef.current.forEach(m => m.setMap(null)); } catch {}
      try { dr.setMap(null); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /* ===== Guardar centro/zoom con idle (cleanup seguro) ===== */
  useEffect(() => {
    if (!mapObj) return;

    const listener = mapObj.addListener("idle", () => {
      const c = mapObj.getCenter();
      if (c) lastCenterRef.current = { lat: c.lat(), lng: c.lng() };
      lastZoomRef.current = mapObj.getZoom() ?? null;
    });

    return () => {
      try {
        if (listener && typeof (listener as any).remove === "function") {
          (listener as any).remove();
        } else {
          google.maps.event.clearListeners(mapObj, "idle");
        }
      } catch {}
    };
  }, [mapObj]);

  /* ===== Observadores de visibilidad/tamaño y bfcache ===== */
  useEffect(() => {
    const onPageShow = (e: any) => {
      if (e && e.persisted) { maybeResurrect("pageshow"); return; }
      requestAnimationFrame(() => maybeResurrect("pageshow"));
    };
    const onVisible = () => {
      if (!document.hidden) requestAnimationFrame(() => maybeResurrect("visibilitychange"));
    };
    const onWindowResize = () => {
      if (mapObj) {
        // @ts-ignore
        google.maps.event.trigger(mapObj, "resize");
      }
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("resize", onWindowResize);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("resize", onWindowResize);
    };
  }, [mapObj]);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;

    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) requestAnimationFrame(() => maybeResurrect("visible"));
    }, { threshold: 0.01 });

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) requestAnimationFrame(() => maybeResurrect("visible"));
    });

    io.observe(el);
    ro.observe(el);

    return () => { io.disconnect(); ro.disconnect(); };
  }, []);

  /* ===== Otros efectos ===== */
  useEffect(() => {
    if (showEditor && tollsTextareaRef.current) {
      tollsTextareaRef.current.value = JSON.stringify(DEFAULT_TOLLS, null, 2);
    }
  }, [showEditor]);

  useEffect(() => {
    if (originRef.current && props.initialOrigin) originRef.current.value = props.initialOrigin;
    if (destRef.current && props.initialDestination) destRef.current.value = props.initialDestination;
  }, [props.initialOrigin, props.initialDestination]);

  useEffect(() => {
    if (props.tollsCatalog) setCurrentTolls(props.tollsCatalog);
  }, [props.tollsCatalog]);

  /* ===== Lógica de UI ===== */
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

    // Autocomplete para cada waypoint (con listeners + guardado)
    const ac = new google.maps.places.Autocomplete(input, {
      fields: ["place_id", "geometry", "name", "formatted_address"],
      // componentRestrictions: { country: ["ec", "pe"] }, // opcional
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (place?.formatted_address) input.value = place.formatted_address;
      else if (place?.name) input.value = place.name;
    });
    acMapRef.current.set(input, ac);

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
    try {
      if (inputEl) {
        const ac = acMapRef.current.get(inputEl);
        const place = ac?.getPlace?.();
        // Si el usuario seleccionó una sugerencia, usa place_id
        if (place?.place_id) return { placeId: place.place_id };
      }
    } catch {}
    // Si no seleccionó nada del dropdown, usa el texto tal cual (Maps puede resolverlo)
    return text || undefined;
  }
  

  function buildRouteFromInputs() {
    const svc = serviceRef.current || service;
    if (!svc || !renderer) return;

    const originLoc = getLocationFromInput(originRef.current);
    const destLoc = getLocationFromInput(destRef.current);
    if (!originLoc || !destLoc) {
      alert("Por favor ingresa Origen y Destino.");
      return;
    }

    const extraStops = waypointInputs.map(i => getLocationFromInput(i)).filter(Boolean) as any[];
    const stops = [originLoc, destLoc, ...extraStops];
    const origin = stops[0];
    const destination = stops[stops.length - 1];
    const wps = stops.slice(1, -1).map(loc => ({ location: loc, stopover: true }));

    const req: google.maps.DirectionsRequest = {
      origin,
      destination,
      waypoints: wps,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: false,
      provideRouteAlternatives: false,
    };

    svc.route(req, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        renderer.setDirections(result);
        lastDirectionsRef.current = result;
        processDirections(result);
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

  function touchesHuaquillas(path: google.maps.LatLng[], radiusMeters = HUAQUILLAS_RADIUS_M) {
    if (!path || path.length < 2) return false;
    const P = new google.maps.LatLng(HUAQUILLAS.lat, HUAQUILLAS.lng);

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const minEnd = Math.min(
        google.maps.geometry.spherical.computeDistanceBetween(P, a),
        google.maps.geometry.spherical.computeDistanceBetween(P, b)
      );
      if (minEnd > 10000) continue;
      if (distancePointToSegment(P, a, b) <= radiusMeters) return true;
    }
    return false;
  }

  function kmFromBorder(
    path: google.maps.LatLng[],
    border: { lat: number; lng: number },
    radiusMeters: number
  ): number {
    if (!path || path.length < 2) return 0;
    const borderLL = new google.maps.LatLng(border.lat, border.lng);

    const inside: boolean[] = path.map(p =>
      google.maps.geometry.spherical.computeDistanceBetween(p, borderLL) <= radiusMeters
    );

    const firstIn = inside.findIndex(Boolean);
    if (firstIn < 0) return 0;

    let lastIn = -1;
    for (let i = inside.length - 1; i >= 0; i--) {
      if (inside[i]) { lastIn = i; break; }
    }

    const startsInPeru = path[0].lat() < border.lat;
    let startIdx: number;
    let endIdx: number;

    if (lastIn > firstIn) {
      startIdx = firstIn;
      endIdx = lastIn;
    } else {
      if (startsInPeru) {
        startIdx = 0;
        endIdx = firstIn;
      } else {
        startIdx = firstIn;
        endIdx = path.length - 1;
      }
    }

    let meters = 0;
    for (let i = startIdx; i < endIdx; i++) {
      meters += google.maps.geometry.spherical.computeDistanceBetween(path[i], path[i + 1]);
    }
    return meters / 1000;
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

        const minEnd = Math.min(
          google.maps.geometry.spherical.computeDistanceBetween(p, a),
          google.maps.geometry.spherical.computeDistanceBetween(p, b)
        );
        if (minEnd > 5000) continue;

        const d = distancePointToSegment(p, a, b);
        if (d <= radius) { hit = true; break; }
      }

      if (hit) {
        if (!found.some(x => x.name === t.name)) found.push(t);
      }
    }
    return found;
  }

  function processDirections(result: google.maps.DirectionsResult) {
    const route = result.routes[0];
    if (!route) return;

    let meters = 0;
    route.legs.forEach(leg => meters += leg.distance?.value || 0);
    const kmNum = meters / 1000;
    setDistanceKm(kmNum.toFixed(2));

    let path = getDensePathFrom(result);
    path = densifyPath(path, 80);

    const defaultThreshold = parseFloat((thresholdRef.current?.value || (showEditor ? "250" : "400")));
    const found = detectTollsAlongPath(path, currentTolls, defaultThreshold);

    setTollList(found);
    setTollCount(found.length);
    setTollTotal(found.reduce((a, t) => a + (t.cost || 0), 0).toFixed(2));

    props.onDistanceChange?.(kmNum);
    props.onTollsChange?.(found.reduce((a, t) => a + (t.cost || 0), 0), found);
    props.onRouteChange?.({
      origin: route.legs[0]?.start_address || "",
      destination: route.legs[route.legs.length - 1]?.end_address || "",
      waypoints: route.legs.slice(1, -1).map(leg => leg.start_address || ""),
      routeName: route.summary || undefined,
    });

    const crossed = touchesHuaquillas(path);
    props.onBorderCrossing?.(crossed);

    if (kmNum >= 1600) {
      const kmPE = kmFromBorder(path, HUAQUILLAS, HUAQUILLAS_RADIUS_M);
      const kmEC = kmNum - kmPE;
      const RL = true;
      props.onCountryKm?.({ RL, kmEC: Math.round(kmEC), kmPE: Math.round(kmPE) });
    } else {
      props.onCountryKm?.({ RL: false, kmEC: 0, kmPE: 0 });
    }
  }

  function renderTollMarkers(map: google.maps.Map, tolls: Toll[]) {
    try { tollMarkersRef.current.forEach((m) => m.setMap(null)); } catch {}
    tollMarkersRef.current = [];

    const ms: google.maps.Marker[] = [];
    tolls.forEach((t) => {
      const m = new google.maps.Marker({
        position: { lat: t.lat, lng: t.lng },
        map,
        title: `${t.name} ($${Number(t.cost).toFixed(2)})`,
      });
      ms.push(m);
    });
    tollMarkersRef.current = ms;
    setTollMarkers(ms); // opcional para UI
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

  function scrollSummaryIntoView() {
    summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ===== Render ===== */
  return (
    <div className="grid h-[calc(100vh-2rem)] min-h-0 grid-cols-[360px_1fr] gap-0 rounded-xl border border-gray-200 bg-white shadow-sm">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey || ""}&libraries=places,geometry`}
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />

      {/* Columna izquierda (panel) */}
      <div ref={leftPanelRef} className="h-full min-h-0 min-w-0 overflow-auto p-4 border-r">
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

        {/* Resumen */}
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

        {/* Catálogo JSON (opcional) */}
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

      {/* Columna derecha (mapa) */}
      <div ref={mapRef} className="relative h-full min-h-0 min-w-0 w-full" />
    </div>
  );
}
