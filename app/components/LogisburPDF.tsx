/* app/components/LogisburPDF.tsx */
"use client";
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

type OperationType = "importacion" | "exportacion" | "transito";
type Sel = { id: string; label: string; unitUSD?: number; unitLabel?: string };

// Ajusta estos márgenes si tu imagen de fondo tiene un header/footer más alto
const CONTENT_TOP_INSET = 100;   // espacio libre para el header de la imagen de fondo
const CONTENT_BOTTOM_INSET = 10; // espacio libre para el footer de la imagen de fondo

const TEXT_PRIMARY = "#111827";
const TEXT_MUTED = "#6B7280";

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 60,
    paddingTop: CONTENT_TOP_INSET,
    paddingBottom: CONTENT_BOTTOM_INSET,
    fontSize: 11,
    color: TEXT_PRIMARY,
    position: "relative",
  },

  // utilidades
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  small: { fontSize: 9, color: TEXT_MUTED },
  mb2: { marginBottom: 8 },
  mb3: { marginBottom: 12 },
  mb4: { marginBottom: 16 },

  label: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  value: { marginBottom: 8 },

  sectionTitle: { fontWeight: 700, marginBottom: 4 },
  listRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  listKey: { flex: 1 },
  listVal: { textAlign: "left", width: 290 },

  boxBancario: {
    borderWidth: 1,
    borderColor: "#D1D5DB", // gris suave
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#FAFAFA", // leve contraste
  },

  // fondo
  backgroundImage: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    width: "100%",
  },
});

const money = (n: number) => `$ ${Number(n || 0).toFixed(2)}`;
const isNum = (v: unknown) => Number.isFinite(Number(v));
const bgUrl = "./LogisburPDF.jpg"; // <-- NUEVO: ruta de tu imagen con header+footer

export default function LogisburPDF({
  ciudad, cliente, producto, unidadCarga,
  origen, destino, valorTransporte,
  costosSel, observaciones, manerapago, operacion,
 // <-- NUEVO: ruta de tu imagen con header+footer
}: {
  ciudad: string; cliente: string; producto: string; unidadCarga: string;
  origen: string; destino: string; valorTransporte: number;
  costosSel: Sel[]; observaciones: string; manerapago: string; operacion: OperationType;
}) {
  const hoy = new Date();
  const obsText = observaciones && observaciones.trim() ? observaciones : "No aplica";
  const costosTiene = Array.isArray(costosSel) && costosSel.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* === Imagen de fondo (header + footer incrustados) === */}
        {bgUrl ? (
          <Image src={bgUrl} style={styles.backgroundImage} fixed />
        ) : null}

        {/* Encabezado de fecha/ciudad (SIN header gráfico, solo texto) */}
        <View style={[styles.row, styles.mb3]}>
          <View><Text> </Text></View>
          <View style={{ alignItems: "flex-end" }}>
            <Text>
              {ciudad || "Machala"},{" "}
              {hoy.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>
        </View>

        {/* Cuerpo */}
        <Text style={styles.mb3}>Estimado/a {cliente || "cliente"},</Text>
        <Text style={styles.mb4}>
          Por medio de la presente, ponemos en su conocimiento los valores correspondientes al servicio logístico solicitado:
        </Text>

        {/* Datos en orden vertical: Producto, Unidad de Carga, Origen, Destino */}
        <View style={[styles.row, styles.mb3]}>
          <View>
          <Text style={styles.label}>Producto:</Text>
          <Text style={styles.value}>{producto || "—"}</Text>

          <Text style={styles.label}>Unidad de Carga:</Text>
          <Text style={styles.value}>{unidadCarga || "—"}</Text>
          </View>

          <View style={styles.listVal}>
          <Text style={styles.label}>Origen:</Text>
          <Text style={styles.value}>{origen || "—"}</Text>

          <Text style={styles.label}>Destino:</Text>
          <Text style={styles.value}>{destino || "—"}</Text>
          </View>
        </View>

        <View style={styles.mb3}>
          <Text>
            <Text style={styles.label}>Valor de Transporte: </Text>
            USD {Number(valorTransporte || 0).toFixed(2)}{" "}por unidad
          </Text>
        </View>

        {/* Costos adicionales (sin marcos) */}
        <Text style={styles.sectionTitle}>Costos Adicionales:</Text>
        <View style={styles.mb4}>
          {costosTiene ? (
            <>
              {costosSel.map((c) => {
                const numeric = isNum(c.unitUSD);
                const etiqueta = numeric
                  ? (operacion === "transito" ? c.label : `${c.label}${c.unitLabel ? ` (${c.unitLabel})` : ""}`)
                  : c.label;

                const valor = numeric
                  ? (operacion === "transito"
                      ? `${money(Number(c.unitUSD))}${c.unitLabel ? ` (${c.unitLabel})` : ""}`
                      : money(Number(c.unitUSD)))
                  : (c.unitLabel || "—");
                return (
                  <View key={c.id} style={styles.listRow}>
                    <Text style={styles.listKey}>{etiqueta}</Text>
                    <Text style={styles.listVal}>{valor}</Text>
                  </View>
                );
              })}
            </>
          ) : (
            <Text>No aplica</Text>
          )}
        </View>

        {/* Observaciones (sin marcos) */}
        <Text style={styles.sectionTitle}>Observaciones:</Text>
        <View style={styles.mb4}>
          <Text>{obsText}</Text>
        </View>

        {/* Condición de pago (sin marcos) */}
        <View style={styles.mb4}>
          <Text>
            <Text style={styles.label}>Forma de pago: </Text>
            {manerapago || "—"}
          </Text>
        </View>

        {/* Datos bancarios (sin marcos) */}
        <View style={styles.boxBancario}>
          <Text style={styles.mb2}>Depósito o transferencia bancaria a:</Text>
          <View style={styles.mb2}>
            <Text>Beneficiario: Burneo Logística Carga Internacional Logisbur S.A.</Text>
            <Text>RUC: 0791796571001</Text>
            <Text>Banco Pichincha C.A.</Text>
            <Text>Cuenta Corriente: 2100169035</Text>
            <Text>Código SWIFT: PICHECEQ</Text>
            <Text style={styles.mb2}>Condición: Full Transfer Value – OUR</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
