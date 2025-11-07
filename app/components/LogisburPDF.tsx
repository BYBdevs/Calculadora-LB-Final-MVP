/* app/components/LogisburPDF.tsx */
"use client";
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

type OperationType = "importacion" | "exportacion" | "transito";
type Sel = { id: string; label: string; unitUSD?: number; unitLabel?: string };

const BRAND_ORANGE = "#F59E0B";
const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#6B7280";

const defaultLogo = "/logo.png";

const styles = StyleSheet.create({
  page: { padding: 24,paddingTop:38,paddingHorizontal:60, paddingBottom: 88, fontSize: 11, color: TEXT_PRIMARY, position: "relative" },
  pag:{padding: 24,paddingTop:38, paddingBottom: 88, fontSize: 11, color: TEXT_PRIMARY, position: "relative" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  h1: { fontSize: 22, fontWeight: 800 },
  small: { fontSize: 9, color: TEXT_MUTED },
  mb2: { marginBottom: 8 },
  mb3: { marginBottom: 12 },
  mb4: { marginBottom: 16 },
  box: { border: "1px solid #E5E7EB", borderRadius: 6, padding: 10 },
  label: { fontSize: 11, fontWeight: 700 },
  ul: { marginTop: 6, paddingLeft: 10 },
  li: { marginBottom: 4 },
  priceLine: { fontSize: 11},
  footerWrap: { position: "absolute", left: 24, right: 24, bottom: 18,paddingHorizontal:40 },
  footerLine: { height: 2, backgroundColor: BRAND_ORANGE, marginBottom: 6 },
  footerText: { textAlign: "center", fontSize: 10 },

  // Header decorativo
  headerWrap: { position: "relative", marginBottom: 28, height: 34, justifyContent: "center", alignItems: "center"},
  orangeBar: { backgroundColor: BRAND_ORANGE, height: 42, width: "100%", position: "absolute", top: 0, left: 0, paddingHorizontal: 16 },
  stripeWrap: { position: "absolute", top: 0, left: 0, flexDirection: "row" },
  stripe: { backgroundColor: "white", width: 10, height: 42, transform: "skewX(-20deg)", marginRight: 4 },
  headerContent: {
    position:"absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: "30%", height: "250%", marginTop: 32},
  namebrand: {color: "black", fontSize: 24, marginLeft: 8, position: "absolute", justifyContent: "flex-end", alignItems:"flex-end", right:16, top:8, fontWeight: 800, fontFamily: "Helvetica" },
});

const money = (n: number) => `$ ${Number(n || 0).toFixed(2)}`;
const isNum = (v: unknown) => Number.isFinite(Number(v));


export default function LogisburPDF({
  ciudad, cliente, producto, unidadCarga,
  origen, destino, valorTransporte,
  costosSel, observaciones, manerapago, operacion, logoUrl
}: {
  ciudad: string; cliente: string; producto: string; unidadCarga: string;
  origen: string; destino: string; valorTransporte: number;
  costosSel: Sel[]; observaciones: string; manerapago: string; operacion: OperationType;
  logoUrl?: string;
}) {
  const hoy = new Date();
  const tituloOp =
    operacion === "importacion" ? "IMPORTACIÓN" :
    operacion === "exportacion" ? "EXPORTACIÓN" : "TRÁNSITO";

  const logoSrc = logoUrl || defaultLogo;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ==== Header gráfico ==== */}
        <View style={styles.headerWrap}>
          <View style={styles.orangeBar} />
          <View style={[styles.stripeWrap, { left: 16 }]}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View key={i} style={styles.stripe} />
            ))}
          </View>
          <View style={styles.headerContent}>
            {!!logoSrc && <Image src={logoSrc} style={styles.logo} />}
          </View>
          <Text style={styles.namebrand}>LOGISBUR</Text>
        </View>

        {/* ==== Encabezado de datos ==== */}
        <View style={[styles.row, styles.mb3]}>
          <View>
            <Text> </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>
              {ciudad || "Machala"},{" "}
              {hoy.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>
        </View>

        {/* ==== Cuerpo ==== */}
        <Text style={styles.mb3}>Estimado {cliente || "cliente"},</Text>
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

        <View style={[styles.mb3]}>
          <View style={{width: "48%"}}>
          <Text><Text style={styles.label}>Valor de Transporte: </Text><Text style={styles.priceLine}> USD {Number(valorTransporte || 0).toFixed(2)}{" "}por unidad </Text></Text>
          </View>
        </View>

        {/* ==== Costos adicionales ==== */}
        <Text style={{ fontWeight: 700, marginBottom: 4 }}>Costos Adicionales:</Text>
        <View style={[styles.box, styles.mb4]}>
          {costosSel && costosSel.length > 0 ? (
            <View style={styles.ul}>
              {costosSel.map((c) => {
                const numeric = isNum(c.unitUSD);
                // Si hay número, mostramos (unitLabel) al lado del nombre; si no, NO.
                const etiqueta = numeric
                  ? `${c.label}${c.unitLabel ? ` (${c.unitLabel})` : ""}`
                  : c.label;

                // Si hay número, el valor es dinero; si no, el valor es la fórmula (unitLabel) una sola vez.
                const valor = numeric
                  ? money(Number(c.unitUSD))
                  : (c.unitLabel || "—");

                return (
                  <View key={c.id} style={styles.row}>
                    <Text style={{ flex: 1 }}>{etiqueta}</Text>
                    <Text style={{textAlign:"left", width:"300" }}>{valor}</Text>
                  </View>
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
          <Text><Text style={styles.label}>Condición de pago:</Text> {manerapago || "—"}</Text>
        </View>

        {/* ==== Datos bancarios ==== */}
        <View style={styles.box}>
          <Text style={styles.mb2}>El pago se debe realizar a través de depósito o transferencia a:</Text>
          <Text style={styles.mb2}><Text style={styles.label}>Datos del beneficiario:</Text></Text>
          <Text>BURNEO LOGÍSTICA CARGA INTERNACIONAL LOGISBUR S.A.</Text>
          <Text>Ruc: 0791796571001</Text>
          <Text>Banco Pichincha C.A.</Text>
          <Text>Número de Cta. Corriente: 2100169035</Text>
          <Text>Swift: PICHECEQ</Text>
          <Text style={styles.mb2}>Gastos de envío: Full Transfer Value - OUR</Text>
          <Text style={styles.small}>*Costos por transferencia no serán asumidos por Logisbur S.A.</Text>
        </View>

        {/* ==== Footer ==== */}
        <View style={styles.footerWrap} fixed>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>
            • Vía Balosa Machala Km 17.1 • www.logisbur.com.ec • Tel. (+593) 987226916
          </Text>
          <Text style={styles.footerText}>
             • operaciones@logisbur.com.ec
          </Text>
        </View>
      </Page>
    </Document>
  );
}
