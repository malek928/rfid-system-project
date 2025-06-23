const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rfid_system',
  password: '92442505',
  port: 5432,
  client_encoding: 'UTF8'
  
});

// Test de connexion initiale
pool.connect((err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.stack);
    process.exit(1); // Arrête le serveur si la connexion échoue
  } else {
    console.log('Connecté à la base de données PostgreSQL avec succès.');
  }
});

// Gestion des erreurs de connexion
pool.on('error', (err, client) => {
  console.error('Erreur inattendue sur une connexion idle:', err.stack);
});

module.exports = pool;