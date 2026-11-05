
const CONNECTOR_URL = "http://127.0.0.1:5187";

interface ConnectorResponse {
  success?: boolean;
  code?: string;
  message?: string;
  fileName?: string;
  receivedBytes?: number;
}

export async function requestSolidWorksConversion(
  file: File
): Promise<never> {
  if (!/\.sldprt$/i.test(file.name)) {
    throw new Error("Seleccioná un archivo .SLDPRT válido.");
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  let response: Response;

  try {
    response = await fetch(`${CONNECTOR_URL}/convert`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("El conector tardó demasiado en responder.");
    }

    throw new Error(
      "No se pudo conectar con el servicio de SolidWorks. Verificá que el conector Windows esté ejecutándose."
    );
  }

  let result: ConnectorResponse;

  try {
    result = (await response.json()) as ConnectorResponse;
  } catch {
    throw new Error("El conector devolvió una respuesta no válida.");
  }

  if (response.status === 501 &&
      result.code === "SOLIDWORKS_NOT_CONFIGURED") {
    throw new Error(
      "El archivo llegó correctamente al conector Windows, pero todavía falta configurar la conversión 2D con SolidWorks."
    );
  }

  if (!response.ok) {
    throw new Error(
      result.message || `Error del conector (${response.status}).`
    );
  }

  throw new Error(
    "El conector respondió, pero todavía no entrega una silueta 2D compatible."
  );
}
