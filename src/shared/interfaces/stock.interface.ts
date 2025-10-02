export interface IStock {
  id: string;
  barId: string;
  productId: string;
  type: 'initial' | 'replenish' | 'final';
  quantity: number;
  recordedAt: string;
  recordedBy: string;
}

export interface IStockCreate {
  barId: string;
  productId: string;
  type: 'initial' | 'replenish' | 'final';
  quantity: number;
  recordedBy: string;
}

export interface IStockSummary {
  productId: string;
  productName: string;
  initialStock: number;
  replenishedStock: number;
  finalStock: number;
  totalSold: number;
  differences: number;
}

export interface IBarStockReport {
  barId: string;
  barName: string;
  stocks: IStockSummary[];
  totalInitial: number;
  totalReplenished: number;
  totalFinal: number;
  totalSold: number;
  totalDifferences: number;
}
