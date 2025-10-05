const { NetworkPrinter } = require('escpos-usb');

async function testPrinter() {
  const printerConfig = {
    ip: process.env.PRINTER_IP || '192.168.1.100',
    port: parseInt(process.env.PRINTER_PORT || '9100'),
    timeout: 3000,
  };

  console.log(`🔌 Conectando a impresora en ${printerConfig.ip}:${printerConfig.port}...`);

  try {
    const printer = new NetworkPrinter();
    await printer.open(printerConfig.ip, printerConfig.port);
    
    console.log('✅ Conexión exitosa!');
    
    // Configurar impresora
    printer.align('ct');
    printer.size(1, 1);
    printer.text('PRUEBA DE IMPRESORA\n');
    printer.text('========================\n');
    
    printer.size(0, 0);
    printer.text('GROOVE BAR\n');
    printer.text('Sistema de Barras\n');
    printer.text('========================\n');
    printer.text(`Fecha: ${new Date().toLocaleString('es-ES')}\n`);
    printer.text('Esta es una prueba de\n');
    printer.text('conectividad con la\n');
    printer.text('impresora térmica.\n');
    printer.text('========================\n');
    printer.text('Si puedes leer este\n');
    printer.text('mensaje, la impresora\n');
    printer.text('está funcionando\n');
    printer.text('correctamente.\n');
    printer.text('========================\n');
    
    // Cortar papel
    printer.cut();
    
    console.log('🖨️ Página de prueba enviada a la impresora');
    console.log('✅ Prueba completada exitosamente!');
    
    printer.close();
    
  } catch (error) {
    console.error('❌ Error al conectar con la impresora:');
    console.error('   ', error.message);
    console.log('\n📋 Verifica lo siguiente:');
    console.log('   1. La impresora está encendida');
    console.log('   2. La impresora está conectada a la red');
    console.log('   3. La IP y puerto son correctos');
    console.log('   4. No hay firewall bloqueando la conexión');
    console.log('\n🔧 Configuración actual:');
    console.log(`   IP: ${printerConfig.ip}`);
    console.log(`   Puerto: ${printerConfig.port}`);
    console.log('\n💡 Para cambiar la configuración:');
    console.log('   export PRINTER_IP=192.168.1.XXX');
    console.log('   export PRINTER_PORT=9100');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testPrinter();
}

module.exports = { testPrinter };
