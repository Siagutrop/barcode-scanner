import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configuration de base
app.use(express.json());
app.use(cors());

// Route de vérification de santé
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Connexion à la base de données SQLite
const db = new sqlite3.Database(join(__dirname, 'scanner.db'), (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
  } else {
    console.log('Connecté à la base de données SQLite');
  }
});

// Fonction d'initialisation de la base de données
async function initializeDatabase() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT 0,
      font_size TEXT DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      code1 TEXT NOT NULL,
      code2 TEXT NOT NULL,
      is_match BOOLEAN NOT NULL,
      confirmed BOOLEAN DEFAULT 1,
      scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`
  ];

  for (const query of queries) {
    await new Promise((resolve, reject) => {
      db.run(query, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }).catch(console.error);
  }

  // Créer le compte admin par défaut
  db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (!err && !row) {
      db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)',
        ['admin', 'Algarve@18'],
        (err) => err ? console.error('Erreur création admin:', err) : console.log('Admin créé')
      );
    }
  });
}

// Middleware de gestion d'erreur
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur serveur' });
});

// Route d'inscription (désactivée)
app.post('/register', (req, res) => {
  res.status(403).json({ error: "L'inscription publique est désactivée. Contactez un administrateur." });
});

// Route de connexion
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT id, username, is_admin, font_size FROM users WHERE username = ? AND password = ?',
    [username, password],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: "Erreur lors de la connexion" });
      }
      if (!row) {
        return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect" });
      }
      res.json(row);
    }
  );
});

// Route pour ajouter un scan
app.post('/scans', (req, res) => {
  const { userId, code1, code2, isMatch, confirmed = true } = req.body;
  
  db.run(`
    INSERT INTO scans (user_id, code1, code2, is_match, confirmed, scanned_at) 
    VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `, [userId, code1, code2, isMatch ? 1 : 0, confirmed ? 1 : 0],
    function(err) {
      if (err) {
        console.error('Erreur lors de l\'enregistrement du scan:', err);
        return res.status(500).json({ error: "Erreur lors de l'enregistrement du scan" });
      }

      // Récupérer le scan qui vient d'être créé
      db.get(`
        SELECT 
          id,
          user_id,
          code1,
          code2,
          is_match,
          confirmed,
          datetime(scanned_at) as scanned_at
        FROM scans 
        WHERE id = ?
      `, [this.lastID], (err, scan) => {
        if (err) {
          console.error('Erreur lors de la récupération du scan:', err);
          return res.status(500).json({ error: "Erreur lors de la récupération du scan" });
        }
        res.json(scan);
      });
    }
  );
});

// Route pour récupérer les scans d'un utilisateur
app.get('/scans', (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ error: "userId est requis" });
  }

  db.all(`
    SELECT 
      id,
      user_id,
      code1,
      code2,
      is_match,
      confirmed,
      datetime(scanned_at) as scanned_at
    FROM scans 
    WHERE user_id = ? 
    AND (is_match = 1 OR confirmed = 1)
    ORDER BY scanned_at DESC
  `, [userId], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des scans:', err);
      return res.status(500).json({ error: "Erreur lors de la récupération des scans" });
    }
    res.json(rows);
  });
});

// Route pour récupérer tous les scans (admin seulement)
app.get('/admin/scans', (req, res) => {
  const { userId } = req.query;
  
  // Vérifier si l'utilisateur est admin
  db.get('SELECT is_admin FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Erreur lors de la vérification des droits" });
    }
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    
    // Si admin, récupérer tous les scans
    db.all(`
      SELECT 
        s.id,
        s.code1,
        s.code2,
        s.is_match,
        s.confirmed,
        strftime('%Y-%m-%dT%H:%M:%S.000Z', s.scanned_at) as scanned_at,
        u.username
      FROM scans s 
      LEFT JOIN users u ON s.user_id = u.id 
      WHERE s.is_match = 1 OR s.confirmed = 1
      ORDER BY s.scanned_at DESC
    `, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Erreur lors de la récupération des scans" });
      }
      res.json(rows);
    });
  });
});

// Route pour créer un compte admin
app.post('/admin/create', (req, res) => {
  const { username, password, adminKey } = req.body;
  
  // Vérifier la clé admin (à remplacer par une vraie clé sécurisée)
  if (adminKey !== 'votre_clé_secrète_admin') {
    return res.status(403).json({ error: "Clé admin invalide" });
  }
  
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Erreur lors de la vérification de l'utilisateur" });
    }
    if (row) {
      return res.status(400).json({ error: "Nom d'utilisateur déjà utilisé" });
    }
    
    db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)',
      [username, password],
      function(err) {
        if (err) {
          return res.status(500).json({ error: "Erreur lors de la création du compte admin" });
        }
        res.json({ id: this.lastID, username, is_admin: true });
      }
    );
  });
});

// Route pour créer un utilisateur (admin seulement)
app.post('/admin/users', (req, res) => {
  const { userId } = req.query;
  const { username, password, is_admin } = req.body;
  
  // Vérifier si l'utilisateur est admin
  db.get('SELECT is_admin FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Erreur lors de la vérification des droits" });
    }
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    
    // Vérifier si le nom d'utilisateur existe déjà
    db.get('SELECT id FROM users WHERE username = ?', [username], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: "Erreur lors de la vérification de l'utilisateur" });
      }
      if (existingUser) {
        return res.status(400).json({ error: "Nom d'utilisateur déjà utilisé" });
      }
      
      // Créer le nouvel utilisateur
      db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
        [username, password, is_admin ? 1 : 0],
        function(err) {
          if (err) {
            return res.status(500).json({ error: "Erreur lors de la création de l'utilisateur" });
          }
          res.json({ 
            id: this.lastID, 
            username, 
            is_admin: is_admin ? 1 : 0,
            created_at: new Date().toISOString()
          });
        }
      );
    });
  });
});

// Route pour récupérer tous les utilisateurs (admin seulement)
app.get('/admin/users', (req, res) => {
  const { userId } = req.query;
  
  // Vérifier si l'utilisateur est admin
  db.get('SELECT is_admin FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Erreur lors de la vérification des droits" });
    }
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    
    // Si admin, récupérer tous les utilisateurs
    db.all(`
      SELECT id, username, is_admin, datetime(created_at, 'localtime') as created_at
      FROM users
      ORDER BY created_at DESC
    `, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
      }
      res.json(rows);
    });
  });
});

// Route pour supprimer un utilisateur (admin seulement)
app.delete('/admin/users/:id', (req, res) => {
  const { userId } = req.query;
  const userToDelete = req.params.id;
  
  // Vérifier si l'utilisateur est admin
  db.get('SELECT is_admin FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Erreur lors de la vérification des droits" });
    }
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    
    // Empêcher la suppression de son propre compte
    if (parseInt(userId) === parseInt(userToDelete)) {
      return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte" });
    }
    
    // Si admin, supprimer l'utilisateur et ses scans
    db.run('DELETE FROM scans WHERE user_id = ?', [userToDelete], (err) => {
      if (err) {
        return res.status(500).json({ error: "Erreur lors de la suppression des scans" });
      }
      
      db.run('DELETE FROM users WHERE id = ?', [userToDelete], (err) => {
        if (err) {
          return res.status(500).json({ error: "Erreur lors de la suppression de l'utilisateur" });
        }
        res.json({ message: "Utilisateur supprimé avec succès" });
      });
    });
  });
});

// Route pour modifier les droits d'un utilisateur (admin seulement)
app.put('/admin/users/:id', (req, res) => {
  const { userId } = req.query;
  const userToUpdate = req.params.id;
  const { is_admin } = req.body;
  
  // Vérifier si l'utilisateur est admin
  db.get('SELECT is_admin FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Erreur lors de la vérification des droits" });
    }
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }
    
    // Empêcher la modification de ses propres droits
    if (parseInt(userId) === parseInt(userToUpdate)) {
      return res.status(400).json({ error: "Vous ne pouvez pas modifier vos propres droits" });
    }
    
    // Si admin, modifier les droits de l'utilisateur
    db.run('UPDATE users SET is_admin = ? WHERE id = ?', [is_admin, userToUpdate], (err) => {
      if (err) {
        return res.status(500).json({ error: "Erreur lors de la modification des droits" });
      }
      res.json({ message: "Droits modifiés avec succès" });
    });
  });
});

// Route pour réinitialiser le mot de passe d'un utilisateur (admin seulement)
app.post('/admin/users/:id/reset-password', (req, res) => {
  const { userId } = req.query;
  const targetUserId = req.params.id;
  const { newPassword } = req.body;
  
  // Vérifier si l'utilisateur est admin
  db.get('SELECT is_admin FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Erreur lors de la vérification des droits" });
    }
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: "Accès non autorisé" });
    }

    // Vérifier si l'utilisateur cible existe
    db.get('SELECT id FROM users WHERE id = ?', [targetUserId], (err, targetUser) => {
      if (err) {
        return res.status(500).json({ error: "Erreur lors de la vérification de l'utilisateur" });
      }
      if (!targetUser) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      // Mettre à jour le mot de passe
      db.run('UPDATE users SET password = ? WHERE id = ?',
        [newPassword, targetUserId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: "Erreur lors de la réinitialisation du mot de passe" });
          }
          res.json({ message: "Mot de passe réinitialisé avec succès" });
        }
      );
    });
  });
});

// Route pour mettre à jour les préférences utilisateur
app.post('/users/:id/preferences', (req, res) => {
  const userId = req.params.id;
  const { fontSize } = req.body;
  
  // Vérifier que la taille est valide
  const validSizes = ['small', 'normal', 'large'];
  if (!validSizes.includes(fontSize)) {
    return res.status(400).json({ error: "Taille de police invalide" });
  }

  // Mettre à jour les préférences
  db.run('UPDATE users SET font_size = ? WHERE id = ?',
    [fontSize, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: "Erreur lors de la mise à jour des préférences" });
      }
      res.json({ message: "Préférences mises à jour avec succès" });
    }
  );
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  db.close(() => {
    console.log('Base de données fermée');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3002; // Utiliser le port 3002
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT} en mode ${process.env.NODE_ENV || 'développement'}`);
  initializeDatabase();
});
