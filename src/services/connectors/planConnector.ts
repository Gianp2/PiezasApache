/** Contrato para un origen de planos autorizado. No presupone una API en la intranet. */
export interface PlanSearchResult {
  code: string;
  name?: string;
  revision?: string;
  format: string;
  sourceId: string;
}
export interface PlanConnector {
  readonly id: string;
  searchByCode(code: string): Promise<PlanSearchResult[]>;
  fetchPlan(sourceId: string): Promise<Blob>;
}
export class ConnectorNotConfiguredError extends Error {
  constructor() {
    super('No hay un conector autorizado configurado. Consultá con Sistemas para identificar el mecanismo de descarga de planos. Mientras tanto, importá un DXF, PDF, SVG o imagen.');
    this.name = 'ConnectorNotConfiguredError';
  }
}
export class InternalWebConnector implements PlanConnector {
  readonly id = 'internal-web';
  async searchByCode(_code: string): Promise<PlanSearchResult[]> {
    throw new ConnectorNotConfiguredError();
  }
  async fetchPlan(_sourceId: string): Promise<Blob> {
    throw new ConnectorNotConfiguredError();
  }
}
