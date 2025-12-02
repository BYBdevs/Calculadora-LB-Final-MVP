"use client";
import React, {useMemo,useState,useEffect} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { kMaxLength } from "buffer";
import { pdf } from "@react-pdf/renderer";
import LogisburPDF from "./components/LogisburPDF";


// Carga dinámica del mapa (sin SSR)
const RoutePlanner = dynamic(() => import("./components/RoutePlanner"), { ssr: false });

/* ===== Base data ===== */
const GLOBAL={precioGalonEC:2.8,precioGalonPE:4.3,tasaAnual:0.13,costoConductorDia:40,costoAdminFijoDia:18,viaticoEC:10,viaticoPE:15,vidaUtilKm:1_000_000,factorDepreciacion:0.7,margenInternoDefault:0.40,margenComercialDefault:0.50,cruceFronteraUSD:10,bufferPreFronteraKm:70};

const VEHICULOS=[
  {id:"2e",nombre:"Camión 2 ejes",ejes:2,capacidadTn:15,rendKmGal:14,baseDepreciacionUSD:60000,insumos:{llantasKm:0.014,aceiteMotorKm:0.0137,aceiteCoronaKm:0.002,filtrosKm:0.0017},capacidadGalDefault:200},
  {id:"3e",nombre:"Mula 3 ejes",ejes:3,capacidadTn:24,rendKmGal:11,baseDepreciacionUSD:90000,insumos:{llantasKm:0.0233,aceiteMotorKm:0.0137,aceiteCoronaKm:0.002,filtrosKm:0.0017},capacidadGalDefault:200},
  {id:"6e",nombre:"Trailer 6 ejes",ejes:6,capacidadTn:31,rendKmGal:8,baseDepreciacionUSD:106000,insumos:{llantasKm:0.0512,aceiteMotorKm:0.0137,aceiteCoronaKm:0.002,filtrosKm:0.0017},capacidadGalDefault:200}
];

const PEAJES = [
  { sec: 1, nombre: "PINTAG", usd: 12.00 },
  { sec: 2, nombre: "CADENA", usd: 12.00 },
  { sec: 3, nombre: "CHIVERIA/SALITRE", usd: 12.00 },
  { sec: 4, nombre: "PROGRESO", usd: 12.00 },
  { sec: 5, nombre: "CHONGON", usd: 12.00 },
  { sec: 6, nombre: "PANCALEO", usd: 12.00 },
  { sec: 7, nombre: "SAN ANDRES", usd: 12.00 },
  { sec: 8, nombre: "MACHACHI", usd: 12.00 },
  { sec: 9, nombre: "GOB PROVINCIAL DE LOS TSACHILAS", usd: 12.00 },
  { sec: 10, nombre: "LOS ANGELES", usd: 12.00 },
  { sec: 11, nombre: "CONGOMA", usd: 12.00 },
  { sec: 12, nombre: "PAN", usd: 12.00 },
  { sec: 13, nombre: "NARANJAL", usd: 12.00 },
  { sec: 14, nombre: "MILAGRO", usd: 12.00 },
  { sec: 15, nombre: "BOLICHE", usd: 12.00 },
  { sec: 16, nombre: "LA AVANZADA", usd: 12.00 },
  { sec: 17, nombre: "GARRIDO", usd: 12.00 },
  { sec: 18, nombre: "JAIME ROLDOS", usd: 12.00 },
  { sec: 19, nombre: "SERPENTIN", usd: 35.66 },
  { sec: 20, nombre: "PARAISO (HUACHO)", usd: 35.66 },
  { sec: 21, nombre: "FORTALEZA", usd: 36.92 },
  { sec: 22, nombre: "HUARMEY", usd: 36.28 },
  { sec: 23, nombre: "CASMA (ANCASH)", usd: 37.60 },
  { sec: 24, nombre: "SANTA", usd: 30.04 },
  { sec: 25, nombre: "VIRU", usd: 37.60 },
  { sec: 26, nombre: "CHICAMA", usd: 36.22 },
  { sec: 27, nombre: "PACANGUILLA", usd: 35.82 },
  { sec: 28, nombre: "MORROPE", usd: 28.94 },
  { sec: 29, nombre: "BAYOVAR", usd: 27.51 },
  { sec: 30, nombre: "SULLANA", usd: 36.06 },
  { sec: 31, nombre: "TALARA", usd: 11.14 },
  { sec: 32, nombre: "CANCAS", usd: 11.14 },
  { sec: 33, nombre: "MONTERRICO", usd: 22.62 },
  { sec: 34, nombre: "JAHUAY", usd: 66.52 },
  { sec: 35, nombre: "TAMBOGRANDE", usd: 18.03 },
  { sec: 36, nombre: "DURAN/TAMBO", usd: 12.00 },
];

type OperationType = "importacion" | "exportacion" | "transito";

// Flags de features para mostrar/ocultar pestañas
const FEATURES = {
  showInterno: false,
  showComercial: false,
};


/** ====== NUEVO: Modelo de ítems con soporte por operación y fórmulas (FOB/CIF) ====== */
type FixedValsByOp = Partial<Record<OperationType, number>>;
type CostItem = {
  id:string;
  label:string;
  unitLabel?:string;
  /** Si es un valor fijo, usar unitUSD o valuesByOp. Si depende de FOB/CIF, dejar unitUSD = undefined y usar calc */
  unitUSD?:number;
  valuesByOp?: Partial<Record<OperationType, number>>;
  /** Limitar a ciertos tipos de operación */
  ops?: OperationType[];
  /** Si requiere cálculo con FOB/CIF. Devuelve null si no hay datos suficientes (para mostrar fórmula). */
  calc?:(ctx:FOBCtx)=>number|null;
  formulaHint?:string;
};

type FOBCtx = {
  fob:number;           // FOB USD (0 si vacío)
  fleteCIF:number;      // Flete a usar para CIF (opcional)
  seguroPct:number;     // p.ej. 0.003 = 0.30 %
  igvPct:number;        // Perú
  ivaECPct:number;      // Ecuador
  bodePEPct:number;     // 0.003 (0.30%)
  bodeECBase:number;    // 40 USD base
  bodeECPct:number;     // 0.0035 (0.35%)
  minBodega:number;     // 65 USD
  minSeguro:number;     // 65 USD
};

const FOB_DEFAULTS: FOBCtx = {
  fob:0,
  fleteCIF:0,
  seguroPct:0.003, // 0.30%
  igvPct:0.18,
  ivaECPct:0.15,
  bodePEPct:0.003, // 0.30% FOB
  bodeECBase:40,
  bodeECPct:0.0035, // 0.35% CIF
  minBodega:65,
  minSeguro:65
};


