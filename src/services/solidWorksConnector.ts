const CONNECTOR_URL = "http://127.0.0.1:5187";
interface ConnectorResponse {
  success?: boolean;
  code?: string;
  message?: string;
  mimeType?: string;
  imageBase64?: string;
}

/** Devuelve una imagen real exportada desde SolidWorks, nunca una geometría ficticia. */
export async function requestSolidWorksConversion(file: File): Promise<File> {
  if (!/\.sldprt$/i.test(file.name)) throw new Error("Seleccioná un archivo .SLDPRT válido.");
  const formData = new FormData();
  formData.append("file", file, file.name);
  let response: Response;
  try {
    response = await fetch(`${CONNECTOR_URL}/convert`, {
      method: "POST", body: formData, signal: AbortSignal.timeout(90000)
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError")
      throw new Error("SolidWorks tardó demasiado en generar la vista. Intentá nuevamente.");
    throw new Error("No se pudo conectar con el conector Windows. Debe estar instalado y ejecutándose en esta PC. Chrome puede solicitar permiso para acceder a la red local.");
  }
  let result: ConnectorResponse;
  try { result = (await response.json()) as ConnectorResponse; }
  catch { throw new Error("El conector devolvió una respuesta no válida."); }
  if (!response.ok || !result.success || result.mimeType !== "image/png" || !result.imageBase64)
    throw new Error(result.message || `No se pudo convertir la pieza (HTTP ${response.status}).`);
  const raw = atob(result.imageBase64);
  const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
  return new File([bytes], file.name.replace(/\.sldprt$/i, ".png"), { type: "image/png" });
}
