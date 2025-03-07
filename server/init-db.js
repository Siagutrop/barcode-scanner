import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function initializeDatabase() {
  try {
    // Création de l'utilisateur admin par défaut
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        is_admin: true,
      },
    });

    console.log('Base de données initialisée avec succès !');
    console.log(`Utilisateur admin créé : ${adminUsername}`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('L\'utilisateur admin existe déjà.');
    } else {
      console.error('Erreur lors de l\'initialisation de la base de données:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

initializeDatabase();
