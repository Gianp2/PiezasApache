export interface ZebraDevice {
  name: string;
  uid: string;
  connection: string;
  deviceType?: string;
  version?: number;
}

export interface ZebraStatusResult {
  isAvailable: boolean;
  devices: ZebraDevice[];
  activeDevice?: ZebraDevice;
  error?: string;
}

const DEFAULT_PORT_HTTP = 9100;
const DEFAULT_PORT_HTTPS = 9101;

/**
 * Checks if Zebra Browser Print daemon is running locally
 */
export async function checkZebraBrowserPrint(customUrl?: string): Promise<ZebraStatusResult> {
  const isHttps = window.location.protocol === 'https:';
  const urlsToTry = customUrl
    ? [customUrl]
    : [
        isHttps ? `https://localhost:${DEFAULT_PORT_HTTPS}` : `http://localhost:${DEFAULT_PORT_HTTP}`,
        `http://127.0.0.1:${DEFAULT_PORT_HTTP}`,
        `https://127.0.0.1:${DEFAULT_PORT_HTTPS}`
      ];

  for (const baseUrl of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${baseUrl}/available`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const printerList: ZebraDevice[] = [];

        if (json.printer && Array.isArray(json.printer)) {
          json.printer.forEach((p: any) => {
            printerList.push({
              name: p.name || 'Impresora Zebra',
              uid: p.uid || p.name,
              connection: p.connection || 'usb',
              deviceType: p.deviceType || 'printer',
              version: p.version
            });
          });
        }

        return {
          isAvailable: true,
          devices: printerList,
          activeDevice: printerList[0]
        };
      }
    } catch (err: any) {
      // Continue trying next endpoint
    }
  }

  return {
    isAvailable: false,
    devices: [],
    error: 'Zebra Browser Print no detectado en localhost:9100 ni localhost:9101.'
  };
}

/**
 * Sends raw ZPL commands to Zebra Browser Print service
 */
export async function sendZplToZebra(
  zplContent: string,
  targetDevice?: ZebraDevice,
  customBaseUrl: string = 'http://127.0.0.1:9100'
): Promise<{ success: boolean; message: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const payload = targetDevice
      ? {
          device: {
            name: targetDevice.name,
            uid: targetDevice.uid,
            connection: targetDevice.connection
          },
          data: zplContent
        }
      : zplContent;

    const res = await fetch(`${customBaseUrl}/write`, {
      method: 'POST',
      headers: {
        'Content-Type': typeof payload === 'string' ? 'text/plain' : 'application/json'
      },
      body: typeof payload === 'string' ? payload : JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      return {
        success: true,
        message: 'Etiqueta enviada correctamente a la impresora Zebra.'
      };
    } else {
      const errText = await res.text();
      return {
        success: false,
        message: `La impresora devolvió un error: ${res.status} ${errText || res.statusText}`
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Tiempo de espera agotado al conectar con Zebra Browser Print (8s).'
      };
    }
    return {
      success: false,
      message: `No se pudo comunicar con el servicio local de Zebra: ${err.message}`
    };
  }
}

/**
 * Connect directly via WebUSB if supported (vendor 0x0A5F = Zebra Technologies)
 */
export async function sendZplViaWebUsb(zplContent: string): Promise<{ success: boolean; message: string }> {
  if (!('usb' in navigator)) {
    return {
      success: false,
      message: 'Este navegador no soporta WebUSB. Utilice Google Chrome o Microsoft Edge.'
    };
  }

  try {
    // Request Zebra printer (0x0A5F is Zebra Technologies USB Vendor ID)
    const device = await (navigator as any).usb.requestDevice({
      filters: [{ vendorId: 0x0A5F }]
    });

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }
    await device.claimInterface(0);

    // Find OUT endpoint for bulk transfer
    const endpoint = device.configuration.interfaces[0].alternates[0].endpoints.find(
      (e: any) => e.direction === 'out'
    );

    if (!endpoint) {
      throw new Error('No se encontró el canal de salida USB de la impresora.');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(zplContent);

    await device.transferOut(endpoint.endpointNumber, data);
    await device.close();

    return {
      success: true,
      message: `Etiqueta impresa correctamente por USB directo (${device.productName || 'Zebra'}).`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error en la conexión USB directa.'
    };
  }
}

/**
 * Utility to download .zpl file to disk
 */
export function downloadZplFile(zplContent: string, fileName: string = 'etiqueta_industrial.zpl') {
  const blob = new Blob([zplContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
