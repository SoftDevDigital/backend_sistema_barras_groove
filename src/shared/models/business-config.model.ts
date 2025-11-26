import { BaseModel } from './base.model';

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

export class BusinessConfigModel extends BaseModel implements IBusinessConfig {
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

  constructor(data?: IBusinessConfigCreate) {
    super();
    
    if (data) {
      this.businessName = data.businessName;
      this.businessAddress = data.businessAddress;
      this.businessPhone = data.businessPhone;
      this.businessEmail = data.businessEmail;
      this.businessTaxId = data.businessTaxId;
      this.businessWebsite = data.businessWebsite;
      this.businessLogo = data.businessLogo;
      this.currency = data.currency || 'ARS';
      this.taxRate = data.taxRate || 10;
      this.thankYouMessage = data.thankYouMessage || '¡Gracias por su compra!';
      this.receiptFooter = data.receiptFooter || 'Sistema de Barras Fest-Go';
      this.printerSettings = {
        paperWidth: data.printerSettings?.paperWidth || 80,
        fontSize: data.printerSettings?.fontSize || 12,
        fontFamily: data.printerSettings?.fontFamily || 'monospace'
      };
    } else {
      this.businessName = '';
      this.businessAddress = '';
      this.businessPhone = '';
      this.businessEmail = '';
      this.businessTaxId = '';
      this.businessWebsite = '';
      this.businessLogo = '';
      this.currency = 'ARS';
      this.taxRate = 10;
      this.thankYouMessage = '¡Gracias por su compra!';
      this.receiptFooter = 'Sistema de Barras Fest-Go';
      this.printerSettings = {
        paperWidth: 80,
        fontSize: 12,
        fontFamily: 'monospace'
      };
    }
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `BUSINESS_CONFIG#${this.id}`,
      SK: `BUSINESS_CONFIG#${this.id}`,
      GSI1PK: 'BUSINESS_CONFIG#ACTIVE',
      GSI1SK: this.createdAt,
      ...super.toDynamoDBItem(),
      businessName: this.businessName,
      businessAddress: this.businessAddress,
      businessPhone: this.businessPhone,
      businessEmail: this.businessEmail,
      businessTaxId: this.businessTaxId,
      businessWebsite: this.businessWebsite,
      businessLogo: this.businessLogo,
      currency: this.currency,
      taxRate: this.taxRate,
      thankYouMessage: this.thankYouMessage,
      receiptFooter: this.receiptFooter,
      printerSettings: this.printerSettings,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): BusinessConfigModel {
    const config = new BusinessConfigModel();
    
    config.id = item.id;
    config.businessName = item.businessName;
    config.businessAddress = item.businessAddress;
    config.businessPhone = item.businessPhone;
    config.businessEmail = item.businessEmail;
    config.businessTaxId = item.businessTaxId;
    config.businessWebsite = item.businessWebsite;
    config.businessLogo = item.businessLogo;
    config.currency = item.currency;
    config.taxRate = item.taxRate;
    config.thankYouMessage = item.thankYouMessage;
    config.receiptFooter = item.receiptFooter;
    config.printerSettings = item.printerSettings;
    config.createdAt = item.createdAt;
    config.updatedAt = item.updatedAt;
    
    return config;
  }
}