const COSTS_MASTER: CostItem[] = [
  /* ============ IMPORTACIÓN ============ */
  { id: "agencia-pe", label: "Agencia Perú", valuesByOp: { importacion:120 }, unitLabel:"", ops:["importacion"] },

  // Bodega Perú (Import.): 0,30% FOB + 18% IGV (mín. 65)
  {
    id: "bodega-pe-imp",
    label: "Bodega Perú",
    unitLabel: "0,30% FOB + 18% IGV (Mínimo $65,00)",
    ops:["importacion"],
    calc: (ctx) => {
      if (!ctx.fob || ctx.fob<=0) return null;
      const fob = ctx.fob * ctx.bodePEPct; // 0.30% FOB
      const base = fob + (fob * ctx.igvPct); // +18% IGV
      const total = Math.max(ctx.minBodega, base);
      return total;
    },
    formulaHint: "0,30% FOB + 18% IGV (Mínimo $65,00)"
  },

  { id: "agencia-ec-imp", label: "Agencia Ecuador", valuesByOp: { importacion:265 }, unitLabel:"", ops:["importacion"] },

  // Bodega Ecuador (Import.): 0,35% CIF + $40 Base + $10 Báscula + 15% IVA (mín. 65)
  {
    id: "bodega-ec-imp",
    label: "Bodega Ecuador",
    unitLabel: "0,35% CIF + $40 Base + $10 Báscula + 15% IVA (Mínimo $65,00)",
    ops:["importacion"],
    calc: (ctx) => {
      if (!ctx.fleteCIF || ctx.fleteCIF <=0) return null;
      const cif = ctx.fleteCIF * ctx.bodeECPct; // CIF
      const baseAntesIVA = cif + ctx.bodeECBase + 10;
      const baseconIVA = baseAntesIVA + (baseAntesIVA * ctx.ivaECPct);
      const total = Math.max(ctx.minBodega, baseconIVA);
      return total;                         // +15% IVA
    },
    formulaHint: "0,35% CIF + $40 Base + $10 Báscula + 15% IVA (Mínimo $65,00)"
  },

  // Seguro (Import.): 0,30% FOB (mín. 65)
  {
    id: "seguro-imp",
    label: "Seguro de la carga",
    unitLabel: "0,30% FOB (Mínimo $65,00)",
    ops:["importacion"],
    calc: (ctx) => {
      if (!ctx.fob || ctx.fob<=0) return null;
      return Math.max(ctx.minSeguro, ctx.fob * ctx.seguroPct);
    },
    formulaHint: "0,30% FOB (Mínimo $65,00)"
  },

  /* ============ EXPORTACIÓN ============ */
  { id: "ag-adu-ec-exp", label: "Ag. Aduana Ecuador", valuesByOp: { exportacion:125 }, unitLabel:"x trámite", ops:["exportacion"] },

  { id: "bodega-ec-exp", label: "Bodega Ecuador", valuesByOp: { exportacion:26 }, unitLabel:"x unidad", ops:["exportacion"] },

  { id: "ag-adu-pe-exp", label: "Ag. Aduana Perú", valuesByOp: { exportacion:150 }, unitLabel:"x trámite", ops:["exportacion"] },

  // Bodega Perú (Export.): 0,30% CIF + 18% IGV
  {
    id: "bodega-pe-exp",
    label: "Bodega Perú",
    unitLabel: "0,30% CIF + 18% IGV",
    ops:["exportacion"],
    calc: (ctx) => {
      if (!ctx.fleteCIF || ctx.fleteCIF<=0) return null;
      const cif = ctx.fleteCIF * ctx.bodePEPct; // 0.30% CIF
      const base = cif + (cif * ctx.igvPct); // +18% IGV
      return base;
    },
    formulaHint: "0,30% CIF + 18% IGV"
  },

  // Seguro (Export.): 0,40% FOB (mín. 65)
  {
    id: "seguro-exp",
    label: "Seguro de la carga",
    unitLabel: "0,40% FOB (Mínimo $65,00)",
    ops:["exportacion"],
    calc: (ctx) => {
      if (!ctx.fob || ctx.fob<=0) return null;
      return Math.max(ctx.minSeguro, ctx.fob * ctx.seguroPct);
    },
    formulaHint: "0,40% FOB (Mínimo $65,00)"
  },
];


/** Catálogo para Tránsito (sin cambios funcionales) */
const COSTS_TRANSIT: CostItem[] = [
  { id: "mov-fron",   label: "Movilidad Frontera", unitUSD: 45 },
  { id: "standby",    label: "Stand by", unitUSD: 240, unitLabel: "x día x contenedor" },
  { id: "rep-control",label: "Representante control", unitUSD: 150, unitLabel: "x contenedor" },
  { id: "generador",  label: "Generador x día", unitUSD: 130, unitLabel: "x día x contenedor" },
  { id: "candado",    label: "Candado satelital", unitUSD: 80 },
  { id: "recep-pto",  label: "Recepción Pto. Bolívar", unitUSD: 45 },
  { id: "horas-extra",label: "Horas extra (correspondiente al embarque)", unitUSD: 10, unitLabel: "x hora x contenedor" },
  { id: "mod-docs",   label: "Modificación documentos", unitUSD: 30, unitLabel: "x trámite" },
  { id: "rep-aforo",  label: "Representante para aforo narcóticos", unitUSD: 180, unitLabel: "x contenedor" },
];

/** Genera catálogo por operación (import/export comparten ítems pero con distintos unitUSD fijos cuando aplique) */
/** Genera catálogo por operación (import/export con ítems exclusivos) */
const getCatalog = (op: OperationType, fobCtx: FOBCtx): CostItem[] =>
  op === "transito"
    ? COSTS_TRANSIT
    : COSTS_MASTER
        .filter(ci => !ci.ops || ci.ops.includes(op))           // <— filtro por operación
        .map(ci => {
          const out: CostItem = { ...ci };

          // Resolver unitUSD fijo por operación si aplica
          if (ci.valuesByOp && typeof ci.valuesByOp[op] === "number") {
            out.unitUSD = ci.valuesByOp[op]!;
          } else if (typeof ci.unitUSD === "number") {
            out.unitUSD = ci.unitUSD;
          } else {
            out.unitUSD = undefined;
          }

          // Calcular si hay fórmula (FOB/CIF)
          if (ci.calc) {
            const val = ci.calc(fobCtx);
            out.unitUSD = (val === null) ? NaN : Number(val.toFixed(2));
          }

          return out;
        });

const money=(n:number)=>`$ ${Number(n||0).toFixed(2)}`;
const r5=(n:number)=>Math.ceil(n/5)*5;
const peajeFactorByVeh = (vehId: string) => (vehId === "2e" ? 1/3 : vehId === "3e" ? 1/2 : 1);

