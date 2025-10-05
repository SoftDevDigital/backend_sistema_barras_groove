const { Printer, PrinterTypes } = require('node-thermal-printer');

// Configuración de impresoras térmicas
const printerConfigs = [
  {
    id: 'printer-1',
    name: 'Impresora Barra Principal',
    printerName: 'Gadnic IT1050', // Nombre de la impresora en Windows
    active: true,
  },
  {
    id: 'printer-2',
    name: 'Impresora Barra Secundaria',
    printerName: 'Gadnic IT1050', // Segunda impresora si tienes
    active: false, // Desactivada por defecto
  },
];

async function testUSBPrinters() {
  console.log('🔌 Probando impresoras térmicas con node-thermal-printer...\n');

  for (const config of printerConfigs) {
    if (!config.active) {
      console.log(`📋 ${config.name} - DESACTIVADA\n`);
      continue;
    }

    console.log(`📋 Probando ${config.name}...`);
    console.log(`   ID: ${config.id}`);
    console.log(`   Nombre: ${config.printerName}`);

    try {
      const printer = new Printer({
        type: PrinterTypes.EPSON, // Gadnic IT1050 es compatible con Epson ESC/POS
        interface: config.printerName,
        options: {
          timeout: 5000,
        },
      });

      // Verificar conexión
      const isConnected = await printer.isPrinterConnected();
      
      if (!isConnected) {
        console.log('   ❌ Impresora no conectada o no disponible');
        console.log('   💡 Verifica que la impresora esté encendida y conectada\n');
        continue;
      }

      console.log('   ✅ Impresora conectada!');
      
      // Configurar impresora
      printer.alignCenter();
      printer.bold(true);
      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printer.println('GROOVE BAR');
      printer.setTextNormal();
      printer.bold(false);
      printer.println('--- Pagina de Prueba ---');
      printer.println(`Fecha: ${new Date().toLocaleString('es-ES')}`);
      printer.println(`Impresora: ${config.name}`);
      printer.println(`Nombre: ${config.printerName}`);
      printer.drawLine();
      printer.println('Esta es una prueba de');
      printer.println('conectividad con la');
      printer.println('impresora térmica.');
      printer.println('Si puedes leer esto,');
      printer.println('la impresora funciona');
      printer.println('correctamente.');
      printer.drawLine();
      printer.println('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
      printer.println('abcdefghijklmnopqrstuvwxyz');
      printer.println('0123456789!@#$%^&*()');
      printer.feed(3);
      printer.cut();
      
      await printer.execute();
      console.log('   🖨️ Página de prueba enviada');
      console.log('   ✅ Prueba completada exitosamente!\n');
      
    } catch (error) {
      console.log('   ❌ Error al conectar o imprimir:');
      console.log(`      ${error.message}\n`);
    }
  }

  console.log('📋 Instrucciones para configurar la impresora:');
  console.log('1. Conecta tu impresora Gadnic IT1050 por USB');
  console.log('2. Instala los drivers de la impresora');
  console.log('3. En Windows, ve a "Configuración > Dispositivos > Impresoras y escáneres"');
  console.log('4. Busca tu impresora y anota el nombre exacto');
  console.log('5. Actualiza el campo "printerName" en el código con el nombre real');
  console.log('6. Ejecuta este script nuevamente\n');

  console.log('🔧 Configuración típica para Gadnic IT1050:');
  console.log('   - Tipo: Epson ESC/POS (compatible)');
  console.log('   - Interfaz: USB');
  console.log('   - Ancho de papel: 80mm');
  console.log('   - Protocolo: ESC/POS\n');

  console.log('💡 Si la impresora no aparece:');
  console.log('   1. Verifica que esté encendida');
  console.log('   2. Revisa la conexión USB');
  console.log('   3. Instala/reinstala los drivers');
  console.log('   4. Prueba con otra aplicación primero');
  console.log('   5. Verifica que no esté en uso por otra aplicación\n');

  console.log('📝 Para usar en producción:');
  console.log('   1. Configura el nombre correcto en thermal-printer.service.ts');
  console.log('   2. Activa solo las impresoras que tengas conectadas');
  console.log('   3. Asocia cada impresora con su barra correspondiente');
  console.log('   4. Prueba la impresión de tickets reales\n');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testUSBPrinters();
}

module.exports = { testUSBPrinters, printerConfigs };