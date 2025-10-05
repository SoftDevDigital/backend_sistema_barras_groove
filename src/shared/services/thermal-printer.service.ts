import { Injectable, Logger } from '@nestjs/common';
// @ts-ignore - node-thermal-printer no tiene tipos TypeScript
import { Printer, PrinterTypes } from 'node-thermal-printer';
import { ITicket } from '../interfaces/ticket.interface';

export interface PrinterConfig {
  id: string;
  name: string;
  printerName?: string; // Nombre de la impresora en el sistema
  barId?: string; // Asociar impresora a una barra específica
  active: boolean;
}

export interface PrinterStatus {
  id: string;
  name: string;
  connected: boolean;
  barId?: string;
  lastError?: string;
}

@Injectable()
export class ThermalPrinterService {
  private readonly logger = new Logger(ThermalPrinterService.name);
  private printers = new Map<string, Printer>();
  private readonly printerConfigs: PrinterConfig[] = [
    {
      id: 'printer-1',
      name: 'Impresora Barra Principal',
      printerName: 'Gadnic IT1050', // Nombre de la impresora en Windows
      barId: 'default_bar',
      active: true,
    },
    {
      id: 'printer-2',
      name: 'Impresora Barra Secundaria',
      printerName: 'Gadnic IT1050', // Segunda impresora si tienes
      barId: 'bar-2',
      active: false, // Desactivada por defecto hasta configurar
    },
    // Agregar más impresoras según necesites
  ];

  constructor() {
    this.initializePrinters();
  }

  private async initializePrinters(): Promise<void> {
    this.logger.log('Initializing thermal printers...', 'ThermalPrinterService.initializePrinters');
    
    for (const config of this.printerConfigs) {
      if (config.active) {
        await this.connectPrinter(config);
      }
    }
  }