/* ===== App ===== */
export default function Page(){
  const [openMapa, setOpenMapa] = useState(false); // dentro del componente

  // Acceso
  const [llave,setLlave]=useState("");
  const [ok, setOk] = useState(false);
  useEffect(() => {
    try { setOk(typeof window !== "undefined" && sessionStorage.getItem("llave_ok") === "1"); } catch {}
  }, []);
  const validar=()=>{ if(llave==="2407"){ setOk(true); sessionStorage.setItem("llave_ok","1"); } else { alert("Llave incorrecta"); setOk(false); sessionStorage.removeItem("llave_ok"); } };

  // Config base
  const DEFAULT = useMemo(() => ({
    ...GLOBAL,
    vehicles: Object.fromEntries(
      VEHICULOS.map(v => [v.id, {
        rendKmGal: v.rendKmGal,
        capacidadGalDefault: v.capacidadGalDefault,
        baseDepreciacionUSD: v.baseDepreciacionUSD,
        insumos: { ...v.insumos }
      }])
    )
  }), []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const saved = JSON.parse(localStorage.getItem("cfg") || "null"); if (saved) setCfg(saved); } catch {}
  }, []);
  const [cfg, setCfg] = useState<any>(DEFAULT);
  const VEH=useMemo(()=>VEHICULOS.map(v=>({ ...v, ...cfg.vehicles?.[v.id], insumos:{...v.insumos,...(cfg.vehicles?.[v.id]?.insumos||{})} })),[cfg]);

  const [modo,setModo]=useState<"interno"|"comercial"|"logisbur">("logisbur");
  useEffect(() => {
    if (modo === "interno" && !FEATURES.showInterno) setModo("logisbur");
    if (modo === "comercial" && !FEATURES.showComercial) setModo("logisbur");
  }, [modo]);
  const [openCfg,setOpenCfg]=useState(false);
  const [openPeaje,setOpenPeaje]=useState(false);

  const [origen,setOrigen]=useState("—");
  const [destino,setDestino]=useState("—");
  

  // Datos para narrativa / reporte
  const [cliente, setCliente] = useState("");
  const [rutaNombre, setRutaNombre] = useState("");

  const [veh,setVeh]=useState("3e");
  const [km,setKm]=useState(200);
  const [dias,setDias]=useState(1);
  const [credito,setCredito]=useState(30);
  const [peajes,setPeajes]=useState(0);

  const [s25,setS25]=useState(0),[s30,setS30]=useState(0),[s45,setS45]=useState(0),[s50,setS50]=useState(0);
  const [autoV,setAutoV]=useState(true);

  const [margen,setMargen]=useState(cfg.margenInternoDefault*100);
  useEffect(()=>setMargen(cfg.margenInternoDefault*100),[cfg.margenInternoDefault]);

  const initCaps=useMemo(()=>Object.fromEntries(VEH.map(v=>[v.id,v.capacidadGalDefault||200])),[VEH]);
  const [caps,setCaps]=useState<any>(initCaps);
  useEffect(()=>setCaps(Object.fromEntries(VEH.map(v=>[v.id,v.capacidadGalDefault||200]))),[VEH]);

  // Logisbur
  const [tn,setTn]=useState(0),[dPeru,setDPeru]=useState(0),[mixto,setMixto]=useState(false),[kmEC,setKmEC]=useState(0),[kmPE,setKmPE]=useState(0);
  const [cruceOn,setCruceOn]=useState(false);

  const [observaciones, setObservaciones] = useState("");
  const [manerapago, setManerapago] = useState("");
  const [pvpManual, setPvpManual] = useState<string>("");


  const [operacion,setOperacion]=useState<OperationType>("importacion");

  const [logoUrl, setLogoUrl] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLogoUrl(window.location.origin + "/logo.png");
    }
  }, []);

  


  /** ====== NUEVO: Contexto FOB/CIF para cálculos de costos adicionales ====== */
  const [fobUSD, setFobUSD] = useState<number>(0);
  const [fleteCIFUSD, setFleteCIFUSD] = useState<number>(0);
  const [seguroPct, setSeguroPct] = useState<number>(FOB_DEFAULTS.seguroPct * 100); // UI en %
  const fobCtx: FOBCtx = useMemo(()=>({
    ...FOB_DEFAULTS,
    fob: Number(fobUSD)||0,
    fleteCIF: Number(fleteCIFUSD)||0,
    seguroPct: Math.max(0, Number(seguroPct||0))/100
  }),[fobUSD,fleteCIFUSD,seguroPct]);

  type SelectedCost = CostItem & { manual?: boolean };
  const catalogo = useMemo(()=>getCatalog(operacion, fobCtx),[operacion,fobCtx]);

  const [costosSel,setCostosSel]=useState<SelectedCost[]>([]);
  useEffect(()=>{ setCostosSel([]); },[operacion]); // al cambiar operación, limpiar
  const toggleCosto=(it:CostItem)=> setCostosSel(prev=>{
    const i=prev.findIndex(x=>x.id===it.id);
    if(i>=0) return prev.filter((_,idx)=>idx!==i);
    // tomar valor actual del catálogo (con cálculo hecho)
    const curr = catalogo.find(c=>c.id===it.id);
    return [...prev,{...(curr||it), manual:false}];
  });
  const setCostoValue = (id:string, val:string) => {
  const n = val === "" ? NaN : Number(val);
  setCostosSel(prev => prev.map(c => c.id===id ? ({ ...c, unitUSD: n, manual:true }) : c));
  };
  const setCostoLabel = (id:string, text:string) =>
    setCostosSel(prev => prev.map(c => c.id===id ? ({ ...c, label:text, manual:true }) : c));
  const setCostoUnitLabel = (id:string, text:string) =>
    setCostosSel(prev => prev.map(c => c.id===id ? ({ ...c, unitLabel:text, manual:true }) : c));

  const removeCosto=(id:string)=>setCostosSel(prev=>prev.filter(c=>c.id!==id));
  const clearCostos=()=>setCostosSel([]);

  const [producto, setProducto] = useState("");
  const [unidadCarga, setUnidadCarga] = useState("");
  const [ciudadReporte, setCiudadReporte] = useState("Machala");


  // Re-sincronizar valores calculados cuando cambie FOB/flete/%
  useEffect(()=>{
  setCostosSel(prev => prev.map(sel=>{
    const cat = catalogo.find(c=>c.id===sel.id);
      if (!cat) return sel;
      // Si el usuario editó (manual), NO tocamos sus campos
      if (sel.manual) return sel;
      // Si no es manual, actualizamos desde el catálogo (incluye fórmulas con FOB)
      return { ...sel, label: cat.label, unitLabel: cat.unitLabel, unitUSD: cat.unitUSD };
    }));
  },[catalogo]);


  // Ajustar seguro automáticamente según operación
  useEffect(() => {
    if (operacion === "importacion") {
      setSeguroPct(0.30); // 0.30%
    } else if (operacion === "exportacion") {
      setSeguroPct(0.40); // 0.40%
    }
  }, [operacion]);


  const totalCostosAdic=useMemo(()=>costosSel.reduce((s,c)=>{
    const u = Number(c.unitUSD);
    if (!isFinite(u)) return s; // NaN => sin FOB (mostrar fórmula, no sumar)
    return s + u;
  },0),[costosSel]);

  const kgForm=useMemo(()=>s25*25+s30*30+s45*45+s50*50,[s25,s30,s45,s50]);
  const tnForm=kgForm/1000;
  const tnUse=modo==="logisbur"&&tn>0?tn:tnForm;
  const kgUse=tnUse*1000;

  const pickV=(w:number)=>{ const s=[...VEH].sort((a,b)=>a.capacidadTn-b.capacidadTn); return s.find(v=>v.capacidadTn>=w)||s[s.length-1]; };
  useEffect(()=>{ if (autoV) { if(modo==="logisbur"){ setVeh("6e"); setAutoV(false);} else { setVeh(pickV(tnUse).id);} } },[modo,autoV,tnUse]);
  const V=useMemo(()=>VEH.find(x=>x.id===veh),[VEH,veh]);

  const res=useMemo(()=>{ if(!V) return null; const cap=caps[veh]??200;
    let comb=0,cEC=0,cPE=0,pref=0,cec=0,pexc=0;
    if(modo==="logisbur"){ const r=V.rendKmGal;
      if(mixto){ const cover=Math.max(0,cap*r-cfg.bufferPreFronteraKm); pref=cap*cfg.precioGalonEC; cec=(kmEC/r)*cfg.precioGalonEC; const kmPEfac=Math.max(0,kmPE-cover); pexc=(kmPEfac/r)*cfg.precioGalonPE; cEC=pref+cec; cPE=pexc; comb=cEC+cPE; }
      else{ cEC=(km/r)*cfg.precioGalonEC; comb=cEC; cPE=0; }
    } else { const r=V.rendKmGal; comb=(km/r)*cfg.precioGalonEC; cEC=comb; cPE=0; }
    const ins=km*(V.insumos.llantasKm+V.insumos.aceiteMotorKm+V.insumos.aceiteCoronaKm+V.insumos.filtrosKm);
    const dep=km*((cfg.factorDepreciacion*(V.baseDepreciacionUSD))/cfg.vidaUtilKm);
    const p=peajes * peajeFactorByVeh(veh);
    const dPE=Math.max(0,Math.min(dias,dPeru)), dEC=Math.max(0,dias-dPE);
    const per=dias*cfg.costoConductorDia + dEC*cfg.viaticoEC + dPE*cfg.viaticoPE + dias*cfg.costoAdminFijoDia;
    const cf=(modo==="logisbur"&&cruceOn)?cfg.cruceFronteraUSD:0;
    const sub0=comb+ins+dep+p+per+cf, fin=sub0*(cfg.tasaAnual/365)*credito, sub=sub0+fin, min=per+p+cf, base=Math.max(sub,min);
    const m=modo==="comercial"?cfg.margenComercialDefault:Math.min(Math.max(margen/100,0),0.95); const pvp=r5(base/(1-m));
    const cKg=kgUse>0?base/kgUse:0, vKg=kgUse>0?pvp/kgUse:0;
    const row=(w:number,q:number)=>q?{w,q,c:cKg*w,v:vKg*w}:null; const por=( [row(25,s25),row(30,s30),row(45,s45),row(50,s50)].filter(Boolean) as any[]);
    return {cap,comb,cEC,cPE,pref,cec,pexc,ins,dep,peajes:p,per,dEC,dPE,fin,cf,sub,base,pvp,por};
  },[V,veh,caps,km,dias,credito,peajes,kgUse,s25,s30,s45,s50,margen,modo,dPeru,mixto,kmEC,kmPE,cfg,cruceOn]);


  const pvpCalculado = res?.pvp || 0; // PVP calculado por el sistema
  const pvpMostrado = pvpManual !== "" ? Number(pvpManual) : pvpCalculado; 
  const printPDF=()=>window.print();

  const generatePDF = async () => {
  const doc = (
    <LogisburPDF
      ciudad={ciudadReporte}
      cliente={cliente}
      rutaNombre={rutaNombre}
      producto={producto}
      unidadCarga={unidadCarga}
      origen={origen}
      destino={destino}
      valorTransporte={pvpMostrado}
      costosSel={costosSel}
      observaciones={observaciones}
      manerapago={manerapago}
      operacion={operacion}
    />
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Cotizacion_Logisbur_${new Date().toISOString().slice(0,10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};


  if(!ok) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm ring-1 ring-slate-200 card">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="logo" width={48} height={48} />
          <h1 className="text-lg font-semibold text-slate-800">LogisBur · Acceso</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">Ingresa la llave de 4 dígitos.</p>
        <div className="flex gap-2 mt-4">
          <input type="password" maxLength={4} value={llave} onChange={e=>setLlave(e.target.value)} className="flex-1 border rounded-lg px-3 py-2"/>
          <button onClick={validar} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Validar</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 page">
      <div className="max-w-6xl mx-auto">
        {/* Sticky bar */}
        <div className="sticky top-0 z-10 mb-3 no-print">
          <div className="flex items-center justify-between bg-white/90 backdrop-blur rounded-xl px-4 py-2 ring-1 ring-slate-200">
            <div className="flex items-center gap-3 text-slate-700 text-sm">
              <Image src="/logo.png" width={28} height={28} alt="logo" className="rounded-full" />
              <span>Modo: <b>{modo}</b></span>
            </div>
            <div className="flex items-center gap-4">
              {modo!=="comercial" && <div className="text-sm text-slate-700">Costo: <b>{money(res?.base||0)}</b></div>}
              <div className="text-sm text-emerald-700">PVP: <b>{money(pvpMostrado)}</b></div>
              <button className="px-3 py-1.5 rounded-lg bg-slate-900 text-white" onClick={generatePDF}> Generar Reporte </button>
              <Reporte
              ciudad={ciudadReporte}
              cliente={cliente}
              rutaNombre={rutaNombre}
              producto={producto}
              unidadCarga={unidadCarga}
              origen={origen}
              destino={destino}
              valorTransporte={pvpMostrado}
              costosSel={costosSel}
              observaciones={observaciones}
              manerapago={manerapago}
              operacion={operacion} // importacion / exportacion / transito
            />
              <button className="px-3 py-1.5 rounded-lg ring-1 ring-slate-200" onClick={()=>setOpenMapa(v=>!v)}>{openMapa ? "Ocultar mapa" : "Abrir mapa"}</button>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
          <div className="text-slate-800 font-semibold text-xl">
            { (FEATURES.showInterno || FEATURES.showComercial)
              ? "Cotizador – Interno / Comercial / Logisbur"
              : "Cotizador – Logisbur" }
          </div>
          <div className="flex items-center gap-2">
            {FEATURES.showInterno && (
              <Btn active={modo==="interno"} onClick={()=>setModo("interno")}>Interno</Btn>
            )}
            {FEATURES.showComercial && (
              <Btn active={modo==="comercial"} onClick={()=>setModo("comercial")}>Comercial</Btn>
            )}
            <Btn active={modo==="logisbur"} onClick={()=>setModo("logisbur")}>Logisbur</Btn>
            <button className="px-3 py-2 rounded-lg ring-1 ring-slate-200 bg-white" onClick={()=>setOpenCfg(true)} title="Configuración">⚙️</button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Controles */}
          <div className="bg-white rounded-2xl p-4 ring-1 ring-slate-200 card">
            <div className="grid grid-cols-2 gap-2">
              <Text label="Origen" v={origen} set={setOrigen}/>
              <Text label="Destino" v={destino} set={setDestino}/>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Text label="Empresa" v={cliente} set={setCliente}/>
              <Text label="Cliente" v={rutaNombre} set={setRutaNombre}/>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Text label="Producto" v={producto} set={setProducto}/>
              <Text label="Unidad de carga" v={unidadCarga} set={setUnidadCarga}/>
            </div>

            {modo!=="logisbur"?(
              <>
                <h3 className="font-medium text-slate-700 mt-3 mb-2">Carga (sacos)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Num label="25 kg" v={s25} set={setS25}/>
                  <Num label="30 kg" v={s30} set={setS30}/>
                  <Num label="45 kg" v={s45} set={setS45}/>
                  <Num label="50 kg" v={s50} set={setS50}/>
                </div>
                <div className="text-xs text-slate-500 mt-1">Carga total: {(kgForm/1000).toFixed(2)} t</div>
                <label className="text-sm mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={autoV} onChange={e=>setAutoV(e.target.checked)}/>Seleccionar mejor vehículo
                </label>
              </>
            ):(
              <>
                <h3 className="font-medium text-slate-700 mt-3 mb-2">Carga (Logisbur)</h3>
                <Num label="Toneladas (t)" v={tn} set={v=>setTn(Math.max(0,Number(v)))}/>
              </>
            )}

            <div className="mt-3">
              <label className="text-xs text-slate-500">Vehículo</label>
              <select className="w-full border rounded-lg px-3 py-2" value={veh} onChange={(e)=>{setAutoV(false); setVeh(e.target.value);}}disabled={autoV}>
                {VEH.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} · {v.rendKmGal} km/gal
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3">
              <Num label="Capacidad tanque (gal)" v={caps[veh]??200} set={val=>setCaps((s:any)=>({...s,[veh]:Math.max(0,Number(val))}))}/>
            </div>

            <Num label="KM de ruta" v={km} set={v=>setKm(Math.max(0,Number(v)))}/>
            <Num label="Peajes (USD, manual)" v={peajes} set={v=>setPeajes(Math.max(0,Number(v)))}/>
            {modo==="logisbur"&&(
              <>
                <button className="mt-1 text-sm underline" onClick={()=>setOpenPeaje(true)}>Guía de peajes</button>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Num label="Días de viaje" v={dias} set={v=>setDias(Math.max(0,Number(v)))}/>
                  <Num label="Días de crédito" v={credito} set={v=>setCredito(Math.max(0,Number(v)))}/>
                </div>
                <Num label="Días en Perú" v={dPeru} set={v=>setDPeru(Math.max(0,Number(v)))}/>
                <label className="text-sm mt-2 flex items-center gap-2">
                  <input type="checkbox" checked={mixto} onChange={e=>setMixto(e.target.checked)}/>
                  Ruta larga – Combustible mixto <span className="text-[11px] text-slate-500">(Más de 1600 KM)</span>
                </label>
                {mixto&&(
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Num label="KM en Ecuador" v={kmEC} set={v=>setKmEC(Math.max(0,Number(v)))}/>
                    <Num label="KM en Perú" v={kmPE} set={v=>setKmPE(Math.max(0,Number(v)))}/>
                    <div className="text-[11px] text-slate-500 col-span-2">Se usa pre-llenado EC (capacidad×precio EC) + EC por km; en Perú por km - pre-llenado EC sobre (capacidad×8 − {cfg.bufferPreFronteraKm} km).</div>
                  </div>
                )}
                <label className="text-sm mt-3 flex items-center gap-2">
                  <input type="checkbox" checked={cruceOn} onChange={e=>setCruceOn(e.target.checked)}/>
                  Cobrar cruce de frontera <span className="text-[11px] text-slate-500">({money(cfg.cruceFronteraUSD)})</span>
                </label>
              </>
            )}

            {modo!=="logisbur"&&(
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Num label="Días de viaje" v={dias} set={v=>setDias(Math.max(0,Number(v)))}/>
                <Num label="Días de crédito" v={credito} set={v=>setCredito(Math.max(0,Number(v)))}/>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-3">
              {modo!=="comercial" && (
                <>
                  <Num
                    label="Margen (%)"
                    v={margen}
                    set={v=>setMargen(Math.max(0,Math.min(95,Number(v))))}
                  />
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Modificar PVP</div>
                    <input
                      type="number"
                      step="0.01"
                      value={pvpManual}
                      onChange={(e)=>setPvpManual(e.target.value)}
                      placeholder={pvpCalculado.toFixed(2)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                    {pvpManual !== "" && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        (Usando PVP manual)
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="text-[11px] text-slate-500 mt-1">Administrativo fijo: {money(cfg.costoAdminFijoDia)}/día</div>

            {/** ===================== BLOQUE LOGISBUR – COSTOS ADICIONALES ===================== */}
            {modo==="logisbur" && (
              <div className="mt-3 rounded-lg border p-3">
                <div className="text-xs text-slate-500 mb-1">Tipo de operación</div>
                <select className="w-full border rounded-lg px-3 py-2 mb-3"
                        value={operacion} onChange={e=>setOperacion(e.target.value as OperationType)}>
                  <option value="importacion">Importación</option>
                  <option value="exportacion">Exportación</option>
                  <option value="transito">Tránsito</option>
                </select>

                {/** NUEVO: Parámetros de FOB/CIF */}
                {operacion!=="transito" && (
                  <div className="grid sm:grid-cols-3 gap-2 mb-2">
                    <Num label="FOB (USD)" v={fobUSD} set={(v:number)=>setFobUSD(Math.max(0,Number(v)))} />
                    <Num label="Flete para CIF (opcional, USD)" v={fleteCIFUSD} set={(v:number)=>setFleteCIFUSD(Math.max(0,Number(v)))} />
                    <Num label="Seguro (%)" v={seguroPct} set={(v:number)=>setSeguroPct(Math.max(0,Number(v)))} />
                  </div>
                )}
                {operacion!=="transito" && (
                  <div className="text-[11px] text-slate-500 mb-2">
                    Si <b>FOB</b> está vacío, los ítems con % mostrarán la <b>fórmula</b> y no se sumarán al total.
                  </div>
                )}

                <div className="text-sm font-semibold mb-1">Costos adicionales (opcional)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {catalogo.map(item=>{
                    const sel=costosSel.find(c=>c.id===item.id);
                    const checked=!!sel;
                    const hasNumeric = isFinite(Number(item.unitUSD));
                    // Mostrar (unidad) DESPUÉS del valor SOLO si es tránsito
                    const rightText = hasNumeric
                      ? (operacion === "transito"
                          ? `${money(Number(item.unitUSD))}${item.unitLabel ? ` (${item.unitLabel})` : ""}`
                          : money(Number(item.unitUSD)))
                      : (item.formulaHint || item.unitLabel);
                    return (
                      <div key={item.id} className="rounded-lg border px-2 py-2 text-sm">
                        <label className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <input type="checkbox" checked={checked} onChange={()=>toggleCosto(item)}/>
                            {item.label}
                          </span>
                          <span className={`tabular-nums ${hasNumeric?"":"text-slate-500 italic"}`}>{rightText}</span>
                        </label>
                        {hasNumeric && item.unitLabel && operacion !== "transito" && (
                          <div className="text-[11px] text-slate-500 ml-6">({item.unitLabel})</div>
                        )}
                        {checked && (
                        <div className="ml-6 mt-2 space-y-2">
                          {/* Descripción */}
                          <div>
                            <div className="text-[11px] text-slate-500 mb-1">Descripción</div>
                            <input
                              type="text"
                              className="w-full border rounded-md px-2 py-1 text-sm"
                              value={sel?.label ?? ""}
                              onChange={(e)=>setCostoLabel(item.id, e.target.value)}
                            />
                          </div>

                          {/* Unidad / Nota  +  Valor (USD) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <div className="text-[11px] text-slate-500 mb-1">Unidad / nota</div>
                              <input
                                type="text"
                                className="w-full border rounded-md px-2 py-1 text-sm"
                                value={sel?.unitLabel ?? ""}
                                onChange={(e)=>setCostoUnitLabel(item.id, e.target.value)}
                              />
                            </div>
                            <div>
                              <div className="text-[11px] text-slate-500 mb-1">Valor (USD)</div>
                              <input
                                type="number"
                                step="0.01"
                                className="w-full border rounded-md px-2 py-1 text-sm tabular-nums"
                                // si no es número (NaN), mostramos vacío (para “usar fórmula” si existe)
                                value={isFinite(Number(sel?.unitUSD)) ? String(sel?.unitUSD) : ""}
                                placeholder={isFinite(Number(item.unitUSD)) ? String(item.unitUSD) : ""}
                                onChange={(e)=>setCostoValue(item.id, e.target.value)}
                              />
                              {!isFinite(Number(sel?.unitUSD)) && (item.formulaHint || item.unitLabel) && (
                                <div className="text-[11px] text-slate-500 italic mt-1">
                                  (Vacío = usar fórmula: {item.formulaHint || item.unitLabel})
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Línea calculada/ingresada */}
                          <div className="text-xs">
                            <b>Línea:</b>{" "}
                            {isFinite(Number(sel?.unitUSD))
                              ? <span>{money(Number(sel?.unitUSD||0))}</span>
                              : <span className="text-slate-500 italic">{item.formulaHint || item.unitLabel || "fórmula"}</span>}
                          </div>
                        </div>
                      )}
                      </div>
                    );
                  })}
                  
                </div>

                {/* Manuales */}
                {costosSel.filter(c=>c.id.startsWith("custom-")).length>0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Líneas agregadas manualmente</div>
                    <div className="space-y-1">
                      {costosSel.filter(c=>c.id.startsWith("custom-")).map(c=>(
                        <div key={c.id} className="flex items-center justify-between rounded-lg border px-2 py-1 text-sm">
                          <div>
                            <div>{c.label}</div>
                            {c.unitLabel && <div className="text-[11px] text-slate-500">({c.unitLabel})</div>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="tabular-nums">{money(Number(c.unitUSD||0))}</span>
                            <button className="text-xs underline" onClick={()=>removeCosto(c.id)}>quitar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-2 flex items-center gap-2">
                  <button onClick={()=>{
                    const label=prompt("Descripción del costo:");
                    if(!label) return;
                    const unitUSD=Number(prompt("Precio unitario (USD):")||"0");
                    if(Number.isNaN(unitUSD)) return;
                    const unitLabel=prompt("Unidad (opcional)")||undefined;
                    setCostosSel(prev=>[...prev,{id:`custom-${Date.now()}`,label,unitUSD:Number(unitUSD.toFixed(2)),unitLabel}]);
                  }} className="text-xs rounded-md border px-2 py-1">+ Agregar línea</button>
                  <button onClick={clearCostos} className="text-xs rounded-md border px-2 py-1">Limpiar</button>
                  <div className="ml-auto text-sm"><b>Total:</b> {money(totalCostosAdic)}</div>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-semibold mb-1">Observaciones</div>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm min-h-[96px]"
                    placeholder="Escribe observaciones, condiciones, notas internas…"
                    value={observaciones}
                    onChange={(e)=>setObservaciones(e.target.value)}
                  />
                </div>
                <div className="mt-3">
                  <div className="text-sm font-semibold mb-1">Forma de pago</div>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 text-sm min-h-[64px]"
                    placeholder="Especifica la forma de pago acordada con el cliente…"
                    value={manerapago}
                    onChange={(e)=>setManerapago(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Resultados */}
          <div className="md:col-span-2 bg-white rounded-2xl p-4 ring-1 ring-slate-200 card">
            {!res?<div className="text-slate-500">Complete los datos…</div>:(
              <>
                {(modo!=="comercial")?(
                  <>
                    {/* Mapa embebido en Logisbur */}
                    {modo === "logisbur" && openMapa && (
                      <div className="mt-3 h-[70vh] rounded-xl overflow-hidden ring-1 ring-slate-200">
                        <RoutePlanner
                          initialOrigin={origen !== "—" ? origen : undefined}
                          initialDestination={destino !== "—" ? destino : undefined}
                          onDistanceChange={(kmCalc) => setKm(kmCalc)}
                          onTollsChange={(totalUSD) => setPeajes(totalUSD)}
                          onRouteChange={({ origin, destination, routeName }) => {
                            if (origin) setOrigen(origin);
                            if (destination) setDestino(destination);
                            if (routeName) setRutaNombre(routeName);
                          }}
                          onBorderCrossing={(crossed) => {
                            if (crossed) setCruceOn(true); else setCruceOn(false);
                          }}
                          onCountryKm={({ RL, kmEC, kmPE}) => {
                            setMixto(RL);
                            setKmEC(kmEC);
                            setKmPE(kmPE);
                          }}
                          showTollsEditor={false}
                        />
                      </div>
                    )}

                    <h3 className="font-medium text-slate-700 mb-2">Desglose {modo==="logisbur"?"Logisbur":"Interno"}</h3>

                    {(() => {
                      const miniItems: [string, number][] = [
                        ["Combustible total", res.comb],
                        ["Insumos", res.ins],
                        ["Depreciación", res.dep],
                        ["Peajes", res.peajes],
                        ["Personal", res.per],
                      ];
                      if (modo === "logisbur" && cruceOn) miniItems.push(["Cruce frontera", res.cf]);
                      miniItems.push(["Financiero", res.fin]);
                      return <MiniGrid items={miniItems} />;
                    })()}

                    {modo==="logisbur"&&(
                      <table className="w-full text-sm mt-3 border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-50"><tr><Th>Concepto</Th><Th>Precio/gal</Th><Th>Total</Th></tr></thead>
                        <tbody>
                          {mixto?(
                            <>
                              <tr><Td>Prefill Ecuador ({res.cap} gal)</Td><Td>{money(cfg.precioGalonEC)}</Td><Td>{money(res.pref)}</Td></tr>
                              <tr><Td>Ecuador (por km)</Td><Td>{money(cfg.precioGalonEC)}</Td><Td>{money(res.cec)}</Td></tr>
                              <tr><Td>Perú (por km)</Td><Td>{money(cfg.precioGalonPE)}</Td><Td>{money(res.pexc)}</Td></tr>
                            </>
                          ):(
                            <>
                              <tr><Td>Ecuador</Td><Td>{money(cfg.precioGalonEC)}</Td><Td>{money(res.cEC)}</Td></tr>
                              <tr><Td>Perú</Td><Td>{money(cfg.precioGalonPE)}</Td><Td>{money(res.cPE)}</Td></tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    )}

                    <table className="w-full text-sm mt-3 border border-slate-200 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50"><tr><Th>Personal</Th><Th>Unidad</Th><Th>Cantidad</Th><Th>Unitario</Th><Th>Total</Th></tr></thead>
                      <tbody>
                        <tr><Td>Conductor</Td><Td>día</Td><Td>{dias}</Td><Td>{money(cfg.costoConductorDia)}</Td><Td>{money(dias*cfg.costoConductorDia)}</Td></tr>
                        <tr><Td>Viáticos Ecuador</Td><Td>día</Td><Td>{res.dEC}</Td><Td>{money(cfg.viaticoEC)}</Td><Td>{money(res.dEC*cfg.viaticoEC)}</Td></tr>
                        <tr><Td>Viáticos Perú</Td><Td>día</Td><Td>{res.dPE}</Td><Td>{money(cfg.viaticoPE)}</Td><Td>{money(res.dPE*cfg.viaticoPE)}</Td></tr>
                        <tr><Td>Administrativo</Td><Td>día</Td><Td>{dias}</Td><Td>{money(cfg.costoAdminFijoDia)}</Td><Td>{money(dias*cfg.costoAdminFijoDia)}</Td></tr>
                        {(modo==="logisbur"&&cruceOn)&&<tr className="bg-slate-50"><Td className="font-semibold">Cruce frontera</Td><Td>—</Td><Td>—</Td><Td>—</Td><Td className="font-semibold">{money(cfg.cruceFronteraUSD)}</Td></tr>}
                      </tbody>
                    </table>

                    {/* Resumen informativo de costos adicionales */}
                    {modo==="logisbur" && (
                      <div className="mt-3 rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-sm">Costos adicionales seleccionados</div>
                          <div className="text-sm"><b>Total:</b> {money(totalCostosAdic)}</div>
                        </div>
                        {costosSel.length===0?(
                          <div className="text-xs text-slate-500 mt-1">— Ninguno —</div>
                        ):(
                          <div className="mt-2 space-y-1">
                            {costosSel.map(c=>{
                              const isNum = isFinite(Number(c.unitUSD));
                              return (
                                <div key={c.id} className="flex items-center justify-between text-sm">
                                  <span>
                                  {c.label}
                                  {/* Para import/export va después del label; en tránsito NO lo mostramos aquí */}
                                </span>
                                {isNum ? (
                                  <span className="tabular-nums">
                                    <b>
                                      {money(Number(c.unitUSD))}
                                      {/* En tránsito el (unidad) va DESPUÉS del valor */}
                                      {operacion === "transito" && c.unitLabel ? ` (${c.unitLabel})` : ""}
                                    </b>
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic">{(c.formulaHint || c.unitLabel || "fórmula")}</span>
                                )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid sm:grid-cols-3 gap-2 mt-3">
                      <Kpi label="Subtotal" v={res.sub}/>
                      <Kpi label="Costo aplicado (mínimo)" v={res.base} hi/>
                      <Kpi label="PVP del flete (redondeado)" v={pvpMostrado}/>
                    </div>

                    {modo!=="logisbur" && res.por.length>0 && (
                      <table className="w-full text-sm mt-3 border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-50"><tr><Th>Presentación</Th><Th>Cantidad</Th><Th>Costo/saco</Th><Th>PVP/saco</Th></tr></thead>
                        <tbody>{res.por.map((r:any,i:number)=>(<tr key={i}><Td>{r.w} kg</Td><Td>{r.q}</Td><Td>{money(r.c)}</Td><Td className="font-semibold">{money(r.v)}</Td></tr>))}</tbody>
                      </table>
                    )}

                    {modo==="logisbur"&&(
                      <NarrativaLogisbur
                        origen={origen} destino={destino}
                        km={km} mixto={mixto} kmEC={kmEC} kmPE={kmPE} cap={res.cap}
                        peajesUSD={peajes} dEC={res.dEC} dPE={res.dPE} tn={tn}
                        costo={res.base} pvp={pvpMostrado}
                        rutaNombre={rutaNombre} cliente={cliente}
                      />
                    )}
                  </>
                ):(
                  <>
                    <h3 className="font-medium text-slate-700 mb-2">Precio del servicio (Comercial)</h3>
                    <div className="bg-emerald-50 ring-1 ring-emerald-100 rounded-xl p-4">
                      <div className="text-xs text-emerald-700 uppercase">Total a pagar</div>
                      <div className="text-3xl font-semibold text-emerald-900">{money(pvpMostrado)}</div>
                    </div>
                    {res.por.length>0&&(
                      <div className="grid sm:grid-cols-4 gap-2 mt-3">{res.por.map((r:any,i:number)=>(
                        <div key={i} className="p-3 ring-1 ring-slate-200 rounded-xl text-center">
                          <div className="text-xs text-slate-500">{r.w} kg</div>
                          <div className="text-xl font-semibold">{money(r.v)}</div>
                          <div className="text-xs text-slate-500">Cant: {r.q}</div>
                        </div>
                      ))}</div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modales */}
        {openPeaje && <PeajeModal onClose={() => setOpenPeaje(false)} />}
        {openCfg&&<CfgModal val={cfg} onClose={()=>setOpenCfg(false)} onSave={setCfg}/>}
      </div>
    </div>
  );
}

const Btn=({active,children,...p}:any)=><button {...p} className={`px-3 py-2 rounded-lg ${active?"bg-emerald-600 text-white":"bg-white ring-1 ring-slate-200"}`}>{children}</button>;
const Num=({label,v,set}:{label:string,v:any,set:any})=>(<div><div className="text-xs text-slate-500 mb-1">{label}</div><input className="w-full border rounded-lg px-3 py-2" type="number" value={v} onChange={e=>set(e.target.value)}/></div>);
const Text=({label,v,set}:{label:string,v:any,set:any})=>(<div><div className="text-xs text-slate-500 mb-1">{label}</div><input className="w-full border rounded-lg px-3 py-2" value={v} onChange={e=>set(e.target.value)} placeholder="—"/></div>);
const Th=({children}:{children:any})=><th className="text-left px-3 py-2 text-xs text-slate-500">{children}</th>;
const Td=({children,className=""}:{children:any,className?:string})=><td className={`px-3 py-2 text-sm ${className}`}>{children}</td>;
const MiniGrid=({items}:{items:[string,number][]})=>(
  <div className="grid sm:grid-cols-3 gap-2">{items.map(([k,v],i)=>(<div key={i} className="p-3 bg-slate-50 rounded-lg ring-1 ring-slate-200 flex justify-between"><span className="text-sm">{k}</span><span className="font-semibold">{`$ ${Number(v||0).toFixed(2)}`}</span></div>))}</div>
);
const Kpi=({label,v,hi}:{label:string,v:number,hi?:boolean})=>(<div className={`p-3 rounded-lg ring-1 ${hi?"bg-emerald-50 ring-emerald-100":"bg-slate-50 ring-slate-200"}`}><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-semibold">{`$ ${Number(v||0).toFixed(2)}`}</div></div>);

function NarrativaLogisbur({
  origen,destino,km,mixto,kmEC,kmPE,cap,peajesUSD,dEC,dPE,tn,costo,pvp,rutaNombre,cliente
}:{[key:string]:any}){
  const dist=useMemo(()=>{ if(mixto) return {ec:Math.max(0,Number(kmEC)||0), pe:Math.max(0,Number(kmPE)||0)}; const um=(cap||200)*8; return {ec:Math.min(km,um), pe:Math.max(0,km-um)}; },[mixto,kmEC,kmPE,cap,km]);
  const cTon=tn>0?costo/tn:0, vTon=tn>0?pvp/tn:0;
  return (
    <div className="mt-3 p-4 ring-1 ring-slate-200 rounded-xl bg-white text-sm text-slate-700">
      Ruta planificada: <b>Trailer</b>
      {(origen !== "—" || destino !== "—") && <> de <b>{origen}</b> a <b>{destino}</b></>}
      {rutaNombre && <> — <b>{rutaNombre}</b></>}{' '}
      para el cliente {cliente ? <b>{cliente}</b> : <i>(no especificado)</i>}.
      Se recorrerán <b>{Number(km || 0).toFixed(0)} km</b>.
      El viaje contempla <b>{Number(dEC || 0).toFixed(0)} día(s)</b> en Ecuador y <b>{Number(dPE || 0).toFixed(0)} día(s)</b> en Perú.
      El valor acumulado de peajes (según el input manual) es de <b>{money(peajesUSD)}</b>.
      Costo por tonelada: <b>{money(costo / Math.max(tn || 0, 1))}</b>;
      PVP por tonelada: <b>{money(pvp / Math.max(tn || 0, 1))}</b>.
    </div>
  );
}

/* Peaje Modal — solo listado completo */
function PeajeModal({ onClose }: { onClose: () => void }) {
  const lista = PEAJES;
  const total = useMemo(() => lista.reduce((a, p) => a + (p.usd || 0), 0), [lista]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white rounded-xl ring-1 ring-slate-200 w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
          <div className="font-medium">Guía de peajes (listado completo)</div>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <div>{lista.length} peajes</div>
            <div> Total (suma mostrada): <b>{`$ ${Number(total || 0).toFixed(2)}`}</b> </div>
          </div>

          <div className="max-h-96 overflow-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr><Th>#</Th><Th>Peaje</Th><Th>USD (ida+vuelta)</Th></tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.sec}>
                    <Td>{p.sec}</Td>
                    <Td>{p.nombre}</Td>
                    <Td>{`$ ${Number(p.usd || 0).toFixed(2)}`}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-right">
            <button className="px-3 py-2 rounded-lg ring-1 ring-slate-200" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Config Modal */
function CfgModal({val,onClose,onSave}:{val:any,onClose:()=>void,onSave:(v:any)=>void}){
  const [f,setF]=useState(val);
  const set=(k:string,v:any)=>setF((p:any)=>({ ...p, [k]:v }));
  const setV=(id:string,k:string,v:any)=>setF((p:any)=>({ ...p, vehicles:{...p.vehicles,[id]:{...p.vehicles[id],[k]:v}}}));
  const setVI=(id:string,k:string,v:any)=>setF((p:any)=>({ ...p, vehicles:{...p.vehicles,[id]:{...p.vehicles[id],insumos:{...p.vehicles[id].insumos,[k]:v}}}}));
  const num=(v:any)=>Number(v);
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-white rounded-xl ring-1 ring-slate-200 w-full max-w-5xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
          <div className="font-medium">Configuración</div>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="p-4 grid md:grid-cols-2 gap-4 text-sm">
          <div className="border rounded-xl p-3">
            <div className="font-medium mb-2">Global</div>
            <Grid>
              <L label="Precio galón EC" v={f.precioGalonEC} set={(v:any)=>set("precioGalonEC",num(v))}/>
              <L label="Precio galón PE" v={f.precioGalonPE} set={(v:any)=>set("precioGalonPE",num(v))}/>
              <L label="Tasa anual" v={f.tasaAnual} set={(v:any)=>set("tasaAnual",num(v))}/>
              <L label="Vida útil (km)" v={f.vidaUtilKm} set={(v:any)=>set("vidaUtilKm",num(v))}/>
              <L label="Factor depreciación" v={f.factorDepreciacion} set={(v:any)=>set("factorDepreciacion",num(v))}/>
              <L label="Conductor (USD/día)" v={f.costoConductorDia} set={(v:any)=>set("costoConductorDia",num(v))}/>
              <L label="Administrativo (USD/día)" v={f.costoAdminFijoDia} set={(v:any)=>set("costoAdminFijoDia",num(v))}/>
              <L label="Viático EC (USD/día)" v={f.viaticoEC} set={(v:any)=>set("viaticoEC",num(v))}/>
              <L label="Viático PE (USD/día)" v={f.viaticoPE} set={(v:any)=>set("viaticoPE",num(v))}/>
              <PercentField label="Margen interno/logisbur (%)" value={Math.round(f.margenInternoDefault*100)} onChange={(pct:number)=>set("margenInternoDefault",Math.max(0,Math.min(95,Number(pct)))/100)} />
              <PercentField label="Margen comercial (%)" value={Math.round(f.margenComercialDefault*100)} onChange={(pct:number)=>set("margenComercialDefault",Math.max(0,Math.min(95,Number(pct)))/100)} />
              <L label="Buffer pre-frontera (km)" v={f.bufferPreFronteraKm} set={(v:any)=>set("bufferPreFronteraKm",num(v))}/>
              <L label="Cruce frontera (USD)" v={f.cruceFronteraUSD} set={(v:any)=>set("cruceFronteraUSD",num(v))}/>
            </Grid>
          </div>
          <div className="border rounded-xl p-3 md:col-span-1">
            <div className="font-medium mb-2">Vehículos</div>
            <div className="grid md:grid-cols-3 gap-3">
              {Object.keys(f.vehicles).map((id:string)=>{
                const v=f.vehicles[id]; const base=VEHICULOS.find(x=>x.id===id)?.nombre||id;
                return (
                  <div key={id} className="border rounded-lg p-2">
                    <div className="text-slate-700 text-sm mb-1">{base}</div>
                    <L label="Rend. km/gal" v={v.rendKmGal} set={(val:any)=>setV(id,"rendKmGal",num(val))}/>
                    <L label="Capacidad (gal)" v={v.capacidadGalDefault} set={(val:any)=>setV(id,"capacidadGalDefault",num(val))}/>
                    <L label="Base deprec." v={v.baseDepreciacionUSD} set={(val:any)=>setV(id,"baseDepreciacionUSD",num(val))}/>
                    <L label="Insumos llantas/km" v={v.insumos.llantasKm} set={(val:any)=>setVI(id,"llantasKm",num(val))}/>
                    <L label="Insumos aceite/km" v={v.insumos.aceiteMotorKm} set={(val:any)=>setVI(id,"aceiteMotorKm",num(val))}/>
                    <L label="Insumos corona/km" v={v.insumos.aceiteCoronaKm} set={(val:any)=>setVI(id,"aceiteCoronaKm",num(val))}/>
                    <L label="Insumos filtros/km" v={v.insumos.filtrosKm} set={(val:any)=>setVI(id,"filtrosKm",num(val))}/>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-2 bg-slate-50 no-print">
          <button className="px-3 py-2 rounded-lg ring-1 ring-slate-200" onClick={onClose}>Cancelar</button>
          <button className="px-3 py-2 rounded-lg bg-emerald-600 text-white" onClick={()=>{onSave(f); onClose();}}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
const Grid=({children}:{children:any})=><div className="grid grid-cols-2 gap-2">{children}</div>;
const L=({label,v,set}:{label:string,v:any,set:any})=>(<div><div className="text-xs text-slate-500">{label}</div><input className="w-full border rounded-lg px-3 py-2" value={v} onChange={e=>set(e.target.value)}/></div>);
const PercentField=({label,value,onChange}:{label:string,value:number,onChange:(v:any)=>void})=>(
  <div>
    <div className="text-xs text-slate-500">{label}</div>
    <div className="flex items-center gap-2">
      <input type="range" min={0} max={95} value={value} onChange={(e)=>onChange((e.target as HTMLInputElement).value)} className="flex-1"/>
      <input type="number" min={0} max={95} value={value} onChange={(e)=>onChange((e.target as HTMLInputElement).value)} className="w-20 border rounded-lg px-2 py-1"/>
      <span className="text-xs text-slate-500">%</span>
    </div>
  </div>
);

/* Reporte (placeholder, no se usa directamente) */
function Reporte({
  ciudad,
  cliente,
  rutaNombre,
  producto,
  unidadCarga,
  origen,
  destino,
  valorTransporte,
  costosSel,
  observaciones,
  manerapago,
  operacion,
}: {
  ciudad: string;
  cliente: string;
  rutaNombre: string;
  producto: string;
  unidadCarga: string;
  origen: string;
  destino: string;
  valorTransporte: number;
  costosSel: Array<{ id:string; label:string; unitUSD?:number; unitLabel?:string }>;
  observaciones: string;
  manerapago: string;
  operacion: "importacion" | "exportacion" | "transito";
}) {
  const hoy = new Date();
  const fecha = hoy.toLocaleDateString("es-ES", {day: "numeric", month: "long", year: "numeric"});
  const hora  = hoy.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});

  const listaAdic = costosSel.map(c => {
    const isNum = isFinite(Number(c.unitUSD));
    const etiqueta = isNum
      ? (operacion === "transito" ? c.label : `${c.label}${c.unitLabel ? ` (${c.unitLabel})` : ""}`)
      : c.label;

    const texto = isNum
      ? (operacion === "transito"
          ? `${money(Number(c.unitUSD))}${c.unitLabel ? ` (${c.unitLabel})` : ""}`
          : money(Number(c.unitUSD)))
      : (c.unitLabel || "—");
    return `${etiqueta}: ${texto}`;
  });


  const tituloOp = operacion === "importacion"
    ? "IMPORTACIÓN"
    : operacion === "exportacion"
      ? "EXPORTACIÓN"
      : "TRÁNSITO";

  return (
    <div className="only-print text-[13px] leading-5 text-slate-800">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="LOGISBUR" width={64} height={64}/>
          <div>
            <div className="text-[11px] text-slate-500">www.logisbur.com.ec</div>
          </div>
        </div>
        <div className="text-right">
          <div>{ciudad}, {fecha}</div>
          <div className="text-[11px] text-slate-500">{hora}</div>
        </div>
      </div>

      <div className="h-1.5 w-full bg-orange-500 mb-4"></div>

      {/* Cuerpo */}
      <p className="mb-4">Estimado {cliente},</p>
      <p className="mb-4">
        Por medio de la presente, ponemos a su conocimiento los valores de logística solicitados:
      </p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div><span className="font-semibold">Producto:</span><br/>{producto || ""}</div>
        <div><span className="font-semibold">Unidad de Carga:</span><br/>{unidadCarga || ""}</div>
        <div><span className="font-semibold">Origen:</span><br/>{origen || ""}</div>
        <div><span className="font-semibold">Destino:</span><br/>{destino || ""}</div>
      </div>

      <div className="mb-4">
        <span className="font-semibold">Valor de Transporte</span>:&nbsp;
        <span>Usd&nbsp;<b>{money(valorTransporte).replace("$ ","")}</b>&nbsp;</span>
        <span className="text-slate-600">Por unidad</span>
      </div>

      <div className="mb-1 font-bold text-orange-600">{tituloOp}:</div>
      <div className="mb-2 font-semibold">Costos Adicionales:</div>
      <div className="min-h-[72px] border rounded-md p-3 whitespace-pre-line">
        {listaAdic.length ? (
          <ul className="list-disc pl-5">
            {listaAdic.map((t,i)=><li key={i}>{t}</li>)}
          </ul>
        ) : "—"}
      </div>

      <div className="mt-3 mb-1 font-semibold">Observaciones:</div>
      <div className="min-h-[56px] border rounded-md p-3 whitespace-pre-wrap">
        {observaciones || "—"}
      </div>

      <div className="mb-4">
        <span className="font-semibold">Forma de pago:</span>
        <span>{manerapago}</span>
      </div>

      <div className="border rounded-md p-3 mt-1">
        <div className="mb-2"><b>Plazo:</b> {cliente ? "Por confirmar con " + cliente : "Por confirmar"}</div>
        <div className="mb-2"><b>El pago se debe realizar</b> a través de depósito o transferencia a:</div>
        <div className="mb-2">
          <b>Datos del beneficiario:</b><br/>
          BURNEO LOGÍSTICA CARGA INTERNACIONAL LOGISBUR S.A.<br/>
          RUC: 0791796571001<br/>
          Banco Pichincha C.A.<br/>
          Número de Cta. Corriente: <b>2100169035</b><br/>
          SWIFT: <b>PICHCEEQ</b><br/>
          <b>Gastos de envío:</b> Full Transfer Value - OUR<br/>
          <span className="text-[11px] text-slate-500">*Costos por transferencia no serán asumidos por Logisbur S.A.</span>
        </div>
      </div>

      {/* Pie */}
      <div className="mt-6 flex items-center justify-between text-[11px] text-slate-500">
        <div>Arízaga 613 y Los Sauces, Machala, El Oro, Ec. · 0995977779 · 0987226916</div>
        <img src="/logo.png" alt="LOGISBUR" width={32} height={32}/>
      </div>
    </div>
  );
}

