export interface DwgInspectionResult {
  isDwg: boolean;
  versionHeader?: string;
  autocadVersionName?: string;
  errorMessage?: string;
  conversionAdvice: string;
}

const DWG_VERSION_MAP: Record<string, string> = {
  'AC1015': 'AutoCAD 2000/2000i/2002',
  'AC1018': 'AutoCAD 2004/2005/2006',
  'AC1021': 'AutoCAD 2007/2008/2009',
  'AC1024': 'AutoCAD 2010/2011/2012',
  'AC1027': 'AutoCAD 2013/2014/2015/2016/2017',
  'AC1032': 'AutoCAD 2018/2019/2020/2021/2022/2023/2024+'
};

export async function inspectDwgFile(file: File): Promise<DwgInspectionResult> {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const headerStr = String.fromCharCode(...bytes.slice(0, 6));

    if (headerStr.startsWith('AC')) {
      const versionName = DWG_VERSION_MAP[headerStr] || 'Formato AutoCAD DWG propietario';
      return {
        isDwg: true,
        versionHeader: headerStr,
        autocadVersionName: versionName,
        conversionAdvice: `El archivo "${file.name}" es un plano binario propietario (${versionName}). Para procesarlo con precisión geométrica y extraer contornos sin cotas, guarde o exporte el archivo como DXF (ejecute el comando DXFOUT en AutoCAD o use LibreCAD/ODA Converter).`
      };
    }

    return {
      isDwg: false,
      conversionAdvice: 'El encabezado del archivo no coincide con un archivo DWG estándar de AutoCAD.'
    };
  } catch (err: any) {
    return {
      isDwg: false,
      errorMessage: err.message || 'Error al inspeccionar el archivo binario DWG',
      conversionAdvice: 'No se pudo leer la cabecera del archivo.'
    };
  }
}