  private async connectPrinter(config: PrinterConfig): Promise<boolean> {
    try {
      this.logger.log(`Connecting to printer ${config.name} (${config.id})`, 'ThermalPrinterService.connectPrinter');
      
      const printer = new Printer({
        type: PrinterTypes.EPSON, // Gadnic IT1050 es compatible con Epson ESC/POS
        interface: config.printerName || 'printer', // Nombre de la impresora
        options: {
          timeout: 5000,
        },
      });

      // Verificar si la impresora está disponible
      await printer.isPrinterConnected();
      
      this.printers.set(config.id, printer);
      this.logger.log(`Printer ${config.name} connected successfully`, 'ThermalPrinterService.connectPrinter');
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to connect to printer ${config.name}:`, error);
      return false;
    }
  }

  private getPrinterForBar(barId: string): Printer | null {
    // Buscar impresora específica para la barra
    const config = this.printerConfigs.find(p => p.barId === barId && p.active);
    if (config) {
      return this.printers.get(config.id) || null;
    }
    
    // Si no hay impresora específica, usar la primera disponible
    const firstConfig = this.printerConfigs.find(p => p.active);
    if (firstConfig) {
      return this.printers.get(firstConfig.id) || null;
    }
    
    return null;
  }

  private getDefaultPrinter(): Printer | null {
    const firstConfig = this.printerConfigs.find(p => p.active);
    if (firstConfig) {
      return this.printers.get(firstConfig.id) || null;
    }
    return null;
  }

  async printTicket(ticket: ITicket, barId?: string): Promise<boolean> {
    try {
      const printer = barId ? this.getPrinterForBar(barId) : this.getDefaultPrinter();
      
      if (!printer) {
        this.logger.error('No printer available for ticket printing');
        return false;
      }

      this.logger.log(`Printing ticket ${ticket.id}`, 'ThermalPrinterService.printTicket');

      // Configurar impresora
      printer.alignCenter();
      printer.bold(true);
      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printer.println('GROOVE BAR');
      printer.setTextNormal();
      printer.bold(false);
      printer.println('--- TICKET DE VENTA ---');
      printer.alignLeft();
      printer.println(`Fecha: ${new Date(ticket.createdAt).toLocaleString('es-ES')}`);
      printer.println(`Ticket ID: ${ticket.id.substring(0, 8)}`);
      printer.println(`Atendido por: ${ticket.employeeId}`);
      printer.println(`Barra: ${ticket.barName}`);
      printer.println(`Evento: ${ticket.eventName}`);
      printer.drawLine();

      // Tabla de productos
      printer.tableCustom([
        { text: 'Producto', align: 'LEFT', width: 0.5 },
        { text: 'Cant.', align: 'CENTER', width: 0.15 },
        { text: 'Precio', align: 'RIGHT', width: 0.2 },
        { text: 'Total', align: 'RIGHT', width: 0.15 },
      ]);
      printer.drawLine();

      for (const item of ticket.items) {
        printer.tableCustom([
          { text: item.productName, align: 'LEFT', width: 0.5 },
          { text: item.quantity.toString(), align: 'CENTER', width: 0.15 },
          { text: `$${item.unitPrice.toFixed(2)}`, align: 'RIGHT', width: 0.2 },
          { text: `$${item.total.toFixed(2)}`, align: 'RIGHT', width: 0.15 },
        ]);
      }
      printer.drawLine();

      // Totales
      printer.alignRight();
      printer.println(`Subtotal: $${ticket.subtotal.toFixed(2)}`);
      printer.println(`Impuestos: $${(ticket.totalTax || 0).toFixed(2)}`);
      printer.bold(true);
      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printer.println(`TOTAL: $${ticket.total.toFixed(2)}`);
      printer.setTextNormal();
      printer.bold(false);
      printer.alignLeft();
      printer.println(`Método de pago: ${ticket.paymentMethod || 'cash'}`);
      if (ticket.paidAmount !== undefined && ticket.paidAmount > 0) {
        printer.println(`Pagado: $${ticket.paidAmount.toFixed(2)}`);
        printer.println(`Cambio: $${(ticket.changeAmount || 0).toFixed(2)}`);
      }
      if (ticket.notes) {
        printer.println(`Notas: ${ticket.notes}`);
      }
      printer.drawLine();
      printer.alignCenter();
      printer.println('¡Gracias por su compra!');
      printer.feed(3);
      printer.cut();
      printer.openCashDrawer(); // Abrir cajón si está conectado

      await printer.execute();
      this.logger.log(`Ticket ${ticket.id} printed successfully`, 'ThermalPrinterService.printTicket');
      return true;
      
    } catch (error) {
      this.logger.error(`Error printing ticket ${ticket.id}:`, error);
      return false;
    }
  }

  async printTestPage(printerId?: string): Promise<boolean> {
    try {
      const printer = printerId ? this.printers.get(printerId) : this.getDefaultPrinter();
      
      if (!printer) {
        this.logger.error(`Printer ${printerId || 'default'} not connected`);
        return false;
      }

      this.logger.log(`Printing test page on printer ${printerId || 'default'}`, 'ThermalPrinterService.printTestPage');

      printer.alignCenter();
      printer.bold(true);
      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printer.println('GROOVE BAR');
      printer.setTextNormal();
      printer.bold(false);
      printer.println('--- Test Page ---');
      printer.println(`Date: ${new Date().toLocaleString('es-ES')}`);
      printer.println(`Printer: ${printerId || 'Default'}`);
      printer.drawLine();
      printer.println('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
      printer.println('abcdefghijklmnopqrstuvwxyz');
      printer.println('0123456789!@#$%^&*()');
      printer.feed(3);
      printer.cut();
      
      await printer.execute();
      this.logger.log(`Test page printed successfully on printer ${printerId || 'default'}`, 'ThermalPrinterService.printTestPage');
      return true;
      
    } catch (error) {
      this.logger.error(`Error printing test page on printer ${printerId || 'default'}:`, error);
      return false;
    }
  }

  async getPrintersStatus(): Promise<PrinterStatus[]> {
    const statuses: PrinterStatus[] = [];
    
    for (const config of this.printerConfigs) {
      const printer = this.printers.get(config.id);
      let connected = false;
      let lastError: string | undefined;

      if (printer) {
        try {
          connected = await printer.isPrinterConnected();
        } catch (error) {
          connected = false;
          lastError = error.message;
        }
      } else {
        lastError = 'Printer not initialized';
      }

      statuses.push({
        id: config.id,
        name: config.name,
        connected,
        barId: config.barId,
        lastError
      });
    }
    
    return statuses;
  }

  async reconnectPrinter(printerId?: string): Promise<boolean> {
    if (printerId) {
      // Reconectar impresora específica
      const config = this.printerConfigs.find(p => p.id === printerId);
      if (config) {
        // Cerrar conexión existente
        this.printers.delete(printerId);
        
        // Reconectar
        return await this.connectPrinter(config);
      }
    } else {
      // Reconectar todas las impresoras
      await this.initializePrinters();
      return true;
    }
    
    return false;
  }

  async isConnected(printerId?: string): Promise<boolean> {
    if (printerId) {
      const printer = this.printers.get(printerId);
      if (printer) {
        try {
          return await printer.isPrinterConnected();
        } catch {
          return false;
        }
      }
      return false;
    } else {
      return this.printers.size > 0;
    }
  }

  async getAvailablePrinters(): Promise<PrinterConfig[]> {
    return this.printerConfigs.filter(config => config.active);
  }

  async addPrinterConfig(config: Omit<PrinterConfig, 'id'>): Promise<string> {
    const newId = `printer-${Date.now()}`;
    const newConfig: PrinterConfig = {
      id: newId,
      ...config
    };
    
    this.printerConfigs.push(newConfig);
    
    if (config.active) {
      await this.connectPrinter(newConfig);
    }
    
    this.logger.log(`New printer config added: ${newId}`, 'ThermalPrinterService.addPrinterConfig');
    return newId;
  }

  async removePrinterConfig(printerId: string): Promise<boolean> {
    const configIndex = this.printerConfigs.findIndex(p => p.id === printerId);
    if (configIndex === -1) {
      return false;
    }
    
    // Cerrar conexión si existe
    this.printers.delete(printerId);
    
    // Remover configuración
    this.printerConfigs.splice(configIndex, 1);
    
    this.logger.log(`Printer config removed: ${printerId}`, 'ThermalPrinterService.removePrinterConfig');
    return true;
  }
}