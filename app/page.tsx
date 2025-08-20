"use client";
import React, {useMemo,useState,useEffect} from "react";
import Image from "next/image";

/* ===== Base data ===== */
const GLOBAL={precioGalonEC:1.8,precioGalonPE:4.3,tasaAnual:0.13,costoConductorDia:40,costoAdminFijoDia:18,viaticoEC:10,viaticoPE:15,vidaUtilKm:1_000_000,factorDepreciacion:0.7,margenInternoDefault:0.40,margenComercialDefault:0.50,cruceFronteraUSD:10,bufferPreFronteraKm:70};
const VEHICULOS=[
  {id:"2e",nombre:"Camión 2 ejes",ejes:2,capacidadTn:15,rendKmGal:14,baseDepreciacionUSD:60000,insumos:{llantasKm:0.014,aceiteMotorKm:0.0137,aceiteCoronaKm:0.002,filtrosKm:0.0017},capacidadGalDefault:200},
  {id:"3e",nombre:"Mula 3 ejes",ejes:3,capacidadTn:24,rendKmGal:11,baseDepreciacionUSD:90000,insumos:{llantasKm:0.0233,aceiteMotorKm:0.0137,aceiteCoronaKm:0.002,filtrosKm:0.0017},capacidadGalDefault:200},
  {id:"6e",nombre:"Trailer 6 ejes",ejes:6,capacidadTn:31,rendKmGal:8,baseDepreciacionUSD:106000,insumos:{llantasKm:0.0512,aceiteMotorKm:0.0137,aceiteCoronaKm:0.002,filtrosKm:0.0017},capacidadGalDefault:200}
];
const PEAJES=[
  {sec:1,nombre:"Boliche",usd:6.00},
  {sec:2,nombre:"Naranjal",usd:6.00},
  {sec:3,nombre:"Jaime Roldos",usd:6.00},
  {sec:4,nombre:"El Garrido",usd:6.00},
  {sec:5,nombre:"Avanzada",usd:6.00},
  {sec:6,nombre:"Cancas",usd:11.14},
  {sec:7,nombre:"Desvio Talara",usd:11.14},
  {sec:8,nombre:"Tambogrande",usd:0.00},
  {sec:9,nombre:"Piura Sullana",usd:17.31},
  {sec:10,nombre:"Cruce Bayóvar",usd:26.40},
  {sec:11,nombre:"Mórrope",usd:27.74},
  {sec:12,nombre:"Pacanguilla",usd:17.16},
  {sec:13,nombre:"Chicama",usd:17.37},
  {sec:14,nombre:"Virú",usd:18.00},
  {sec:15,nombre:"Vesique",usd:27.09},
  {sec:16,nombre:"chimbote",usd:18.00},
  {sec:17,nombre:"Huarmey",usd:17.38},
  {sec:18,nombre:"Fortaleza",usd:17.69},
  {sec:19,nombre:"El Paraiso - Huacho",usd:25.37},
  {sec:20,nombre:"Variante Pacasmayo",usd:16.29},
  {sec:21,nombre:"Serpentín Pacasmayo",usd:16.29},
  {sec:22,nombre:"chillon",usd:11.14},
  {sec:23,nombre:"santa anita",usd:11.31},
];

const money=(n:number)=>`$ ${Number(n||0).toFixed(2)}`;
const r5=(n:number)=>Math.ceil(n/5)*5;

