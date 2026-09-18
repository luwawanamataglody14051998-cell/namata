import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import mqtt from 'mqtt';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();


const PORT = process.env.PORT || 10000; 


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("[ERREUR SÉCURITÉ CRITIQUE] La variable d'environnement JWT_SECRET n'est pas configurée.");
  process.exit(1); 
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


const mqttClient = mqtt.connect('mqtts://broker.hivemq.com', {
  clientId: 'MaisonConnectee_Groupe08_' + Math.random().toString(16).substr(2, 8),
  rejectUnauthorized: false 
});

mqttClient.on('connect', () => {
  console.log('[MQTT/TLS] Connecté avec succès au broker sécurisé.');
});

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Accès refusé. Token manquant.' });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expirée ou invalide.' });
  }
};

app.use(express.static(path.join(__dirname, 'public')));
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) console.error('Erreur BDD:', err.message);
  else console.log('[BDD] SQLite3 opérationnelle (database.sqlite)');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    role TEXT,
    passwordHash TEXT,
    photoUrl TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS security_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    username TEXT,
    role TEXT,
    action TEXT,
    payload TEXT,
    status TEXT,
    reason TEXT
  )`);

  // Table limitatrice temporelle contre le spamming d'objets connectés (Anti-DoS)
  db.run(`CREATE TABLE IF NOT EXISTS command_throttle (
    username TEXT PRIMARY KEY,
    last_command_time INTEGER,
    command_count_short_term INTEGER
  )`);

  db.get("SELECT count(*) as count FROM users", [], (err, row) => {
    if (row && row.count === 0) {
      const img = "https://unsplash.com";
      db.run("INSERT INTO users (username, role, passwordHash, photoUrl) VALUES (?, ?, ?, ?)", ['admin', 'ADMIN', bcrypt.hashSync('AdminPass123!', 10), img]);
      db.run("INSERT INTO users (username, role, passwordHash, photoUrl) VALUES (?, ?, ?, ?)", ['user', 'USER', bcrypt.hashSync('UserPass123!', 10), img]);
      db.run("INSERT INTO users (username, role, passwordHash, photoUrl) VALUES (?, ?, ?, ?)", ['guest', 'GUEST', bcrypt.hashSync('GuestPass123!', 10), img]);
      console.log('[BDD] Profils d\'origine injectés.');
    }
  });
});
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Champs incomplets.' });

  db.get("SELECT * FROM users WHERE username = ?", [username.toLowerCase()], (err, user) => {
    const time = new Date().toISOString();
    if (err || !user || !bcrypt.compareSync(password, user.passwordHash)) {
      db.run(`INSERT INTO security_logs (timestamp, username, role, action, payload, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [time, username || 'Anonyme', 'NONE', 'CONNEXION', 'Échec login', 'ECHEC', 'Identifiants incorrects']
      );
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    db.run(`INSERT INTO security_logs (timestamp, username, role, action, payload, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [time, user.username, user.role, 'CONNEXION', 'Authentification', 'SUCCES', 'Session ouverte']
    );
    return res.json({ token, role: user.role, username: user.username, photoUrl: user.photoUrl });
  });
});

app.post('/api/register', verifyToken, (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Privilèges ADMIN requis.' });
  const { username, password, roleInput, photoUrl } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires.' });

  const targetRole = roleInput ? roleInput.toUpperCase() : 'USER';
  const img = photoUrl || "https://unsplash.com";
  const hash = bcrypt.hashSync(password, 10);

  db.run("INSERT INTO users (username, role, passwordHash, photoUrl) VALUES (?, ?, ?, ?)", [username.toLowerCase(), targetRole, hash, img], function(err) {
    if (err) return res.status(400).json({ error: 'Cet identifiant existe déjà.' });
    const time = new Date().toISOString();
    db.run(`INSERT INTO security_logs (timestamp, username, role, action, payload, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [time, req.user.username, req.user.role, 'CREATION_COMPTE', `Compte: ${username}`, 'SUCCES', `Rôle affecté: ${targetRole}`]
    );
    return res.json({ success: `L'opérateur ${username} a été enregistré avec succès.` });
  });
});

