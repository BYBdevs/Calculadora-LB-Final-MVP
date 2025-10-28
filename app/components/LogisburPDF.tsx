/* app/components/LogisburPDF.tsx */
"use client";
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

type OperationType = "importacion" | "exportacion" | "transito";
type Sel = { id:string; label:string; unitUSD?:number; unitLabel?:string };

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 11, color: "#111827" },
  row: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems:"center" },
  sep: { height: 6, backgroundColor: "#F59E0B", marginVertical: 10 },
  h1: { fontSize: 22, fontWeight: 800 },
  small: { fontSize: 9, color: "#6B7280" },
  mb2: { marginBottom: 8 },
  mb3: { marginBottom: 12 },
  mb4: { marginBottom: 16 },
  box: { border: "1px solid #E5E7EB", borderRadius: 6, padding: 10 },
  label: { fontSize: 11, fontWeight: 700 },
  ul: { marginTop: 6, paddingLeft: 10 },
  li: { marginBottom: 4 }
});

const money = (n:number)=>`$ ${Number(n||0).toFixed(2)}`;

export default function LogisburPDF({
  ciudad, cliente, producto, unidadCarga,
  origen, destino, valorTransporte,
  costosSel, observaciones,manerapago, operacion, logoUrl
}: {
  ciudad: string; cliente: string; producto: string; unidadCarga: string;
  origen: string; destino: string; valorTransporte: number;
  costosSel: Sel[]; observaciones: string; manerapago: string; operacion: OperationType;
  logoUrl?: string;
}) {
  const hoy = new Date();
  const tituloOp = operacion==="importacion" ? "IMPORTACIÓN" : operacion==="exportacion" ? "EXPORTACIÓN" : "TRÁNSITO";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Encabezado */}
        <View style={[styles.row, styles.mb3]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {!!logoUrl && <Image src={logoUrl} style={{ width: 42, height: 42, marginRight: 10 }} />}
            <View>
              <Text style={styles.h1}>LOGISBUR</Text>
              <Text style={styles.small}>www.logisbur.com.ec</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>{ciudad || "Machala"}, {hoy.toLocaleDateString()}</Text>
            <Text style={styles.small}>{hoy.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</Text>
          </View>
        </View>

        <View style={styles.sep} />

        {/* Cuerpo */}
        <Text style={styles.mb3}>Estimado,</Text>
        <Text style={styles.mb4}>
          Por medio de la presente, ponemos a su conocimiento los valores de logística solicitados:
        </Text>

        <View style={[styles.row, styles.mb3]}>
          <View style={{ width: "48%" }}>
            <Text style={styles.label}>Producto:</Text>
            <Text>{producto || "—"}</Text>
          </View>
          <View style={{ width: "48%" }}>
            <Text style={styles.label}>Unidad de Carga:</Text>
            <Text>{unidadCarga || "—"}</Text>
          </View>
        </View>

        <View style={[styles.row, styles.mb3]}>
          <View style={{ width: "48%" }}>
            <Text style={styles.label}>Origen:</Text>
            <Text>{origen || "—"}</Text>
          </View>
          <View style={{ width: "48%" }}>
            <Text style={styles.label}>Destino:</Text>
            <Text>{destino || "—"}</Text>
          </View>
        </View>

        <View style={styles.mb4}>
          <Text><Text style={styles.label}>Valor de Transporte: </Text>Usd {money(valorTransporte).replace("$ ","")}  <Text style={styles.small}>Por unidad</Text></Text>
        </View>

        <Text style={{ color:"#EA580C", fontWeight: 700, marginBottom: 4 }}>{tituloOp}:</Text>
        <Text style={{ fontWeight: 700, marginBottom: 4 }}>Costos Adicionales:</Text>
        <View style={[styles.box, styles.mb4]}>
          {costosSel && costosSel.length > 0 ? (
            <View style={styles.ul}>
              {costosSel.map((c, i) => {
                const isNum = isFinite(Number(c.unitUSD));
                const val = isNum ? money(Number(c.unitUSD)) : (c.unitLabel);
                return (
                  <Text key={c.id || String(i)} style={styles.li}>
                    • {c.label}{` (${c.unitLabel})`}: {val}
                  </Text>
                );
              })}
            </View>
          ) : <Text>—</Text>}
        </View>

        <Text style={{ fontWeight: 700, marginBottom: 4 }}>Observaciones:</Text>
        <View style={[styles.box, styles.mb4]}>
          <Text>{observaciones || "—"}</Text>
        </View>

        <View style={styles.mb4}>
          <Text style={styles.label}>Condición de pago:<Text>{manerapago}</Text></Text>
        </View>

        <View style={styles.box}>
          {!!cliente && <Text style={styles.mb2}><Text style={styles.label}>Plazo:</Text> Por confirmar con {cliente}</Text>}
          <Text style={styles.mb2}>El pago se debe realizar a través de depósito o transferencia a:</Text>
          <Text style={styles.mb2}><Text style={styles.label}>Datos del beneficiario:</Text></Text>
          <Text>BURNEO LOGÍSTICA CARGA INTERNACIONAL LOGISBUR S.A.</Text>
          <Text>RUC: 0791796571001</Text>
          <Text>Banco Pichincha C.A.</Text>
          <Text>Número de Cta. Corriente: 2100169035</Text>
          <Text>SWIFT: PICHCEEQ</Text>
          <Text style={styles.mb2}>Gastos de envío: Full Transfer Value - OUR</Text>
          <Text style={styles.small}>*Costos por transferencia no serán asumidos por Logisbur S.A.</Text>
        </View>
      </Page>
    </Document>
  );
}
