import { DynamoDBService } from '../src/shared/services/dynamodb.service';
import { UserModel } from '../src/shared/models/user.model';
import { TABLE_NAMES } from '../src/shared/config/dynamodb.config';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

async function createAdminUser() {
  try {
    console.log('🚀 Creando usuario admin...');
    
    const dynamoDBService = new DynamoDBService();
    
    // Verificar si ya existe un admin
    const existingAdmins = await dynamoDBService.query(
      TABLE_NAMES.USERS,
      'GSI1PK = :gsi1pk',
      { ':gsi1pk': 'ROLE#admin' },
      { 'GSI1': 'GSI1PK, GSI1SK' }
    );

    if (existingAdmins.length > 0) {
      console.log('✅ Ya existe un usuario admin');
      console.log(`   - Email: ${existingAdmins[0].email}`);
      console.log(`   - Nombre: ${existingAdmins[0].name}`);
      return;
    }

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = new UserModel({
      email: 'admin@groove.com',
      password: hashedPassword,
      name: 'Administrator',
    });
    
    // Cambiar el rol a admin después de crear el modelo
    adminUser.role = 'admin';

    await dynamoDBService.put(TABLE_NAMES.USERS, adminUser.toDynamoDBItem());

    console.log('✅ Usuario admin creado exitosamente');
    console.log(`   - Email: ${adminUser.email}`);
    console.log(`   - Password: admin123`);
    console.log(`   - Nombre: ${adminUser.name}`);
    console.log(`   - Rol: ${adminUser.role}`);
    
  } catch (error) {
    console.error('❌ Error creando usuario admin:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createAdminUser().catch(console.error);
}

export { createAdminUser };