app.post('/api/update-password', verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const username = req.user.username;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    }
    db.run("UPDATE users SET passwordHash = ? WHERE username = ?", [bcrypt.hashSync(newPassword, 10), username], function(upErr) {
      if (upErr) return res.status(500).json({ error: upErr.message });
      const time = new Date().toISOString();
      db.run(`INSERT INTO security_logs (timestamp, username, role, action, payload, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [time, username, user.role, 'MODIF_PASSWORD', 'Réussi', 'SUCCES', 'Secret renouvelé avec succès']
      );
      return res.json({ success: 'Mot de passe mis à jour avec succès.' });
    });
  });
});


app.post('/api/logs', verifyToken, (req, res) => {
  const { action, payload, status, reason } = req.body;
  const username = req.user.username;
  const now = Date.now();
  const timeString = new Date().toISOString();

  db.get("SELECT * FROM command_throttle WHERE username = ?", [username], (err, row) => {
    let lastTime = row ? parseInt(row.last_command_time) : 0;
    let count = row ? row.command_count_short_term : 0;

    if (now - lastTime < 1500) {
      count++;
    } else {
      count = 0;
    }

    db.run(`INSERT OR REPLACE INTO command_throttle (username, last_command_time, command_count_short_term) VALUES (?, ?, ?)`, [username, now, count]);

    if (count >= 3) { 
      const alertReason = `Alerte : Plus de 3 commandes consécutives ultra-rapides. Écart: ${now - lastTime}ms.`;
      db.run(`INSERT INTO security_logs (timestamp, username, role, action, payload, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [timeString, username, req.user.role, `ANOMALIE_${action}`, payload, 'BLOQUÉ', alertReason]
      );
      return res.status(429).json({ error: "Comportement anormal détecté. Action temporairement bloquée par le pare-feu réseau." });
    }

    db.run(`INSERT INTO security_logs (timestamp, username, role, action, payload, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [timeString, username, req.user.role, action, payload, status, reason],
      (insErr) => {
        if (insErr) return res.status(500).json({ error: insErr.message });

        if (mqttClient.connected) {
          const mqttPayload = JSON.stringify({ device: payload, status: reason, user: username });
          mqttClient.publish('groupe08/maison/securite', mqttPayload);
        }
        res.json({ success: true });
      }
    );
  });
});

app.get('/api/admin/logs', verifyToken, (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Interdit.' });
  db.all("SELECT * FROM security_logs ORDER BY id DESC LIMIT 50", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message }); 
    res.json(rows);
  });
});

app.get('/api/admin/users', verifyToken, (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Interdit.' });
  db.all("SELECT id, username, role FROM users ORDER BY username ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message }); 
    res.json(rows);
  });
});

app.delete('/api/admin/users/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Interdit.' });
  
  const targetId = req.params.id;
  db.get("SELECT username FROM users WHERE id = ?", [targetId], (err, targetUser) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!targetUser) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    if (targetUser.username === req.user.username) {
      return res.status(400).json({ error: 'Action impossible : vous ne pouvez pas vous auto-supprimer.' });
    }
    db.run("DELETE FROM users WHERE id = ?", [targetId], function(delErr) {
      if (delErr) return res.status(500).json({ error: delErr.message });
      const time = new Date().toISOString();
      db.run(`INSERT INTO security_logs (timestamp, username, role, action, payload, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [time, req.user.username, req.user.role, 'SUPPRESSION_COMPTE', `Compte supprimé: ${targetUser.username}`, 'SUCCES', `ID cible: ${targetId}`]
      );
      return res.json({ success: `L'utilisateur ${targetUser.username} a été supprimé.` });
    });
  });
});

app.listen(PORT, () => console.log(`[SERVEUR RUNNING] Serveur actif sur le port : ${PORT}`));
