import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import cors from 'cors';

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors());

// Préfixe /api pour toutes les routes
const router = express.Router();

// Route d'inscription (désactivée)
router.post('/register', (req, res) => {
  res.status(403).json({ error: "L'inscription publique est désactivée. Contactez un administrateur." });
});

// Route de connexion
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect" });
    }

    res.json({
      id: user.id,
      username: user.username,
      is_admin: user.is_admin,
      font_size: user.font_size
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: "Erreur lors de la connexion" });
  }
});

// Route pour ajouter un scan
router.post('/scans', async (req, res) => {
  const { userId, code1, code2, isMatch, confirmed = true } = req.body;
  
  try {
    const scan = await prisma.scan.create({
      data: {
        user_id: userId,
        code1,
        code2,
        is_match: isMatch,
        confirmed,
        scanned_at: new Date()
      }
    });
    res.json(scan);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du scan:', error);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du scan" });
  }
});

// Route pour récupérer les scans d'un utilisateur
router.get('/scans', async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: "userId est requis" });
  }

  try {
    const scans = await prisma.scan.findMany({
      where: {
        user_id: parseInt(userId),
        OR: [
          { is_match: true },
          { confirmed: true }
        ]
      },
      orderBy: {
        scanned_at: 'desc'
      }
    });
    res.json(scans);
  } catch (error) {
    console.error('Erreur lors de la récupération des scans:', error);
    res.status(500).json({ error: "Erreur lors de la récupération des scans" });
  }
});

// Route pour récupérer tous les scans (admin seulement)
router.get('/admin/scans', async (req, res) => {
  const { userId } = req.query;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user?.is_admin) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    
    const scans = await prisma.scan.findMany({
      include: {
        user: {
          select: {
            username: true
          }
        }
      },
      orderBy: {
        scanned_at: 'desc'
      }
    });
    
    res.json(scans);
  } catch (error) {
    console.error('Erreur lors de la récupération des scans:', error);
    res.status(500).json({ error: "Erreur lors de la récupération des scans" });
  }
});

// Route pour récupérer tous les utilisateurs (admin seulement)
router.get('/admin/users', async (req, res) => {
  const { userId } = req.query;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user?.is_admin) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        is_admin: true,
        created_at: true,
        _count: {
          select: {
            scans: true
          }
        }
      }
    });
    
    res.json(users);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
  }
});

// Route pour mettre à jour les préférences d'un utilisateur
router.post('/users/:id/preferences', async (req, res) => {
  const userId = parseInt(req.params.id);
  const { fontSize } = req.body;
  
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { font_size: fontSize }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error);
    res.status(500).json({ error: "Erreur lors de la mise à jour des préférences" });
  }
});

// Montage du router avec le préfixe /api
app.use('/api', router);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});
