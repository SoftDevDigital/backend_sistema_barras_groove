export interface IBusinessConfig {
  id: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessTaxId: string;
  businessWebsite: string;
  businessLogo?: string;
  currency: string;
  taxRate: number;
  thankYouMessage: string;
  receiptFooter: string;
  printerSettings: {
    paperWidth: number;
    fontSize: number;
    fontFamily: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IBusinessConfigCreate {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessTaxId: string;
  businessWebsite: string;
  businessLogo?: string;
  currency?: string;
  taxRate?: number;
  thankYouMessage?: string;
  receiptFooter?: string;
  printerSettings?: {
    paperWidth?: number;
    fontSize?: number;
    fontFamily?: string;
  };
}

export interface IBusinessConfigUpdate {
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessTaxId?: string;
  businessWebsite?: string;
  businessLogo?: string;
  currency?: string;
  taxRate?: number;
  thankYouMessage?: string;
  receiptFooter?: string;
  printerSettings?: {
    paperWidth?: number;
    fontSize?: number;
    fontFamily?: string;
  };
}