/* ===== App ===== */
export default function Page(){
  const [llave,setLlave]=useState(""); 
  const [ok,setOk]=useState(()=>typeof window!=='undefined' && sessionStorage.getItem("llave_ok")==="1");
  const validar=()=>{ if(llave==="2407"){ setOk(true); sessionStorage.setItem("llave_ok","1"); } else { alert("Llave incorrecta"); setOk(false); sessionStorage.removeItem("llave_ok"); } };

  const DEFAULT=useMemo(()=>({ ...GLOBAL, vehicles:Object.fromEntries(VEHICULOS.map(v=>[v.id,{rendKmGal:v.rendKmGal,capacidadGalDefault:v.capacidadGalDefault,baseDepreciacionUSD:v.baseDepreciacionUSD,insumos:{...v.insumos}}])) }),[]);
  const [cfg,setCfg]=useState<any>(()=>{ if(typeof window==='undefined') return DEFAULT; try{ return JSON.parse(localStorage.getItem("cfg")||"null")||DEFAULT; }catch{return DEFAULT;} });
  useEffect(()=>{ if(typeof window!=='undefined') localStorage.setItem("cfg",JSON.stringify(cfg)); },[cfg]);
  const VEH=useMemo(()=>VEHICULOS.map(v=>({ ...v, ...cfg.vehicles?.[v.id], insumos:{...v.insumos,...(cfg.vehicles?.[v.id]?.insumos||{})} })),[cfg]);

  const [modo,setModo]=useState<"interno"|"comercial"|"logisbur">("interno"); 
  const [openCfg,setOpenCfg]=useState(false); 
  const [openPeaje,setOpenPeaje]=useState(false);

  const [origen,setOrigen]=useState("—"); 
  const [destino,setDestino]=useState("—");

  // NUEVO estado para reporte
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
  const [extras,setExtras]=useState(0);

  const initCaps=useMemo(()=>Object.fromEntries(VEH.map(v=>[v.id,v.capacidadGalDefault||200])),[VEH]); 
  const [caps,setCaps]=useState<any>(initCaps); 
  useEffect(()=>setCaps(Object.fromEntries(VEH.map(v=>[v.id,v.capacidadGalDefault||200]))),[VEH]);

  // Logisbur
  const [tn,setTn]=useState(0),[dPeru,setDPeru]=useState(0),[mixto,setMixto]=useState(false),[kmEC,setKmEC]=useState(0),[kmPE,setKmPE]=useState(0);
  const [cruceOn,setCruceOn]=useState(true);

  const kgForm=useMemo(()=>s25*25+s30*30+s45*45+s50*50,[s25,s30,s45,s50]); 
  const tnForm=kgForm/1000; 
  const tnUse=modo==="logisbur"&&tn>0?tn:tnForm; 
  const kgUse=tnUse*1000;

  const pickV=(w:number)=>{ const s=[...VEH].sort((a,b)=>a.capacidadTn-b.capacidadTn); return s.find(v=>v.capacidadTn>=w)||s[s.length-1]; };
  useEffect(()=>{ if(modo==="logisbur"){ setVeh("6e"); setAutoV(false);} else if(autoV){ setVeh(pickV(tnUse).id);} },[modo,autoV,tnUse]);
  const V=useMemo(()=>VEH.find(x=>x.id===veh),[VEH,veh]);

  const res=useMemo(()=>{ if(!V) return null; const cap=caps[veh]??200;
    let comb=0,cEC=0,cPE=0,pref=0,cec=0,pexc=0;
    if(modo==="logisbur"){ const r=8;
      if(mixto){ const cover=Math.max(0,cap*r-cfg.bufferPreFronteraKm); pref=cap*cfg.precioGalonEC; cec=(kmEC/r)*cfg.precioGalonEC; const kmPEfac=Math.max(0,kmPE-cover); pexc=(kmPEfac/r)*cfg.precioGalonPE; cEC=pref+cec; cPE=pexc; comb=cEC+cPE; }
      else{ const um=cap*r; const kmE=Math.min(km,um), kmP=Math.max(0,km-um); cEC=(kmE/r)*cfg.precioGalonEC; cPE=(kmP/r)*cfg.precioGalonPE; comb=cEC+cPE; }
    } else { const r=V.rendKmGal; comb=(km/r)*cfg.precioGalonEC; cEC=comb; cPE=0; }
    const ins=km*(V.insumos.llantasKm+V.insumos.aceiteMotorKm+V.insumos.aceiteCoronaKm+V.insumos.filtrosKm);
    const dep=km*((cfg.factorDepreciacion*(V.baseDepreciacionUSD))/cfg.vidaUtilKm);
    const p=peajes;
    const dPE=Math.max(0,Math.min(dias,dPeru)), dEC=Math.max(0,dias-dPE);
    const per=dias*cfg.costoConductorDia + dEC*cfg.viaticoEC + dPE*cfg.viaticoPE + dias*cfg.costoAdminFijoDia;
    const cf=(modo==="logisbur"&&cruceOn)?cfg.cruceFronteraUSD:0;
    const sub0=comb+ins+dep+p+per+cf+extras, fin=sub0*(cfg.tasaAnual/365)*credito, sub=sub0+fin, min=per+p+cf, base=Math.max(sub,min);
    const m=modo==="comercial"?cfg.margenComercialDefault:Math.min(Math.max(margen/100,0),0.95); const pvp=r5(base/(1-m));
    const cKg=kgUse>0?base/kgUse:0, vKg=kgUse>0?pvp/kgUse:0;
    const row=(w:number,q:number)=>q?{w,q,c:cKg*w,v:vKg*w}:null; const por=[row(25,s25),row(30,s30),row(45,s45),row(50,s50)].filter(Boolean) as any[];
    return {cap,comb,cEC,cPE,pref,cec,pexc,ins,dep,peajes:p,per,dEC,dPE,fin,cf,sub,base,pvp,por};
  },[V,veh,caps,km,dias,credito,peajes,kgUse,s25,s30,s45,s50,extras,margen,modo,dPeru,mixto,kmEC,kmPE,cfg,cruceOn]);

  const printPDF=()=>window.print();

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
              <div className="text-sm text-emerald-700">PVP: <b>{money(res?.pvp||0)}</b></div>
              <button className="px-3 py-1.5 rounded-lg bg-slate-900 text-white" onClick={generarReporte}> Generar Reporte </button>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
          <div className="text-slate-800 font-semibold text-xl">Cotizador – Interno / Comercial / Logisbur</div>
          <div className="flex items-center gap-2">
            <Btn active={modo==="interno"} onClick={()=>setModo("interno")}>Interno</Btn>
            <Btn active={modo==="comercial"} onClick={()=>setModo("comercial")}>Comercial</Btn>
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
              <Text label="Cliente (opcional)" v={cliente} set={setCliente}/>
              <Text label="Nombre de ruta (opcional)" v={rutaNombre} set={setRutaNombre}/>
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
              <select className="w-full border rounded-lg px-3 py-2" value={veh} onChange={e=>setVeh(e.target.value)} disabled={modo==="logisbur"||autoV}>
                {VEH.map(v=><option key={v.id} value={v.id}>{v.nombre} · {v.rendKmGal} km/gal</option>)}
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
                    <div className="text-[11px] text-slate-500 col-span-2">Se usa pre-llenado EC (capacidad×precio EC) + EC por km; en Perú solo excedente sobre (capacidad×8 − {cfg.bufferPreFronteraKm} km).</div>
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
              {(modo!=="comercial")&&<Num label="Margen (%)" v={margen} set={v=>setMargen(Math.max(0,Math.min(95,Number(v))))}/>}
              <Num label="Costos adicionales ($)" v={extras} set={v=>setExtras(Math.max(0,Number(v)))}/>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Administrativo fijo: {money(cfg.costoAdminFijoDia)}/día</div>
          </div>

          {/* Resultados */}
          <div className="md:col-span-2 bg-white rounded-2xl p-4 ring-1 ring-slate-200 card">
            {!res?<div className="text-slate-500">Complete los datos…</div>:(
              <>
                {(modo!=="comercial")?(
                  <>
                    <h3 className="font-medium text-slate-700 mb-2">Desglose {modo==="logisbur"?"Logisbur":"Interno"}</h3>

                    {/* FIX TS: construir items tipados explícitamente */}
                    {(() => {
                      const miniItems: [string, number][] = [
                        ["Combustible total", res.comb],
                        ["Insumos", res.ins],
                        ["Depreciación", res.dep],
                        ["Peajes", res.peajes],
                        ["Personal", res.per],
                      ];
                      if (modo === "logisbur" && cruceOn) {
                        miniItems.push(["Cruce frontera", res.cf]);
                      }
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
                              <tr><Td>Perú (excedente)</Td><Td>{money(cfg.precioGalonPE)}</Td><Td>{money(res.pexc)}</Td></tr>
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

                    <div className="grid sm:grid-cols-3 gap-2 mt-3">
                      <Kpi label="Subtotal" v={res.sub}/>
                      <Kpi label="Costo aplicado (mínimo)" v={res.base} hi/>
                      <Kpi label="PVP del flete (redondeado)" v={res.pvp}/>
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
                        costo={res.base} pvp={res.pvp}
                      />
                    )}
                  </>
                ):(
                  <>
                    <h3 className="font-medium text-slate-700 mb-2">Precio del servicio (Comercial)</h3>
                    <div className="bg-emerald-50 ring-1 ring-emerald-100 rounded-xl p-4">
                      <div className="text-xs text-emerald-700 uppercase">Total a pagar</div>
                      <div className="text-3xl font-semibold text-emerald-900">{money(res.pvp)}</div>
                    </div>
                    {res.por.length>0&&(
                      <div className="grid sm:grid-cols-4 gap-2 mt-3">{res.por.map((r:any,i:number)=>(<div key={i} className="p-3 ring-1 ring-slate-200 rounded-xl text-center">
                        <div className="text-xs text-slate-500">{r.w} kg</div><div className="text-xl font-semibold">{money(r.v)}</div><div className="text-xs text-slate-500">Cant: {r.q}</div>
                      </div>))}</div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Modales */}
        {openPeaje&&<PeajeModal onClose={()=>setOpenPeaje(false)} onPick={(c,t)=>{/* informativo, no altera peajes del cálculo */}}/>}
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

function NarrativaLogisbur({origen,destino,km,mixto,kmEC,kmPE,cap,peajesUSD,dEC,dPE,tn,costo,pvp}:{[key:string]:any}){
  const dist=useMemo(()=>{ if(mixto) return {ec:Math.max(0,Number(kmEC)||0), pe:Math.max(0,Number(kmPE)||0)}; const um=(cap||200)*8; return {ec:Math.min(km,um), pe:Math.max(0,km-um)}; },[mixto,kmEC,kmPE,cap,km]);
  const cTon=tn>0?costo/tn:0, vTon=tn>0?pvp/tn:0;
  return (
  <div className="mt-3 p-4 ring-1 ring-slate-200 rounded-xl bg-white text-sm text-slate-700">
    Ruta planificada: <b>Trailer</b>
    {(origen !== "—" || destino !== "—") && <> de <b>{origen}</b> a <b>{destino}</b></>}
    {rutaNombre && <> — <b>{rutaNombre}</b></>}{" "}
    para el cliente {cliente ? <b>{cliente}</b> : <i>(no especificado)</i>}.
    Se recorrerán <b>{Number(km || 0).toFixed(0)} km</b>.
    El viaje contempla <b>{Number(dEC || 0).toFixed(0)} día(s)</b> en Ecuador y <b>{Number(dPE || 0).toFixed(0)} día(s)</b> en Perú.
    El valor acumulado de peajes (según el input manual) es de <b>{money(peajesUSD)}</b>.
    Costo por tonelada: <b>{money(costo / Math.max(tn || 0, 1))}</b>;
    PVP por tonelada: <b>{money(pvp / Math.max(tn || 0, 1))}</b>.
  </div>
);


/* Peaje Modal */
function PeajeModal({onClose,onPick}:{onClose:()=>void,onPick:(c:number,t:number)=>void}){
  const [o,setO]=useState(PEAJES[0].sec),[d,setD]=useState(PEAJES[PEAJES.length-1].sec);
  const start=Math.min(o,d),end=Math.max(o,d);
  const inc=useMemo(()=>PEAJES.filter(p=>p.sec>=start&&p.sec<=end),[start,end]);
  const total=useMemo(()=>inc.reduce((a,p)=>a+(p.usd||0),0),[inc]);
  return (<div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50 no-print">
    <div className="bg-white rounded-xl ring-1 ring-slate-200 w-full max-w-3xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50"><div className="font-medium">Guía de peajes</div><button onClick={()=>{onPick?.(inc.length,Number(total.toFixed(2))); onClose?.();}}>✕</button></div>
      <div className="p-4">
        <div className="grid sm:grid-cols-2 gap-2">
          <div><div className="text-xs text-slate-500">Origen</div><select className="w-full border rounded-lg px-3 py-2" value={o} onChange={e=>setO(Number(e.target.value))}>{PEAJES.map(x=><option key={x.sec} value={x.sec}>{x.sec}. {x.nombre}</option>)}</select></div>
          <div><div className="text-xs text-slate-500">Destino</div><select className="w-full border rounded-lg px-3 py-2" value={d} onChange={e=>setD(Number(e.target.value))}>{PEAJES.map(x=><option key={x.sec} value={x.sec}>{x.sec}. {x.nombre}</option>)}</select></div>
        </div>
        <div className="flex items-center justify-between mt-3 text-sm"><div>{inc.length} peajes</div><div>Total: <b>{`$ ${Number(total).toFixed(2)}`}</b></div></div>
        <div className="mt-3 max-h-64 overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>#</Th><Th>Peaje</Th><Th>USD</Th></tr></thead>
            <tbody>{inc.map(p=>(<tr key={p.sec}><Td>{p.sec}</Td><Td>{p.nombre}</Td><Td>{`$ ${Number(p.usd).toFixed(2)}`}</Td></tr>))}</tbody>
          </table>
        </div>
        <div className="mt-3 text-right"><button className="px-3 py-2 bg-emerald-600 text-white rounded-lg" onClick={()=>{onPick?.(inc.length,Number(total.toFixed(2))); onClose?.();}}>Usar este tramo</button></div>
      </div>
    </div>
  </div>);
}

/* Config Modal */
function CfgModal({val,onClose,onSave}:{val:any,onClose:()=>void,onSave:(v:any)=>void}){
  const [f,setF]=useState(val);
  const set=(k:string,v:any)=>setF((p:any)=>({ ...p, [k]:v }));
  const setV=(id:string,k:string,v:any)=>setF((p:any)=>({ ...p, vehicles:{...p.vehicles,[id]:{...p.vehicles[id],[k]:v}}}));
  const setVI=(id:string,k:string,v:any)=>setF((p:any)=>({ ...p, vehicles:{...p.vehicles,[id]:{...p.vehicles[id],insumos:{...p.vehicles[id].insumos,[k]:v}}}}));
  const num=(v:any)=>Number(v);
  return (<div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50 no-print">
    <div className="bg-white rounded-xl ring-1 ring-slate-200 w-full max-w-5xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50"><div className="font-medium">Configuración</div><button onClick={onClose}>✕</button></div>
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
              return (<div key={id} className="border rounded-lg p-2">
                <div className="text-slate-700 text-sm mb-1">{base}</div>
                <L label="Rend. km/gal" v={v.rendKmGal} set={(val:any)=>setV(id,"rendKmGal",num(val))}/>
                <L label="Capacidad (gal)" v={v.capacidadGalDefault} set={(val:any)=>setV(id,"capacidadGalDefault",num(val))}/>
                <L label="Base deprec." v={v.baseDepreciacionUSD} set={(val:any)=>setV(id,"baseDepreciacionUSD",num(val))}/>
                <L label="Insumos llantas/km" v={v.insumos.llantasKm} set={(val:any)=>setVI(id,"llantasKm",num(val))}/>
                <L label="Insumos aceite/km" v={v.insumos.aceiteMotorKm} set={(val:any)=>setVI(id,"aceiteMotorKm",num(val))}/>
                <L label="Insumos corona/km" v={v.insumos.aceiteCoronaKm} set={(val:any)=>setVI(id,"aceiteCoronaKm",num(val))}/>
                <L label="Insumos filtros/km" v={v.insumos.filtrosKm} set={(val:any)=>setVI(id,"filtrosKm",num(val))}/>
              </div>);
            })}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 px-4 py-2 bg-slate-50 no-print">
        <button className="px-3 py-2 rounded-lg ring-1 ring-slate-200" onClick={onClose}>Cancelar</button>
        <button className="px-3 py-2 rounded-lg bg-emerald-600 text-white" onClick={()=>{onSave(f); onClose();}}>Guardar</button>
      </div>
    </div>
  </div>);
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

function Reporte({
  modo, cliente, rutaNombre, origen, destino, km,
  dias, credito, peajesUSD, tn, por, // por = presentaciones (sacos)
  res, cfg, vehNombre
}: {
  modo: "interno" | "comercial" | "logisbur";
  cliente: string; rutaNombre: string; origen: string; destino: string; km: number;
  dias: number; credito: number; peajesUSD: number; tn: number;
  por: any[]; res: any; cfg: any; vehNombre: string;
}) {
  const fecha = new Date().toLocaleString();
  const showCostos = (modo !== "comercial");
  <Reporte
  modo={modo}
  cliente={cliente}
  rutaNombre={rutaNombre}
  origen={origen}
  destino={destino}
  km={km}
  dias={dias}
  credito={credito}
  peajesUSD={peajes}
  tn={modo==="logisbur" ? tn : ( (s25*25+s30*30+s45*45+s50*50)/1000 )}
  por={res?.por || []}
  res={res}
  cfg={cfg}
  vehNombre={V?.nombre || "—"}
/>
  return (
    <div className="only-print">
      <div className="report-card p-6 rounded-2xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="logo" width={48} height={48} />
            <div>
              <div className="text-xl font-semibold">LogisBur — Cotización de Transporte</div>
              <div className="text-xs text-slate-500">{fecha}</div>
            </div>
          </div>
          <div className="text-right text-sm text-slate-700">
            <div><b>Modo:</b> {modo}</div>
            <div><b>Vehículo:</b> {vehNombre}</div>
          </div>
        </div>

        {/* Cliente / Ruta */}
        <div className="grid md:grid-cols-2 gap-2 text-sm mb-4">
          <div><b>Cliente:</b> {cliente || "—"}</div>
          <div><b>Ruta:</b> {rutaNombre || "—"}</div>
          <div><b>Origen → Destino:</b> {origen || "—"} → {destino || "—"}</div>
          <div><b>Distancia:</b> {Number(km || 0).toFixed(0)} km</div>
        </div>

        {/* 1) Parámetros de viaje */}
        <div className="mb-3">
          <div className="report-section-title mb-1">1) Parámetros de viaje</div>
          <div className="report-grid text-sm">
            <div><b>Días de viaje:</b> {dias}</div>
            <div><b>Días de crédito:</b> {credito}</div>
            <div><b>Peajes (input):</b> {money(peajesUSD)}</div>
            {modo === "logisbur" && (<div><b>Cruce frontera:</b> {res?.cf ? money(res.cf) : "No aplica"}</div>)}
            <div><b>Costos adicionales:</b> {money((res?.sub || 0) - (res?.fin || 0) - (res?.per || 0) - (res?.peajes || 0) - (res?.dep || 0) - (res?.comb || 0) - (res?.cf || 0))}</div>
          </div>
        </div>

        {/* 2) Desglose de costos */}
        {showCostos && (
          <div className="mb-3">
            <div className="report-section-title mb-1">2) Desglose de costos</div>
            <table className="report-table">
              <thead>
                <tr><th>Concepto</th><th>Total (USD)</th></tr>
              </thead>
              <tbody>
                <tr><td>Combustible total</td><td>{money(res.comb)}</td></tr>
                <tr><td>Insumos</td><td>{money(res.ins)}</td></tr>
                <tr><td>Depreciación</td><td>{money(res.dep)}</td></tr>
                <tr><td>Peajes</td><td>{money(res.peajes)}</td></tr>
                <tr><td>Personal (conductor, viáticos, administrativo)</td><td>{money(res.per)}</td></tr>
                {modo === "logisbur" && res.cf > 0 && (<tr><td>Cruce de frontera</td><td>{money(res.cf)}</td></tr>)}
                <tr><td>Financiero</td><td>{money(res.fin)}</td></tr>
                <tr><td><b>Subtotal</b></td><td><b>{money(res.sub)}</b></td></tr>
                <tr><td><b>Costo aplicado (mínimo)</b></td><td><b>{money(res.base)}</b></td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 3) Costo de la ruta */}
        {showCostos && (
          <div className="mb-3">
            <div className="report-section-title mb-1">3) Costo de la ruta</div>
            <div className="text-sm"><b>Total costo (aplicado):</b> {money(res.base)}</div>
            {tn > 0 && <div className="text-sm"><b>Costo por tonelada:</b> {money(res.base / tn)}</div>}
          </div>
        )}

        {/* 4) PVP sugerido */}
        <div className="mb-4">
          <div className="report-section-title mb-1">{showCostos ? "4) PVP sugerido" : "PVP sugerido"}</div>
          <div className="text-lg font-semibold">{money(res.pvp)}</div>
          {/* Presentaciones por saco (solo cuando exista) */}
          {por?.length > 0 && (
            <table className="report-table mt-2">
              <thead><tr><th>Presentación</th><th>Cantidad</th><th>PVP por saco</th></tr></thead>
              <tbody>
                {por.map((r:any, i:number) => (
                  <tr key={i}><td>{r.w} kg</td><td>{r.q}</td><td>{money(r.v)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {/* Por tonelada (Logisbur) */}
          {modo === "logisbur" && tn > 0 && (
            <div className="text-sm mt-2"><b>PVP por tonelada:</b> {money(res.pvp / tn)}</div>
          )}
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-2 gap-8 mt-10">
          <div className="text-center">
            <div style={{height: 60}} />
            <div className="border-t border-slate-300 w-full"></div>
            <div className="text-xs text-slate-600 mt-1">Elaborado por</div>
          </div>
          <div className="text-center">
            <div style={{height: 60}} />
            <div className="border-t border-slate-300 w-full"></div>
            <div className="text-xs text-slate-600 mt-1">Aprobado por</div>
          </div>
        </div>
      </div>
    </div>
  );
}

