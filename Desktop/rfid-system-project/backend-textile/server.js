const express = require("express");
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());




// Connexion à PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  client_encoding: 'UTF8'
});

// Exporte le pool pour l'utiliser dans d'autres fichiers
module.exports = { app, pool };


// Test de connexion à la base de données et vérification du schéma
pool.connect(async (err, client, release) => {
  if (err) {
    console.error("Erreur de connexion à PostgreSQL:", err.stack);
    return;
  }
  console.log("Connexion à PostgreSQL reussie !");
  console.log("Configuration du pool:", {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  try {
    await client.query("SET search_path TO rfid_system");
    const searchPathResult = await client.query("SHOW search_path;");
    console.log("Search path actuel:", searchPathResult.rows[0].search_path);

    const tableCheck = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'rfid_system' AND table_name = 'machines')"
    );
    console.log("Table rfid_system.machines existe:", tableCheck.rows[0].exists);

    const testQuery = await client.query("SELECT * FROM rfid_system.lots WHERE epc = $1", ["LOT_EPC002"]);
    console.log("Resultat du test direct pour LOT_EPC002:", testQuery.rows);
  } catch (testErr) {
    console.error("Erreur lors du test de la requete:", testErr.stack);
  }

  release();
});

// Middleware pour vérifier le token JWT
const authenticateToken = (req, res, next) => {
  console.log("Verification du token...");
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    console.log("Aucun token fourni");
    return res.status(401).json({ error: "Acces non autorise" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log("Token invalide:", err.message);
      return res.status(403).json({ error: "Token invalide" });
    }
    console.log("Token valide, utilisateur:", user);
    req.user = user;
    next();
  });
};

// Endpoint pour la connexion (POST /api/login)
// Authentifie un utilisateur avec son email et mot de passe, génère un token JWT
app.post("/api/login", async (req, res) => {
  console.log("Requete de connexion recue:", req.body);
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM rfid_system.utilisateurs WHERE email = $1 AND is_active = true",
      [email]
    );
    const user = result.rows[0];
    console.log("Utilisateur trouve:", user);

    if (!user) {
      console.log("Utilisateur non trouve ou inactif pour email:", email);
      return res.status(401).json({ error: "Utilisateur non trouve ou inactif" });
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);
    console.log("Mot de passe valide:", passwordIsValid);
    if (!passwordIsValid) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }

    const roleResult = await pool.query("SELECT nom_role FROM rfid_system.roles WHERE role_id = $1", [
      user.role_id,
    ]);
    const role = roleResult.rows[0]?.nom_role.toLowerCase();
    console.log("Role trouve:", role);

    if (!role) {
      return res.status(403).json({ error: "Role non defini pour cet utilisateur" });
    }

    // Inclure nom et prenom dans le token
    const token = jwt.sign(
      {
        utilisateur_id: user.utilisateur_id,
        email: user.email,
        role,
        chaine_id: user.chaine_id,
        nom: user.nom, // Ajout de nom
        prenom: user.prenom // Ajout de prenom
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log("Token genere:", token);

    res.json({
      token,
      utilisateur_id: user.utilisateur_id,
      nom: user.nom,
      prenom: user.prenom,
      chaine_id: user.chaine_id,
    });
  } catch (err) {
    console.error("Erreur lors de la connexion:", err);
    res.status(500).json({ error: "Erreur serveur lors de la connexion" });
  }
});

// Endpoint pour vérifier la validité du token (GET /api/verify-token)
// Retourne un message si le token est valide après authentification
app.get("/api/verify-token", authenticateToken, (req, res) => {
  console.log("Verification du token reussie");
  res.json({ message: "Token valide" });
});

// Endpoint pour récupérer un lot par EPC (GET /api/lots/by-epc)
// Retourne les détails d'un lot en fonction de son EPC après authentification
app.get("/api/lots/by-epc", authenticateToken, async (req, res) => {
  console.log("Requete pour lot par EPC (brut):", req.query.epc);
  try {
    await pool.query("SET search_path TO rfid_system");
    const cleanedEpc = req.query.epc ? req.query.epc.trim().toUpperCase() : "";
    console.log("EPC nettoye:", cleanedEpc);
    const query = `
      SELECT 
        lot_id,
        epc,
        taille,
        couleur,
        quantite_initiale,
        jeans_defectueux,
        quantite_finale,
        temps_debut,
        temps_debut_travail,
        temps_fin,
        statut,
        chaine_id,
        localisation,
        ouvrier_nom
       FROM rfid_system.lots
       WHERE epc = $1
    `;
    const result = await pool.query(query, [cleanedEpc]);
    console.log("Resultat de la requete:", result.rows);
    if (result.rows.length > 0) {
      const lot = result.rows[0];
      console.log("Lot trouve par EPC:", lot);
      res.json(lot);
    } else {
      res.status(404).json({ error: "Lot non trouve pour cet EPC" });
    }
  } catch (err) {
    console.error("Erreur dans /api/lots/by-epc:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la recuperation du lot", details: err.message });
  }
});

// Endpoint pour récupérer les lots d'une chaîne (GET /api/lots)
// Retourne la liste des lots filtrés par chaine_id après authentification
app.get("/api/lots", authenticateToken, async (req, res) => {
  const { chaine_id } = req.query;

  if (!chaine_id) {
    return res.status(400).json({ error: "Parametre chaine_id manquant" });
  }

  try {
    console.log(`Recuperation des lots pour chaine_id: ${chaine_id}`);
    await pool.query("SET search_path TO rfid_system");
    const result = await pool.query(
      `SELECT 
        l.lot_id,
        l.epc,
        l.taille,
        l.couleur,
        (SELECT COUNT(*) FROM rfid_system.jeans j WHERE j.lot_id = l.lot_id) AS quantite_initiale,
        l.jeans_defectueux,
        l.quantite_finale,
        l.temps_debut,
        l.temps_debut_travail,
        l.temps_fin,
        l.statut,
        l.chaine_id,
        l.localisation,
        l.ouvrier_nom,
        l.operateur_nom
       FROM rfid_system.lots l
       WHERE l.chaine_id = $1
       ORDER BY l.lot_id`,
      [chaine_id]
    );

    console.log(`Lots recuperes: ${JSON.stringify(result.rows)}`);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur dans /api/lots:", err.stack);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// Endpoint pour récupérer un lot spécifique par lot_id (GET /api/lots/:lot_id)
// Retourne les détails d'un lot spécifique après authentification
app.get("/api/lots/:lot_id", authenticateToken, async (req, res) => {
  const { lot_id } = req.params;
  console.log("Requete pour recuperer un lot specifique, lot_id:", lot_id);

  if (!lot_id) {
    return res.status(400).json({ error: "ID du lot requis" });
  }

  try {
    const result = await pool.query(
      `SELECT 
        l.lot_id, 
        l.epc, 
        l.taille, 
        l.couleur, 
        l.quantite_initiale, 
        l.jeans_defectueux, 
        l.quantite_finale, 
        l.temps_debut, 
        l.temps_debut_travail, 
        l.temps_fin, 
        l.statut, 
        l.chaine_id, 
        l.localisation, 
        l.ouvrier_nom, 
        l.operateur_nom, -- Ajout de operateur_nom
        c.nom_chaine AS chaine 
       FROM rfid_system.lots l 
       JOIN rfid_system.chaines c ON l.chaine_id = c.chaine_id 
       WHERE l.lot_id = $1`,
      [lot_id]
    );

    if (result.rows.length === 0) {
      console.log("Lot non trouve pour lot_id:", lot_id);
      return res.status(404).json({ error: "Lot non trouve" });
    }

    const lot = result.rows[0];
    console.log("Lot recupere:", lot);
    res.json(lot);
  } catch (err) {
    console.error("Erreur dans /api/lots/:lot_id:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la recuperation du lot", details: err.message });
  }
});

// Endpoint pour récupérer les lots non assignés (GET /api/lots/non-assigned)
// Retourne la liste des lots non assignés (ouvrier_nom IS NULL) pour une chaîne donnée
app.get("/api/lots/non-assigned", authenticateToken, async (req, res) => {
  const { chaine_id } = req.query;
  console.log("Requete pour les lots non assignes, chaine_id:", chaine_id);

  if (!chaine_id) {
    return res.status(400).json({ error: "ID de la chaine requis" });
  }

  try {
    const result = await pool.query(
      `SELECT 
        l.lot_id, 
        l.taille, 
        l.couleur, 
        l.quantite_initiale, 
        l.temps_debut, 
        l.statut, 
        l.epc, 
        l.chaine_id, 
        l.jeans_defectueux, 
        l.quantite_finale, 
        l.ouvrier_nom, 
        l.operateur_nom, -- Ajout de operateur_nom
        c.nom_chaine AS chaine 
       FROM rfid_system.lots l 
       JOIN rfid_system.chaines c ON l.chaine_id = c.chaine_id 
       WHERE l.ouvrier_nom IS NULL AND l.chaine_id = $1 AND l.statut = 'en attente' 
       ORDER BY l.lot_id`,
      [chaine_id]
    );
    console.log("Lots non assignes recuperes:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur dans /api/lots/non-assigned:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la recuperation des lots non assignes", details: err.message });
  }
});



// -----------------------------------------
// API pour la preparation des lots (utilisee par les operateurs pour scanner les lots et jeans)
// -----------------------------------------

app.post("/api/lots/prepare", authenticateToken, async (req, res) => {
  const {
    lot_id,
    quantite_initiale = 0, // Valeur par defaut si non fourni
    temps_debut,
    epc,
    chaine_id,
    couleur,
    taille,
  } = req.body;
  console.log("Requete pour preparer un lot:", req.body);

  // Verification des champs obligatoires, quantite_initiale devient facultatif
  if (!lot_id || !temps_debut || !epc || !chaine_id || !couleur || !taille) {
    return res.status(400).json({ error: "Les champs requis (lot_id, temps_debut, epc, chaine_id, couleur, taille) doivent etre fournis" });
  }

  try {
    const result = await pool.query(
      `UPDATE rfid_system.lots 
       SET quantite_initiale = $1, 
           temps_debut = $2, 
           epc = $3, 
           couleur = $4, 
           taille = $5
       WHERE lot_id = $6 AND chaine_id = $7 RETURNING *`,
      [quantite_initiale, temps_debut, epc, couleur, taille, lot_id, chaine_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Lot ${lot_id} non trouve ou n'appartient pas a la chaine ${chaine_id}` });
    }
    console.log(`Lot ${lot_id} prepare avec succes:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur dans /api/lots/prepare:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la preparation du lot", details: err.message });
  }
});

// Endpoint pour créer un nouveau lot (POST /api/lots)
// Endpoint pour créer un nouveau lot (POST /api/lots)
app.post("/api/lots", authenticateToken, async (req, res) => {
  const {
    epc,
    temps_debut,
    chaine_id,
    couleur,
    taille,
    statut = "en attente",
  } = req.body;
  console.log("Requete pour creer un nouveau lot:", req.body);
  console.log("Utilisateur authentifie (req.user):", req.user);

  if (!epc || !temps_debut || !chaine_id || !couleur || !taille) {
    return res.status(400).json({ error: "Les champs requis (epc, temps_debut, chaine_id, couleur, taille) doivent etre fournis" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("SET search_path TO rfid_system");
    await client.query("BEGIN");

    const existingLot = await client.query(
      "SELECT lot_id FROM rfid_system.lots WHERE epc = $1",
      [epc]
    );
    if (existingLot.rows.length > 0) {
      throw new Error(`Un lot avec l'EPC ${epc} existe deja`);
    }

    const lotCounter = await client.query(
      "SELECT COUNT(*) FROM rfid_system.lots WHERE lot_id LIKE 'LOT%'"
    );
    const newLotNumber = parseInt(lotCounter.rows[0].count) + 1;
    const lot_id = `LOT${String(newLotNumber).padStart(3, "0")}`;

    if (!req.user.nom) {
      console.error("Nom de l'operateur non trouve dans req.user:", req.user);
      throw new Error("Nom de l'operateur non disponible");
    }
    const operateur_nom = `${req.user.nom} ${req.user.prenom || ''}`.trim();
    console.log("Nom de l'operateur a inserer:", operateur_nom);

    const result = await client.query(
      `INSERT INTO rfid_system.lots 
       (lot_id, epc, quantite_initiale, temps_debut, chaine_id, couleur, taille, statut, operateur_nom)
       VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [lot_id, epc, temps_debut, chaine_id, couleur, taille, statut, operateur_nom]
    );

    await client.query("COMMIT");
    console.log(`Nouveau lot cree avec lot_id ${result.rows[0].lot_id}:`, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("Erreur dans /api/lots:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la creation du lot", details: err.message });
  } finally {
    if (client) client.release();
  }
});

// Endpoint pour ajouter un jean (POST /api/jeans)
app.post("/api/jeans", authenticateToken, async (req, res) => {
  const { epc, lot_id, chaine_id } = req.body;
  console.log("Requete pour enregistrer un jean:", req.body);

  if (!epc || typeof epc !== "string" || epc.trim() === "" || !lot_id || typeof lot_id !== "string" || lot_id.trim() === "" || !chaine_id || typeof chaine_id !== "string" || chaine_id.trim() === "") {
    return res.status(400).json({ error: "Les champs epc, lot_id et chaine_id doivent etre des chaines non vides" });
  }

  const client = await pool.connect();
  try {
    await client.query("SET search_path TO rfid_system");
    await client.query("BEGIN");

    // Verifier si le lot existe et appartient a la chaine
    const lotResult = await client.query(
      "SELECT lot_id, statut, localisation, ouvrier_nom FROM rfid_system.lots WHERE lot_id = $1 AND chaine_id = $2 FOR UPDATE",
      [lot_id, chaine_id]
    );
    if (lotResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: `Lot ${lot_id} non trouve ou n'appartient pas a la chaine ${chaine_id}` });
    }
    const lotStatut = lotResult.rows[0].statut || "en attente";
    const statutQualite = lotStatut === "termine" ? "ok" : "non verifie";

    // Verifier si l'EPC existe deja
    const jeanResult = await client.query(
      "SELECT jean_id FROM rfid_system.jeans WHERE epc = $1",
      [epc]
    );
    if (jeanResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Cet EPC ${epc} est deja associe a un autre jean (${jeanResult.rows[0].jean_id})` });
    }

    // Inserer le jean
    const result = await client.query(
      `INSERT INTO rfid_system.jeans (epc, lot_id, chaine_id, statut, statut_qualite, localisation, ouvrier_nom)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [epc, lot_id, chaine_id, lotStatut, statutQualite, lotStatut === "termine" ? null : lotResult.rows[0].localisation, lotStatut === "termine" ? null : lotResult.rows[0].ouvrier_nom]
    );

    // Mettre à jour quantite_initiale avec le nombre exact de jeans
    const countResult = await client.query(
      "SELECT COUNT(*) AS count FROM rfid_system.jeans WHERE lot_id = $1",
      [lot_id]
    );
    const newQuantity = parseInt(countResult.rows[0].count, 10);
    await client.query(
      "UPDATE rfid_system.lots SET quantite_initiale = $1 WHERE lot_id = $2",
      [newQuantity, lot_id]
    );

    await client.query("COMMIT");
    console.log(`Jean enregistre avec jean_id ${result.rows[0].jean_id} pour le lot ${lot_id}:`, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur dans /api/jeans:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de l'enregistrement du jean", details: err.message });
  } finally {
    client.release();
  }
});

// Endpoint pour supprimer un jean (DELETE /api/jeans)
app.delete("/api/jeans", authenticateToken, async (req, res) => {
  const { epc } = req.body;
  console.log("Requete pour supprimer un jean, EPC:", epc);

  if (!epc || typeof epc !== "string" || epc.trim() === "") {
    return res.status(400).json({ error: "Le champ epc doit etre une chaine non vide" });
  }

  const client = await pool.connect();
  try {
    await client.query("SET search_path TO rfid_system");
    await client.query("BEGIN");

    // Verifier si le jean existe
    const jeanResult = await client.query(
      "SELECT jean_id, lot_id FROM rfid_system.jeans WHERE epc = $1 FOR UPDATE",
      [epc]
    );
    if (jeanResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: `Aucun jean trouve avec l'EPC ${epc}` });
    }

    const { lot_id } = jeanResult.rows[0];

    // Supprimer le jean
    await client.query(
      "DELETE FROM rfid_system.jeans WHERE epc = $1",
      [epc]
    );

    // Mettre à jour quantite_initiale dans la table lots
    const countResult = await client.query(
      "SELECT COUNT(*) AS count FROM rfid_system.jeans WHERE lot_id = $1",
      [lot_id]
    );
    const newQuantity = parseInt(countResult.rows[0].count, 10);
    await client.query(
      "UPDATE rfid_system.lots SET quantite_initiale = $1 WHERE lot_id = $2",
      [newQuantity, lot_id]
    );

    await client.query("COMMIT");
    console.log(`Jean avec EPC ${epc} supprime avec succes pour le lot ${lot_id}. Nouvelle quantite: ${newQuantity}`);
    res.status(200).json({ message: `Jean avec EPC ${epc} supprime`, newQuantity });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur dans /api/jeans (DELETE):", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la suppression du jean", details: err.message });
  } finally {
    client.release();
  }
});

// Endpoint pour récupérer les lots d'une chaîne (GET /api/lots)
app.get("/api/lots", authenticateToken, async (req, res) => {
  const { chaine_id } = req.query;

  if (!chaine_id) {
    return res.status(400).json({ error: "Parametre chaine_id manquant" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("SET search_path TO rfid_system");

    // Mettre à jour quantite_initiale pour tous les lots de la chaîne
    const lotsResult = await client.query(
      "SELECT lot_id FROM rfid_system.lots WHERE chaine_id = $1",
      [chaine_id]
    );
    for (const lot of lotsResult.rows) {
      const countResult = await client.query(
        "SELECT COUNT(*) AS count FROM rfid_system.jeans WHERE lot_id = $1",
        [lot.lot_id]
      );
      const newQuantity = parseInt(countResult.rows[0].count, 10);
      await client.query(
        "UPDATE rfid_system.lots SET quantite_initiale = $1 WHERE lot_id = $2",
        [newQuantity, lot.lot_id]
      );
    }

    // Récupérer les lots mis à jour
    const result = await client.query(
      `SELECT 
        l.lot_id,
        l.epc,
        l.taille,
        l.couleur,
        l.quantite_initiale,
        l.jeans_defectueux,
        l.quantite_finale,
        l.temps_debut,
        l.temps_debut_travail,
        l.temps_fin,
        l.statut,
        l.chaine_id,
        l.localisation,
        l.ouvrier_nom,
        l.operateur_nom
       FROM rfid_system.lots l
       WHERE l.chaine_id = $1
       ORDER BY l.lot_id`,
      [chaine_id]
    );

    console.log(`Lots recuperes: ${JSON.stringify(result.rows)}`);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur dans /api/lots:", err.stack);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    if (client) client.release();
  }
});

// Endpoint pour ajouter un jean (POST /api/jeans)
// Endpoint pour ajouter un jean (POST /api/jeans)
app.post("/api/jeans", authenticateToken, async (req, res) => {
  const { epc, lot_id, chaine_id } = req.body;
  console.log("Requete pour enregistrer un jean:", req.body);

  if (!epc || typeof epc !== "string" || epc.trim() === "" || !lot_id || typeof lot_id !== "string" || lot_id.trim() === "" || !chaine_id || typeof chaine_id !== "string" || chaine_id.trim() === "") {
    return res.status(400).json({ error: "Les champs epc, lot_id et chaine_id doivent etre des chaines non vides" });
  }

  const client = await pool.connect();
  try {
    await client.query("SET search_path TO rfid_system");
    await client.query("BEGIN");

    // Verifier si le lot existe et appartient a la chaine
    const lotResult = await client.query(
      "SELECT lot_id, statut, localisation, ouvrier_nom FROM rfid_system.lots WHERE lot_id = $1 AND chaine_id = $2 FOR UPDATE",
      [lot_id, chaine_id]
    );
    if (lotResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: `Lot ${lot_id} non trouve ou n'appartient pas a la chaine ${chaine_id}` });
    }
    const lotStatut = lotResult.rows[0].statut || "en attente";
    const statutQualite = lotStatut === "termine" ? "ok" : "non verifie";

    // Verifier si l'EPC existe deja
    const jeanResult = await client.query(
      "SELECT jean_id FROM rfid_system.jeans WHERE epc = $1",
      [epc]
    );
    if (jeanResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Cet EPC ${epc} est deja associe a un autre jean (${jeanResult.rows[0].jean_id})` });
    }

    // Inserer le jean
    const result = await client.query(
      `INSERT INTO rfid_system.jeans (epc, lot_id, chaine_id, statut, statut_qualite, localisation, ouvrier_nom)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [epc, lot_id, chaine_id, lotStatut, statutQualite, lotStatut === "termine" ? null : lotResult.rows[0].localisation, lotStatut === "termine" ? null : lotResult.rows[0].ouvrier_nom]
    );

    // Mettre à jour quantite_initiale avec le nombre exact de jeans
    const countResult = await client.query(
      "SELECT COUNT(*) AS count FROM rfid_system.jeans WHERE lot_id = $1",
      [lot_id]
    );
    const newQuantity = countResult.rows[0].count;
    await client.query(
      "UPDATE rfid_system.lots SET quantite_initiale = $1 WHERE lot_id = $2",
      [newQuantity, lot_id]
    );

    await client.query("COMMIT");
    console.log(`Jean enregistre avec jean_id ${result.rows[0].jean_id} pour le lot ${lot_id}:`, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur dans /api/jeans - Details complets:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
    });
    res.status(500).json({ error: "Erreur serveur lors de l'enregistrement du jean", details: err.message });
  } finally {
    client.release();
  }
});

////
// Endpoint pour compter les jeans d'un lot (GET /api/jeans/count)
app.get("/api/jeans/count", authenticateToken, async (req, res) => {
  const { lot_id } = req.query;
  console.log("Requete pour compter les jeans, lot_id:", lot_id);

  if (!lot_id) {
    return res.status(400).json({ error: "Parametre lot_id requis" });
  }

  try {
    await pool.query("SET search_path TO rfid_system");
    const result = await pool.query(
      "SELECT COUNT(*) AS count FROM rfid_system.jeans WHERE lot_id = $1",
      [lot_id]
    );
    console.log(`Nombre de jeans pour ${lot_id}:`, result.rows[0].count);
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error("Erreur dans /api/jeans/count:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors du comptage des jeans", details: err.message });
  }
});

///
// Endpoint pour récupérer la liste des jeans d'un lot (GET /api/jeans/by-lot)
app.get("/api/jeans/by-lot", authenticateToken, async (req, res) => {
  const { lot_id } = req.query;
  console.log("Requete pour recuperer les jeans, lot_id:", lot_id);

  if (!lot_id) {
    return res.status(400).json({ error: "Parametre lot_id requis" });
  }

  try {
    await pool.query("SET search_path TO rfid_system");
    const result = await pool.query(
      "SELECT epc FROM rfid_system.jeans WHERE lot_id = $1",
      [lot_id]
    );
    console.log(`Jeans recuperes pour ${lot_id}:`, result.rows);
    res.json({ jeans: result.rows.map(row => row.epc) });
  } catch (err) {
    console.error("Erreur dans /api/jeans/by-lot:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la recuperation des jeans", details: err.message });
  }
});

//
// Endpoint pour supprimer un jean (DELETE /api/jeans)
app.delete("/api/jeans", authenticateToken, async (req, res) => {
  const { epc } = req.body;
  console.log("Requête pour supprimer un jean, EPC:", epc);

  if (!epc || typeof epc !== "string" || epc.trim() === "") {
    return res.status(400).json({ error: "Le champ epc doit être une chaîne non vide" });
  }

  const client = await pool.connect();
  try {
    await client.query("SET search_path TO rfid_system");
    await client.query("BEGIN");

    // Vérifier si le jean existe
    const jeanResult = await client.query(
      "SELECT jean_id, lot_id FROM rfid_system.jeans WHERE epc = $1 FOR UPDATE",
      [epc]
    );
    if (jeanResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: `Aucun jean trouvé avec l'EPC ${epc}` });
    }

    const { lot_id } = jeanResult.rows[0];

    // Supprimer le jean
    await client.query(
      "DELETE FROM rfid_system.jeans WHERE epc = $1",
      [epc]
    );

    // Mettre à jour quantite_initiale dans la table lots
    const countResult = await client.query(
      "SELECT COUNT(*) AS count FROM rfid_system.jeans WHERE lot_id = $1",
      [lot_id]
    );
    const newQuantity = countResult.rows[0].count;
    await client.query(
      "UPDATE rfid_system.lots SET quantite_initiale = $1 WHERE lot_id = $2",
      [newQuantity, lot_id]
    );

    await client.query("COMMIT");
    console.log(`Jean avec EPC ${epc} supprimé avec succès pour le lot ${lot_id}. Nouvelle quantité: ${newQuantity}`);
    res.status(200).json({ message: `Jean avec EPC ${epc} supprimé`, newQuantity });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur dans /api/jeans (DELETE):", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la suppression du jean", details: err.message });
  } finally {
    client.release();
  }
});




// Endpoint pour supprimer un lot (DELETE /api/lots/:lot_id)
app.delete("/api/lots/:lot_id", authenticateToken, async (req, res) => {
  const { lot_id } = req.params;
  console.log("Requete pour supprimer le lot:", lot_id);

  try {
    // Verifier si le lot existe
    const lotResult = await pool.query(
      "SELECT * FROM rfid_system.lots WHERE lot_id = $1",
      [lot_id]
    );
    if (lotResult.rows.length === 0) {
      return res.status(404).json({ error: `Lot ${lot_id} non trouve` });
    }

    // Supprimer le lot (les jeans associes seront automatiquement supprimes grace a ON DELETE CASCADE)
    await pool.query(
      "DELETE FROM rfid_system.lots WHERE lot_id = $1",
      [lot_id]
    );

    console.log(`Lot ${lot_id} supprime avec succes`);
    res.status(200).json({ message: `Lot ${lot_id} supprime avec succes` });
  } catch (err) {
    console.error("Erreur dans /api/lots/:lot_id (DELETE):", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la suppression du lot", details: err.message });
  }
});

// Endpoint pour mettre à jour un lot (PUT /api/lots/:lot_id)
// Endpoint pour mettre à jour un lot (PUT /api/lots/:lot_id)
// Endpoint pour mettre à jour un lot (PUT /api/lots/:lot_id)
app.put("/api/lots/:lot_id", authenticateToken, async (req, res) => {
  const { lot_id } = req.params;
  const { statut, localisation, ouvrier_nom, temps_debut_travail, temps_fin } = req.body;

  console.log("Requete recue pour /api/lots/:lot_id avec statut:", statut);

  let client;
  try {
    client = await pool.connect();
    console.log("Connexion au client PostgreSQL reussie");

    await client.query("SET search_path TO rfid_system");
    console.log("Search path defini sur rfid_system");

    // Forcer le fuseau horaire à UTC pour cette session
    await client.query("SET TIME ZONE 'UTC';");
    console.log("Fuseau horaire defini sur UTC");

    await client.query("BEGIN");
    console.log("Transaction BEGIN initiee");

    // Recuperer les informations du lot, y compris operateur_nom, epc, quantite_initiale et jeans_defectueux
    const lotCheck = await client.query(
      "SELECT lot_id, chaine_id, epc, quantite_initiale, jeans_defectueux, couleur, taille, statut, temps_debut_travail, temps_fin, operateur_nom, temps_debut FROM rfid_system.lots WHERE lot_id = $1",
      [lot_id]
    );
    if (lotCheck.rows.length === 0) {
      console.log(`Erreur: Lot ${lot_id} non trouve`);
      return res.status(404).json({ error: `Lot ${lot_id} non trouve` });
    }

    const lot = lotCheck.rows[0];
    const chaine_id = lot.chaine_id;
    const epc = lot.epc;
    const quantite_initiale = lot.quantite_initiale || 0;
    const jeans_defectueux = lot.jeans_defectueux || 0;
    const quantite_finale = quantite_initiale - jeans_defectueux; // Calcul de la quantite finale
    const original_operateur_nom = lot.operateur_nom || "Operateur inconnu";

    console.log("Operateur initial du lot:", original_operateur_nom);

    // Si ouvrier_nom est fourni, recuperer la localisation de l'ouvrier
    let finalLocalisation = localisation || lot.localisation || "Non defini";
    if (ouvrier_nom && ouvrier_nom !== "Ouvrier inconnu") {
      const ouvrierResult = await client.query(
        `SELECT localisation 
         FROM rfid_system.ouvriers 
         WHERE TRIM(LOWER(nom || ' ' || prenom)) = TRIM(LOWER($1))`,
        [ouvrier_nom]
      );
      if (ouvrierResult.rows.length > 0 && ouvrierResult.rows[0].localisation) {
        finalLocalisation = ouvrierResult.rows[0].localisation;
        console.log(`Localisation de l'ouvrier ${ouvrier_nom} recuperee : ${finalLocalisation}`);
      } else {
        console.log(`Aucune localisation trouvee pour l'ouvrier ${ouvrier_nom}`);
      }
    }

    // Mettre à jour le lot avec quantite_finale
    console.log("Mise a jour du lot:", lot_id);
    await client.query(
      "UPDATE rfid_system.lots SET statut = $1, localisation = $2, ouvrier_nom = $3, temps_debut_travail = $4, temps_fin = $5, quantite_finale = $6 WHERE lot_id = $7",
      [statut, finalLocalisation, ouvrier_nom, temps_debut_travail, temps_fin, quantite_finale, lot_id]
    );
    console.log("Mise a jour du lot reussie");

    // Synchroniser le statut, la localisation et l'ouvrier_nom des jeans associes
    console.log("Synchronisation des jeans pour lot_id:", lot_id);
    const updateJeansResult = await client.query(
      "UPDATE rfid_system.jeans SET statut = $1, localisation = $2, ouvrier_nom = $3 WHERE lot_id = $4",
      [statut, finalLocalisation, ouvrier_nom || null, lot_id]
    );
    console.log(`Jeans mis a jour, lignes affectees: ${updateJeansResult.rowCount}`);

    // Enregistrer dans lot_history si statut est "termine"
    if (statut === "termine") {
      console.log("Enregistrement dans lot_history pour statut 'termine' avec lot_id:", lot_id);
      const existingHistory = await client.query(
        "SELECT history_id FROM rfid_system.lot_history WHERE lot_id = $1",
        [lot_id]
      );
      if (existingHistory.rows.length === 0) {
        // Convertir temps_debut_travail et temps_fin en UTC avant insertion
        const tempsDebutTravailUTC = temps_debut_travail ? new Date(temps_debut_travail).toISOString() : null;
        const tempsFinUTC = temps_fin ? new Date(temps_fin).toISOString() : null;
        const tempsDebutUTC = lot.temps_debut ? new Date(lot.temps_debut).toISOString() : null;

        console.log("Valeurs avant insertion dans lot_history:", {
          temps_debut_travail: tempsDebutTravailUTC,
          temps_fin: tempsFinUTC,
          temps_debut: tempsDebutUTC
        });

        await client.query(
          `INSERT INTO rfid_system.lot_history 
           (lot_id, epc, chaine_id, couleur, taille, ouvrier_nom, temps_debut_travail, temps_fin, statut, machine, quantite_initiale, jeans_defectueux, quantite_finale, recorded_at, operateur_nom, temps_debut)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, $14, $15)`,
          [
            lot_id,
            epc || 'N/A',
            chaine_id || 'N/A',
            lot.couleur || 'N/A',
            lot.taille || 'N/A',
            ouvrier_nom || 'N/A',
            tempsDebutTravailUTC,
            tempsFinUTC,
            statut,
            finalLocalisation,
            quantite_initiale,
            jeans_defectueux,
            quantite_finale,
            original_operateur_nom,
            tempsDebutUTC
          ]
        );
        console.log("Insertion dans lot_history reussie");
      } else {
        console.log("Entree existante dans lot_history pour lot_id:", lot_id, " - mise a jour ignoree");
      }
    }

    await client.query("COMMIT");
    console.log("Transaction COMMIT reussie");

    // Retourner les données mises à jour, y compris quantite_finale
    const updatedLot = await client.query(
      "SELECT lot_id, chaine_id, epc, quantite_initiale, jeans_defectueux, quantite_finale, couleur, taille, statut, temps_debut_travail, temps_fin, localisation, ouvrier_nom, operateur_nom, temps_debut FROM rfid_system.lots WHERE lot_id = $1",
      [lot_id]
    );
    res.json({ message: `Statut du lot ${lot_id} mis a jour avec succes`, lot: updatedLot.rows[0] });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
      console.log("Transaction ROLLBACK effectuee");
    }
    console.error("Erreur dans /api/lots/:lot_id:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
    });
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    if (client) {
      client.release();
      console.log("Client PostgreSQL libere");
    }
  }
});
///////
app.post("/api/lots/stockage",  async (req, res) => {
  const { epc } = req.body;

  console.log("Requete recue pour /api/lots/stockage - Corps complet:", req.body);

  if (!epc || typeof epc !== "string" || epc.trim() === "") {
    console.log("Erreur: EPC manquant, invalide ou vide dans le corps de la requete:", req.body);
    return res.status(400).json({ error: "EPC requis et doit etre une chaine non vide" });
  }

  const cleanedEpc = epc.trim();

  let client;
  try {
    console.log("Etape 1: Connexion au client PostgreSQL...");
    client = await pool.connect();
    console.log("Connexion au client PostgreSQL reussie");

    console.log("Etape 2: Definition du search_path...");
    await client.query("SET search_path TO rfid_system");
    console.log("Search path defini sur rfid_system");

    console.log("Etape 3: Debut de la transaction...");
    await client.query("BEGIN");
    console.log("Transaction BEGIN initiee");

    console.log("Etape 4: Recuperation du lot avec EPC:", cleanedEpc);
    const lotCheck = await client.query(
      `SELECT lot_id, chaine_id, epc, quantite_initiale, jeans_defectueux, statut, 
              temps_debut, temps_debut_travail, temps_fin, localisation, ouvrier_nom, operateur_nom 
       FROM rfid_system.lots 
       WHERE epc = $1 AND statut != 'stocke'`,
      [cleanedEpc]
    );
    console.log("Resultat de la requete lotCheck:", lotCheck.rows);

    if (lotCheck.rows.length === 0) {
      console.log(`Erreur: Lot avec EPC ${cleanedEpc} non trouve ou deja stocke`);
      return res.status(404).json({ error: `Lot avec EPC ${cleanedEpc} non trouve ou deja stocke` });
    }

    const lot = lotCheck.rows[0];
    const lot_id = lot.lot_id;
    const chaine_id = lot.chaine_id;
    const epc_value = lot.epc;
    const temps_debut = lot.temps_debut;
    const temps_debut_travail = lot.temps_debut_travail;
    const temps_fin = lot.temps_fin;
    const lotLocalisation = lot.localisation || "Non defini";
    const ouvrier_nom = lot.ouvrier_nom || "Ouvrier inconnu";
    const lot_operateur_nom = lot.operateur_nom || "Operateur inconnu";
    const quantite_initiale = lot.quantite_initiale || 0;
    const jeans_defectueux = lot.jeans_defectueux || 0;
    const quantite_finale = lot.quantite_finale || (quantite_initiale - jeans_defectueux); // Utiliser la valeur existante ou recalculer

    console.log("Etape 5: Lot recupere:", { 
      lot_id, chaine_id, epc: epc_value, statut: lot.statut, temps_debut, temps_debut_travail, temps_fin, localisation: lotLocalisation, ouvrier_nom, operateur_nom: lot_operateur_nom 
    });

    if (!lot_id || !chaine_id || lot.quantite_initiale === null || lot.jeans_defectueux === null) {
      console.log(`Erreur: Donnees du lot incompletes pour EPC ${cleanedEpc}`, lot);
      return res.status(400).json({ error: "Donnees du lot incompletes" });
    }

    if (lot.statut !== "termine") {
      console.log(`Erreur: Le lot ${lot_id} n'est pas en statut 'termine', statut actuel: ${lot.statut}`);
      return res.status(400).json({ error: `Le lot ${lot_id} doit etre en statut 'termine' pour etre stocke` });
    }

    console.log("Etape 6: Donnees calculees:", { quantite_initiale, jeans_defectueux, quantite_finale });

    console.log("Etape 7: Nom de l'operateur initial du lot:", lot_operateur_nom);

    console.log("Etape 8: Verification de l'existence dans lot_history pour lot_id:", lot_id);
    const existingHistory = await client.query(
      "SELECT history_id FROM rfid_system.lot_history WHERE lot_id = $1",
      [lot_id]
    );

    if (existingHistory.rows.length > 0) {
      console.log("Etape 9: Mise a jour de lot_history pour lot_id:", lot_id);
      const updateHistoryResult = await client.query(
        `UPDATE rfid_system.lot_history
         SET statut = 'stocke',
             date_stockage = CURRENT_TIMESTAMP,
             temps_debut = $2,
             temps_debut_travail = $3,
             temps_fin = $4,
             operateur_nom = $5,
             machine = $6,
             epc = $7,
             chaine_id = $8,
             quantite_finale = $9
         WHERE lot_id = $1
         RETURNING *`,
        [lot_id, temps_debut, temps_debut_travail, temps_fin, lot_operateur_nom, lotLocalisation, epc_value, chaine_id, quantite_finale]
      );
      console.log("Mise a jour de lot_history reussie:", updateHistoryResult.rows);
    } else {
      console.log("Etape 9: Insertion dans lot_history pour lot_id:", lot_id);
      await client.query(
        `INSERT INTO rfid_system.lot_history 
         (lot_id, epc, chaine_id, statut, date_stockage, temps_debut, temps_debut_travail, temps_fin, operateur_nom, machine, quantite_initiale, jeans_defectueux, quantite_finale, recorded_at, ouvrier_nom)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, $13)`,
        [lot_id, epc_value, chaine_id, 'stocke', temps_debut, temps_debut_travail, temps_fin, lot_operateur_nom, lotLocalisation, quantite_initiale, jeans_defectueux, quantite_finale, ouvrier_nom]
      );
      console.log("Insertion dans lot_history reussie");
    }

    // Sauvegarde des jeans dans jeans_history avec ajustement de statut_qualite
    console.log("Etape 10: Recuperation des jeans pour lot_id:", lot_id);
    const jeansToSave = await client.query(
      `SELECT jean_id, epc, lot_id, statut_qualite, localisation, ouvrier_id, ouvrier_nom, chaine_id 
       FROM rfid_system.jeans 
       WHERE lot_id = $1`,
      [lot_id]
    );
    console.log("Jeans recuperes pour sauvegarde:", jeansToSave.rows);

    if (jeansToSave.rows.length > 0) {
      console.log("Etape 11: Insertion des jeans dans jeans_history pour lot_id:", lot_id);
      const insertJeansHistoryPromises = jeansToSave.rows.map(async (jean) => {
        const adjustedStatutQualite = jean.statut_qualite && jean.statut_qualite.toLowerCase() === "defectueux" ? "defectueux" : "ok";
        console.log(`Jean ${jean.jean_id} - Statut_qualite ajuste: ${jean.statut_qualite} -> ${adjustedStatutQualite}`);

        const existingJeanHistory = await client.query(
          `SELECT history_id FROM rfid_system.jeans_history 
           WHERE jean_id = $1 AND lot_id = $2`,
          [jean.jean_id, jean.lot_id]
        );
        if (existingJeanHistory.rows.length === 0) {
          await client.query(
            `INSERT INTO rfid_system.jeans_history 
             (jean_id, epc, lot_id, statut_qualite, localisation, ouvrier_id, ouvrier_nom, chaine_id, date_stockage)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
            [
              jean.jean_id,
              jean.epc,
              jean.lot_id,
              adjustedStatutQualite,
              jean.localisation,
              jean.ouvrier_id,
              jean.ouvrier_nom,
              jean.chaine_id
            ]
          );
          console.log(`Insertion reussie pour jean_id: ${jean.jean_id} avec statut_qualite: ${adjustedStatutQualite}`);
        } else {
          console.log(`Jean_id ${jean.jean_id} deja enregistre pour lot_id ${jean.lot_id}, insertion ignoree`);
        }
      });
      await Promise.all(insertJeansHistoryPromises);
      console.log("Insertion dans jeans_history terminee");
    }

    // Suppression des jeans
    console.log("Etape 12: Suppression des jeans pour lot_id:", lot_id);
    const deleteJeansResult = await client.query(
      `DELETE FROM rfid_system.jeans WHERE lot_id = $1`,
      [lot_id]
    );
    console.log(`Jeans supprimes, lignes affectees: ${deleteJeansResult.rowCount}`);

    // Suppression du lot (mais conserver les données critiques avant)
    console.log("Etape 13: Suppression du lot pour lot_id:", lot_id, "et chaine_id:", chaine_id);
    const deleteLotResult = await client.query(
      `DELETE FROM rfid_system.lots WHERE lot_id = $1 AND chaine_id = $2`,
      [lot_id, chaine_id]
    );
    console.log(`Lot supprime, lignes affectees: ${deleteLotResult.rowCount}`);

    if (deleteLotResult.rowCount === 0) {
      console.log(`Lot ${lot_id} non trouve pour suppression`);
      throw new Error("Lot non trouve pour suppression");
    }

    console.log("Etape 14: Validation de la transaction...");
    await client.query("COMMIT");
    console.log("Transaction COMMIT reussie");

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({ message: `Lot ${lot_id} stocke avec succes` });
  } catch (err) {
    if (client) {
      console.log("Etape 15: Annulation de la transaction...");
      await client.query("ROLLBACK");
      console.log("Transaction ROLLBACK effectuee");
    }
    console.error("Erreur detaillee dans /api/lots/stockage:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
    });
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  } finally {
    if (client) {
      console.log("Etape 16: Liberation du client PostgreSQL...");
      client.release();
      console.log("Client PostgreSQL libere");
    }
  }
});

// Endpoint pour récupérer les ouvriers d'une chaîne (GET /api/ouvriers)
app.get("/api/ouvriers", authenticateToken, async (req, res) => {
  const { chaine_id } = req.query;
  console.log("Requete pour les ouvriers, chaine_id:", chaine_id);

  if (!chaine_id) {
    return res.status(400).json({ error: "ID de la chaine requis" });
  }

  try {
    await pool.query("SET search_path TO rfid_system");
    const chainCheck = await pool.query(
      "SELECT chaine_id FROM rfid_system.chaines WHERE chaine_id = $1",
      [chaine_id]
    );
    if (chainCheck.rows.length === 0) {
      console.log("Chaine non trouvee pour chaine_id:", chaine_id);
      return res.status(404).json({ error: "Chaine non trouvee" });
    }

    const result = await pool.query(
      `SELECT o.ouvrier_id, o.nom, o.prenom, o.localisation
       FROM rfid_system.ouvriers o
       LEFT JOIN rfid_system.lots l ON TRIM(LOWER(o.nom || ' ' || o.prenom)) = TRIM(LOWER(l.ouvrier_nom))
           AND l.statut = 'en cours'
       WHERE o.chaine_id = $1
           AND o.is_active = true
           AND l.lot_id IS NULL
       ORDER BY o.nom, o.prenom`,
      [chaine_id]
    );
    console.log("Ouvriers disponibles recuperes:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur dans /api/ouvriers - Details complets:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
    });
    res.status(500).json({ error: "Erreur serveur lors de la recuperation des ouvriers", details: err.message });
  }
});

// Endpoint pour récupérer les machines d'une chaîne (GET /api/machines)
app.get("/api/machines", authenticateToken, async (req, res) => {
  const { chaine_id } = req.query;
  console.log("Requete pour les machines, chaine_id:", chaine_id);

  if (!chaine_id) {
    return res.status(400).json({ error: "ID de la chaine requis" });
  }

  try {
    await pool.query("SET search_path TO rfid_system");
    const chainCheck = await pool.query(
      "SELECT chaine_id FROM rfid_system.chaines WHERE chaine_id = $1",
      [chaine_id]
    );
    if (chainCheck.rows.length === 0) {
      console.log("Chaine non trouvee pour chaine_id:", chaine_id);
      return res.status(404).json({ error: "Chaine non trouvee" });
    }

    const result = await pool.query(
      "SELECT machine_id, nom_machine, est_disponible, ouvrier_id FROM rfid_system.machines WHERE chaine_id = $1 ORDER BY nom_machine",
      [chaine_id]
    );
    console.log("Machines recuperees:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur dans /api/machines - Details complets:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
    });
    res.status(500).json({ error: "Erreur serveur lors de la recuperation des machines", details: err.message });
  }
});

// Endpoint pour récupérer les chaînes (GET /api/chaines)
app.get("/api/chaines", authenticateToken, async (req, res) => {
  console.log("Requete pour les chaines");

  try {
    let query;
    if (req.user.role === "directeur") {
      query = "SELECT chaine_id, nom_chaine FROM rfid_system.chaines ORDER BY nom_chaine";
    } else {
      query = "SELECT chaine_id, nom_chaine FROM rfid_system.chaines WHERE chaine_id = $1 ORDER BY nom_chaine";
    }

    const result = await pool.query(query, req.user.role === "directeur" ? [] : [req.user.chaine_id]);
    console.log("Chaines recuperees:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur dans /api/chaines:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la recuperation des chaines", details: err.message });
  }
});

// Endpoint pour récupérer une chaîne spécifique (GET /api/chaines/:id)
app.get("/api/chaines/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  console.log("Requete pour une chaine specifique, id:", id);

  if (!id) {
    return res.status(400).json({ error: "ID de la chaine requis" });
  }

  try {
    const result = await pool.query(
      "SELECT chaine_id, nom_chaine FROM rfid_system.chaines WHERE chaine_id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      console.log("Chaine non trouvee pour id:", id);
      return res.status(404).json({ error: "Chaine non trouvee" });
    }

    console.log("Chaine recuperee:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur dans /api/chaines/:id:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la recuperation de la chaine", details: err.message });
  }
});

//////////////////////////////////////////////////////

// Endpoint pour récupérer tous les utilisateurs (GET /api/utilisateurs) - Gestion des Utilisateurs
app.get("/api/utilisateurs", authenticateToken, async (req, res) => {
  console.log("Requete pour tous les utilisateurs");
  try {
    await pool.query("SET search_path TO rfid_system");
    const result = await pool.query(
      "SELECT utilisateur_id, nom, prenom, chaine_id FROM rfid_system.utilisateurs WHERE is_active = true ORDER BY nom, prenom"
    );
    console.log("Utilisateurs recuperes:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur dans /api/utilisateurs:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la recuperation des utilisateurs", details: err.message });
  }
});

// Endpoint pour la gestion des utilisateurs (ouvriers et autres utilisateurs) - GET /api/gestion-utilisateurs - Gestion des Utilisateurs
app.get("/api/gestion-utilisateurs", authenticateToken, async (req, res) => {
  console.log("Requete pour la gestion des utilisateurs");
  try {
    await pool.query("SET search_path TO rfid_system");

    // Recuperer les ouvriers
    const ouvriersResult = await pool.query(
      "SELECT ouvrier_id AS id, nom, prenom, telephone, chaine_id, localisation, NULL AS email, 'OUVRIER' AS type FROM rfid_system.ouvriers WHERE is_active = true ORDER BY nom, prenom"
    );
    console.log("Ouvriers recuperes:", ouvriersResult.rows);

    // Recuperer les utilisateurs (operateurs et responsables uniquement, exclure direction)
    const utilisateursResult = await pool.query(
      "SELECT u.utilisateur_id AS id, u.nom, u.prenom, u.telephone, u.chaine_id, NULL AS localisation, u.email, " +
      "CASE WHEN u.role_id = 1 THEN 'OPERATEUR' WHEN u.role_id = 2 THEN 'RESPONSABLE' END AS type " +
      "FROM rfid_system.utilisateurs u " +
      "WHERE u.is_active = true AND u.role_id IN (1, 2) " +
      "ORDER BY u.nom, u.prenom"
    );
    console.log("Utilisateurs recuperes:", utilisateursResult.rows);

    // Recuperer les chaines
    const chainesResult = await pool.query(
      "SELECT chaine_id, nom_chaine FROM rfid_system.chaines ORDER BY nom_chaine"
    );
    const chaines = chainesResult.rows;
    console.log("Chaines recuperees:", chaines);

    // Recuperer les machines
    const machinesResult = await pool.query(
      "SELECT machine_id, nom_machine, chaine_id, ouvrier_id, est_disponible FROM rfid_system.machines ORDER BY nom_machine"
    );
    const machines = machinesResult.rows;
    console.log("Machines recuperees:", machines);

    // Combiner les resultats (utilisateurs et ouvriers)
    const combinedUsers = [
      ...ouvriersResult.rows,
      ...utilisateursResult.rows,
    ].sort((a, b) => a.nom.localeCompare(b.nom) || a.prenom.localeCompare(b.prenom));

    console.log("Utilisateurs combines:", combinedUsers);

    // Retourner les utilisateurs combines, les chaines et les machines
    res.json({
      users: combinedUsers,
      chaines,
      machines,
    });
  } catch (err) {
    console.error("Erreur dans /api/gestion-utilisateurs:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la recuperation des utilisateurs", details: err.message });
  }
});
// Endpoint pour ajouter un utilisateur - POST /api/add-user - Gestion des Utilisateurs
// Endpoint pour ajouter un utilisateur - POST /api/add-user (modifié pour utilisateur_id)
app.post("/api/add-user", authenticateToken, async (req, res) => {
  console.log("Requête pour ajouter un utilisateur:", req.body);
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO rfid_system");
    await client.query("BEGIN");

    const {
      nom,
      prenom,
      telephone,
      email,
      password,
      role_id,
      chaine_id,
      localisation,
      is_active,
    } = req.body;

    if (!nom || !prenom || !telephone || !role_id || !chaine_id || (role_id === '4' && !localisation)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Tous les champs requis doivent être remplis" });
    }

    const telephoneCheckOuvriers = await client.query(
      `SELECT ouvrier_id FROM rfid_system.ouvriers WHERE telephone = $1`,
      [telephone]
    );
    const telephoneCheckUtilisateurs = await client.query(
      `SELECT utilisateur_id FROM rfid_system.utilisateurs WHERE telephone = $1`,
      [telephone]
    );

    if (telephoneCheckOuvriers.rowCount > 0 || telephoneCheckUtilisateurs.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Un utilisateur ou ouvrier avec ce numéro de téléphone existe déjà" });
    }

    let query, values, newId;

    if (role_id === '1' || role_id === '2') {
      // Génération d'un utilisateur_id au format USERXXX
      let newUtilisateurId;
      try {
        const lastUtilisateur = await client.query(
          `SELECT utilisateur_id FROM rfid_system.utilisateurs WHERE utilisateur_id ~ '^USER[0-9]{3}$' ORDER BY CAST(SUBSTRING(utilisateur_id FROM 5) AS INTEGER) DESC LIMIT 1`
        );
        let nextIdNumber = lastUtilisateur.rowCount === 0 ? 1 : parseInt(lastUtilisateur.rows[0].utilisateur_id.substring(4), 10) + 1;
        let idExists = true;
        let attempt = 0;
        const maxAttempts = 1000;
        while (idExists && attempt < maxAttempts) {
          newUtilisateurId = `USER${String(nextIdNumber + attempt).padStart(3, '0')}`;
          const checkExist = await client.query(
            `SELECT utilisateur_id FROM rfid_system.utilisateurs WHERE utilisateur_id = $1`,
            [newUtilisateurId]
          );
          idExists = checkExist.rowCount > 0;
          attempt++;
        }
        if (attempt >= maxAttempts) {
          await client.query("ROLLBACK");
          return res.status(500).json({ error: "Impossible de générer un ID unique après plusieurs tentatives" });
        }
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("Erreur lors de la génération de l'utilisateur_id:", error);
        return res.status(500).json({ error: "Erreur lors de la génération de l'ID utilisateur", details: error.message });
      }

      // Ajout d'un utilisateur (opérateur ou responsable)
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `
        INSERT INTO rfid_system.utilisateurs (utilisateur_id, nom, prenom, date_inscription, role_id, email, telephone, is_active, chaine_id, password)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)
        RETURNING utilisateur_id
      `;
      values = [newUtilisateurId, nom, prenom, role_id, email || null, telephone, is_active, chaine_id || null, hashedPassword];
    } else if (role_id === '4') {
      let newOuvrierId;
      try {
        const lastOuvrier = await client.query(
          `SELECT ouvrier_id FROM rfid_system.ouvriers WHERE ouvrier_id ~ '^OUV[0-9]{3}$' ORDER BY CAST(SUBSTRING(ouvrier_id FROM 4) AS INTEGER) DESC LIMIT 1`
        );
        let nextIdNumber = lastOuvrier.rowCount === 0 ? 1 : parseInt(lastOuvrier.rows[0].ouvrier_id.substring(3), 10) + 1;
        let idExists = true;
        let attempt = 0;
        const maxAttempts = 1000;
        while (idExists && attempt < maxAttempts) {
          newOuvrierId = `OUV${String(nextIdNumber + attempt).padStart(3, '0')}`;
          const checkExist = await client.query(
            `SELECT ouvrier_id FROM rfid_system.ouvriers WHERE ouvrier_id = $1`,
            [newOuvrierId]
          );
          idExists = checkExist.rowCount > 0;
          attempt++;
        }
        if (attempt >= maxAttempts) {
          await client.query("ROLLBACK");
          return res.status(500).json({ error: "Impossible de générer un ID unique après plusieurs tentatives" });
        }
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("Erreur lors de la génération de l'ouvrier_id:", error);
        return res.status(500).json({ error: "Erreur lors de la génération de l'ID ouvrier", details: error.message });
      }

      query = `
        INSERT INTO rfid_system.ouvriers (ouvrier_id, nom, prenom, telephone, chaine_id, is_active, localisation)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ouvrier_id
      `;
      values = [newOuvrierId, nom, prenom, telephone, chaine_id || null, is_active, localisation || null];
    } else {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    const result = await client.query(query, values);
    newId = role_id === '4' ? result.rows[0].ouvrier_id : result.rows[0].utilisateur_id;
    console.log("Nouvel ID généré:", newId);

    if (role_id === '4' && localisation) {
      const machineCheck = await client.query(
        `SELECT machine_id FROM rfid_system.machines WHERE LOWER(TRIM(nom_machine)) = LOWER(TRIM($1)) AND est_disponible = true AND ouvrier_id IS NULL`,
        [localisation]
      );
      if (machineCheck.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "La machine sélectionnée n'est pas disponible ou n'existe pas" });
      }

      const updateResult = await client.query(
        `UPDATE rfid_system.machines SET ouvrier_id = $1, est_disponible = false WHERE LOWER(TRIM(nom_machine)) = LOWER(TRIM($2))`,
        [newId, localisation]
      );
      if (updateResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(500).json({ error: "Échec de la mise à jour de la machine" });
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ message: 'Utilisateur ajouté avec succès', id: newId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur détaillée lors de l'ajout de l'utilisateur:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });
    res.status(500).json({ error: "Erreur serveur lors de l'ajout de l'utilisateur", details: error.message });
  } finally {
    client.release();
  }
});
// Endpoint pour supprimer un utilisateur
// Endpoint pour supprimer un utilisateur
app.delete("/api/delete-user/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  console.log("Requête pour supprimer un utilisateur, id:", id);

  if (!id) {
    return res.status(400).json({ error: "ID de l'utilisateur requis" });
  }

  const client = await pool.connect();
  try {
    await client.query("SET search_path TO rfid_system");
    await client.query("BEGIN"); // Start transaction

    // Check if the user is an ouvrier
    const ouvrierCheck = await client.query(
      "SELECT ouvrier_id, localisation FROM rfid_system.ouvriers WHERE ouvrier_id = $1",
      [id]
    );

    if (ouvrierCheck.rowCount > 0) {
      const { localisation } = ouvrierCheck.rows[0];

      // Delete the ouvrier
      await client.query(
        "DELETE FROM rfid_system.ouvriers WHERE ouvrier_id = $1",
        [id]
      );

      // If the ouvrier had a localisation, update the machine to available
      if (localisation) {
        const updateResult = await client.query(
          "UPDATE rfid_system.machines SET ouvrier_id = NULL, est_disponible = true WHERE nom_machine = $1",
          [localisation]
        );

        if (updateResult.rowCount === 0) {
          console.warn("Aucune machine mise à jour pour localisation:", localisation);
        }
      }

      await client.query("COMMIT"); // Commit transaction
      return res.json({ message: "Ouvrier supprimé avec succès" });
    }

    // Check if the user is an utilisateur (opérateur or responsable)
    const utilisateurCheck = await client.query(
      "SELECT utilisateur_id FROM rfid_system.utilisateurs WHERE utilisateur_id = $1 AND role_id IN (1, 2)",
      [id]
    );

    if (utilisateurCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    // Delete the utilisateur
    await client.query(
      "DELETE FROM rfid_system.utilisateurs WHERE utilisateur_id = $1",
      [id]
    );

    await client.query("COMMIT"); // Commit transaction
    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (err) {
    await client.query("ROLLBACK"); // Rollback on error
    console.error("Erreur lors de la suppression de l'utilisateur:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la suppression de l'utilisateur", details: err.message });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

//update user
// Endpoint pour mettre à jour un utilisateur (ouvrier ou utilisateur) - PUT /api/update-user/:id
// Endpoint pour mettre à jour un utilisateur (ouvrier ou utilisateur) - PUT /api/update-user/:id
// Endpoint pour mettre à jour un utilisateur (ouvrier ou utilisateur) - PUT /api/update-user/:id
app.put("/api/update-user/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  console.log("Requête pour mettre à jour un utilisateur, id:", id);
  console.log("Payload reçu:", req.body);

  if (!id) {
    return res.status(400).json({ error: "ID de l'utilisateur requis" });
  }

  const client = await pool.connect();
  try {
    await client.query("SET search_path TO rfid_system");
    await client.query("BEGIN");

    // Vérifier si l'utilisateur est un ouvrier
    const ouvrierCheck = await client.query(
      "SELECT ouvrier_id, telephone, chaine_id, localisation FROM rfid_system.ouvriers WHERE ouvrier_id = $1",
      [id]
    );

    // Vérifier si l'utilisateur est un opérateur ou responsable
    const userCheck = await client.query(
      "SELECT utilisateur_id, telephone, email, role_id, password FROM rfid_system.utilisateurs WHERE utilisateur_id = $1",
      [id]
    );

    if (ouvrierCheck.rowCount === 0 && userCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const { telephone: newTelephone, email: newEmail, password: newPassword, chaine_id: newChaineId, localisation: newLocalisation } = req.body;

    if (ouvrierCheck.rowCount > 0) {
      // Mise à jour d'un ouvrier (logique inchangée)
      const { telephone: currentTelephone, chaine_id: currentChaineId, localisation: currentLocalisation } = ouvrierCheck.rows[0];
      let updateFields = [];
      let updateValues = [];
      let paramIndex = 1;

      if (newTelephone && newTelephone !== currentTelephone) {
        const telephoneCheck = await client.query(
          "SELECT ouvrier_id FROM rfid_system.ouvriers WHERE telephone = $1 AND ouvrier_id != $2",
          [newTelephone, id]
        );
        if (telephoneCheck.rowCount > 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Un autre ouvrier avec ce numéro de téléphone existe déjà" });
        }
        updateFields.push(`telephone = $${paramIndex++}`);
        updateValues.push(newTelephone);
      }

      let finalChaineId = currentChaineId;
      let finalLocalisation = currentLocalisation;
      let localisationChanged = false;

      if (newChaineId && newChaineId !== currentChaineId) {
        if (!newLocalisation) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "La localisation est requise si la chaîne est modifiée" });
        }
        finalChaineId = newChaineId;
        finalLocalisation = newLocalisation;
        localisationChanged = true;
        updateFields.push(`chaine_id = $${paramIndex++}`);
        updateValues.push(newChaineId);
        updateFields.push(`localisation = $${paramIndex++}`);
        updateValues.push(newLocalisation);
      } else if (newLocalisation && newLocalisation !== currentLocalisation) {
        finalChaineId = newChaineId || currentChaineId;
        finalLocalisation = newLocalisation;
        localisationChanged = true;
        updateFields.push(`localisation = $${paramIndex++}`);
        updateValues.push(newLocalisation);
      }

      if (updateFields.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Aucune modification détectée" });
      }

      updateValues.push(id);
      const updateQuery = `
        UPDATE rfid_system.ouvriers
        SET ${updateFields.join(", ")}
        WHERE ouvrier_id = $${paramIndex}
        RETURNING ouvrier_id
      `;
      const updateResult = await client.query(updateQuery, updateValues);

      if (updateResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(500).json({ error: "Échec de la mise à jour de l'ouvrier" });
      }

      if (localisationChanged) {
        if (currentLocalisation) {
          await client.query(
            "UPDATE rfid_system.machines SET ouvrier_id = NULL, est_disponible = true WHERE nom_machine = $1",
            [currentLocalisation]
          );
        }
        if (finalLocalisation) {
          const machineUpdateResult = await client.query(
            "UPDATE rfid_system.machines SET ouvrier_id = $1, est_disponible = false WHERE nom_machine = $2 AND chaine_id = $3",
            [id, finalLocalisation, finalChaineId]
          );
          if (machineUpdateResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Machine non disponible ou incompatible avec la chaîne" });
          }
        }
      }

      await client.query("COMMIT");
      return res.json({ message: "Ouvrier modifié avec succès", id });
    } else {
      // Mise à jour d'un opérateur ou responsable
      const { telephone: currentTelephone, email: currentEmail, role_id: currentRoleId, password: currentPassword } = userCheck.rows[0];
      let updateFields = [];
      let updateValues = [];
      let paramIndex = 1;

      if (newTelephone && newTelephone !== currentTelephone) {
        const telephoneCheck = await client.query(
          "SELECT utilisateur_id FROM rfid_system.utilisateurs WHERE telephone = $1 AND utilisateur_id != $2",
          [newTelephone, id]
        );
        if (telephoneCheck.rowCount > 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Un autre utilisateur avec ce numéro de téléphone existe déjà" });
        }
        updateFields.push(`telephone = $${paramIndex++}`);
        updateValues.push(newTelephone);
      }

      if (newEmail && newEmail !== currentEmail) {
        if (!/\S+@\S+\.\S+/.test(newEmail)) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "L'email n'est pas valide" });
        }
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(newEmail);
      }

      if (newPassword && newPassword !== currentPassword) {
        // Ajouter logique de hachage si nécessaire (par exemple, avec bcrypt)
        // Exemple avec bcrypt (si utilisé dans votre projet) :
        // const bcrypt = require('bcrypt');
        // const hashedPassword = await bcrypt.hash(newPassword, 10);
        // updateFields.push(`password = $${paramIndex++}`);
        // updateValues.push(hashedPassword);
        updateFields.push(`password = $${paramIndex++}`);
        updateValues.push(newPassword); // Remplacez par le mot de passe haché si nécessaire
      }

      if (updateFields.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Aucune modification détectée" });
      }

      updateValues.push(id);
      const updateQuery = `
        UPDATE rfid_system.utilisateurs
        SET ${updateFields.join(", ")}
        WHERE utilisateur_id = $${paramIndex}
        RETURNING utilisateur_id
      `;
      const updateResult = await client.query(updateQuery, updateValues);

      if (updateResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(500).json({ error: "Échec de la mise à jour de l'utilisateur" });
      }

      await client.query("COMMIT");
      return res.json({ message: "Utilisateur modifié avec succès", id });
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erreur détaillée lors de la mise à jour:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      detail: err.detail,
      hint: err.hint,
    });
    res.status(500).json({ error: "Erreur serveur lors de la mise à jour", details: err.message });
  } finally {
    client.release();
  }
});




// Endpoint pour supprimer l'assignation d'un ouvrier (PATCH /api/lots/:lot_id/remove-assignment)
app.patch("/api/lots/:lot_id/remove-assignment", authenticateToken, async (req, res) => {
  const { lot_id } = req.params;

  let client;
  try {
    client = await pool.connect();
    await client.query("SET search_path TO rfid_system");
    await client.query("BEGIN");

    // Vérifier si le lot existe
    const lotCheck = await client.query(
      "SELECT lot_id, chaine_id, ouvrier_nom, statut FROM rfid_system.lots WHERE lot_id = $1",
      [lot_id]
    );
    if (lotCheck.rows.length === 0) {
      return res.status(404).json({ error: `Lot ${lot_id} non trouvé` });
    }

    const lot = lotCheck.rows[0];
    if (!lot.ouvrier_nom) {
      return res.status(400).json({ error: "Aucun ouvrier assigné à ce lot" });
    }

    // Réinitialiser les champs liés à l'assignation
    await client.query(
      "UPDATE rfid_system.lots SET ouvrier_nom = NULL, localisation = NULL, statut = 'en attente', temps_debut_travail = NULL WHERE lot_id = $1",
      [lot_id]
    );

    // Synchroniser les jeans associés
    await client.query(
      "UPDATE rfid_system.jeans SET ouvrier_nom = NULL, localisation = NULL, statut = 'en attente' WHERE lot_id = $1",
      [lot_id]
    );

    await client.query("COMMIT");
    console.log(`Assignation supprimée avec succès pour le lot ${lot_id}`);
    res.json({ message: `Assignation supprimée avec succès pour le lot ${lot_id}` });
  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("Erreur dans /api/lots/:lot_id/remove-assignment:", err.stack);
    res.status(500).json({ error: "Erreur serveur lors de la suppression de l'assignation", details: err.message });
  } finally {
    if (client) client.release();
  }
});
//////////////////////////////////////////////////////
//////////////////////////////////////////////////////


// Endpoint pour créer un nouveau lot (POST /api/lots)
app.post("/api/lots", authenticateToken, async (req, res) => {
  const { epc, taille, couleur, quantite_initiale, chaine_id, localisation } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO rfid_system.lots (epc, taille, couleur, quantite_initiale, chaine_id, localisation, temps_debut)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [epc, taille, couleur, quantite_initiale, chaine_id, localisation || `Chaine ${chaine_id} Machine X`]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur dans /api/lots:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// Endpoint pour récupérer les jeans (GET /api/jeans)
app.get("/api/jeans", authenticateToken, async (req, res) => {
  const { chaine_id } = req.query;
  try {
    console.log(`Recuperation des jeans pour chaine_id: ${chaine_id}`);
    const result = await pool.query(
      `SELECT 
        j.jean_id,
        j.epc,
        j.lot_id,
        j.statut_qualite,
        j.localisation,
        j.ouvrier_id,
        j.ouvrier_nom,
        j.statut,
        j.chaine_id
       FROM rfid_system.jeans j
       JOIN rfid_system.lots l ON j.lot_id = l.lot_id
       WHERE l.chaine_id = $1`,
      [chaine_id]
    );
    console.log(`Jeans recuperes: ${JSON.stringify(result.rows)}`);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur dans /api/jeans:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// Endpoint pour récupérer un jean par EPC (GET /api/jeans/by-epc)
app.get("/api/jeans/by-epc", authenticateToken, async (req, res) => {
  const { epc } = req.query;
  try {
    console.log(`Recuperation du jean pour EPC: ${epc}`);
    const result = await pool.query(
      `SELECT 
        j.jean_id,
        j.epc,
        j.lot_id,
        j.statut_qualite,
        j.localisation,
        j.ouvrier_id,
        j.ouvrier_nom,
        j.statut
       FROM rfid_system.jeans j
       JOIN rfid_system.lots l ON j.lot_id = l.lot_id
       WHERE j.epc = $1`,
      [epc]
    );
    if (result.rows.length === 0) {
      console.log(`Jean non trouve pour EPC: ${epc}`);
      return res.status(404).json({ error: "Jean non trouve" });
    }
    console.log(`Jean trouve: ${JSON.stringify(result.rows[0])}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erreur dans /api/jeans/by-epc:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

app.post("/api/jeans/:jean_id/quality-control", authenticateToken, async (req, res) => {
  const { jean_id } = req.params;
  const { lot_id, date_controle, resultat, raison_defaut, responsable_id } = req.body;

  try {
    console.log("Donnees recues pour le controle qualite:", req.body);

    // Validation des champs obligatoires
    const missingFields = [];
    if (!jean_id) missingFields.push("jean_id");
    if (!lot_id) missingFields.push("lot_id");
    if (!date_controle) missingFields.push("date_controle");
    if (!resultat) missingFields.push("resultat");
    if (!responsable_id) missingFields.push("responsable_id");
    if (!raison_defaut) missingFields.push("raison_defaut");

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Champs manquants",
        details: `Les champs suivants sont obligatoires : ${missingFields.join(", ")}`,
      });
    }

    // Validation de resultat
    if (resultat.toLowerCase() !== "defectueux") {
      return res.status(400).json({
        error: "Valeur invalide",
        details: "resultat doit etre 'defectueux'",
      });
    }

    const normalizedResultat = "defectueux"; // Sans accents
    console.log("Valeur normalisee pour resultat:", normalizedResultat);

    // Vérifications
    const jeanCheck = await pool.query(
      `SELECT lot_id, statut_qualite FROM rfid_system.jeans WHERE jean_id = $1`,
      [jean_id]
    );
    if (jeanCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Jean non trouve",
        details: `jean_id ${jean_id} n'existe pas`,
      });
    }

    const previousStatutQualite = jeanCheck.rows[0].statut_qualite ? jeanCheck.rows[0].statut_qualite.toLowerCase() : "";
    const lotId = jeanCheck.rows[0].lot_id;
    if (lotId !== lot_id) {
      return res.status(400).json({
        error: "Incoherence",
        details: `Le lot_id ${lot_id} ne correspond pas au jean_id ${jean_id}`,
      });
    }

    const lotCheck = await pool.query(
      `SELECT statut FROM rfid_system.lots WHERE lot_id = $1`,
      [lot_id]
    );
    if (lotCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Lot non trouve",
        details: `lot_id ${lot_id} n'existe pas`,
      });
    }

    const lotStatut = lotCheck.rows[0].statut;
    if (lotStatut !== "en cours" && lotStatut !== "termine") {
      return res.status(400).json({
        error: "Statut invalide",
        details: "Le controle qualite ne peut etre effectue que sur un lot en cours ou termine",
      });
    }

    const responsableCheck = await pool.query(
      `SELECT 1 FROM rfid_system.utilisateurs WHERE utilisateur_id = $1`,
      [responsable_id]
    );
    if (responsableCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Responsable non trouve",
        details: `responsable_id ${responsable_id} n'existe pas`,
      });
    }

    const parsedDate = new Date(date_controle);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        error: "Format de date invalide",
        details: "date_controle doit etre une date valide (ISO 8601)",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("SET search_path TO rfid_system");
      await client.query("BEGIN");

      // Enregistrer dans controle_qualite
      await client.query(
        `INSERT INTO rfid_system.controle_qualite (jean_id, lot_id, date_controle, resultat, raison_defaut, responsable_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [jean_id, lot_id, date_controle, normalizedResultat, raison_defaut, responsable_id]
      );

      // Mettre à jour le statut_qualite du jean
      await client.query(
        `UPDATE rfid_system.jeans 
         SET statut_qualite = 'defectueux' 
         WHERE jean_id = $1`,
        [jean_id]
      );

      // Ajuster jeans_defectueux en fonction du changement de statut
      if (normalizedResultat.toLowerCase() === "defectueux" && previousStatutQualite !== "defectueux") {
        await client.query(
          `UPDATE rfid_system.lots 
           SET jeans_defectueux = jeans_defectueux + 1
           WHERE lot_id = $1`,
          [lotId]
        );
        console.log(`jeans_defectueux incremente pour le lot ${lotId}`);
      }

      // Vérifier si tous les jeans du lot ont été contrôlés ou si le lot est termine
      if (lotStatut === "termine") {
        const jeansCount = await client.query(
          `SELECT COUNT(*) FROM rfid_system.jeans WHERE lot_id = $1`,
          [lot_id]
        );
        const totalJeans = parseInt(jeansCount.rows[0].count);

        const controlledJeans = await client.query(
          `SELECT COUNT(*) FROM rfid_system.jeans 
           WHERE lot_id = $1 AND statut_qualite IN ('defectueux', 'ok')`,
          [lot_id]
        );
        const controlledCount = parseInt(controlledJeans.rows[0].count);

        // Si tous les jeans ont été contrôlés ou si le lot est termine, mettre à jour les jeans non vérifiés
        if (controlledCount === totalJeans || lotStatut === "termine") {
          const updateJeansResult = await client.query(
            `UPDATE rfid_system.jeans 
             SET statut_qualite = CASE 
                                   WHEN LOWER(TRIM(COALESCE(statut_qualite, ''))) = 'defectueux' THEN 'defectueux'
                                   ELSE 'ok'
                                 END,
                 localisation = NULL,
                 ouvrier_nom = NULL
             WHERE lot_id = $1 AND statut = 'termine' RETURNING *`,
            [lot_id]
          );
          console.log(`Jeans mis à jour (statut_qualite à 'ok'), lignes affectées: ${updateJeansResult.rowCount}`);
          if (updateJeansResult.rowCount === 0) {
            console.warn(`Aucune mise à jour effectuée sur les jeans pour le lot ${lot_id}`);
          }

          const afterUpdate = await client.query(
            `SELECT jean_id, statut_qualite FROM rfid_system.jeans WHERE lot_id = $1`,
            [lot_id]
          );
          console.log(`Statuts qualite après mise à jour pour ${lot_id}:`, afterUpdate.rows);
        }
      }

      await client.query("COMMIT");
      res.json({ message: `Jean ${jean_id} marque comme defectueux avec succes` });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Erreur dans /api/jeans/:jean_id/quality-control:", err.stack);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Erreur dans /api/jeans/:jean_id/quality-control:", err.stack);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// Endpoint pour mettre à jour un lot (PUT /api/lots/:lot_id)
app.put("/api/lots/:lot_id", authenticateToken, async (req, res) => {
  const { lot_id } = req.params;
  const { statut, localisation, ouvrier_nom, temps_debut_travail, temps_fin } = req.body;

  try {
    console.log(`Mise à jour du lot ${lot_id} avec statut: ${statut}`);

    const validStatuts = ["en attente", "en cours", "termine"];
    if (!statut || !validStatuts.includes(statut)) {
      return res.status(400).json({
        error: "Valeur invalide",
        details: "statut doit être 'en attente', 'en cours', ou 'termine'",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("SET search_path TO rfid_system");
      await client.query("BEGIN");

      const lotCheck = await client.query(
        "SELECT * FROM rfid_system.lots WHERE lot_id = $1",
        [lot_id]
      );
      if (lotCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Lot non trouvé" });
      }

      const lot = lotCheck.rows[0];
      const quantite_initiale = lot.quantite_initiale || 0;
      const jeans_defectueux = lot.jeans_defectueux || 0;

      let finalLocalisation = localisation || lot.localisation || "Non défini";
      if (ouvrier_nom) {
        const ouvrierResult = await client.query(
          `SELECT localisation 
           FROM rfid_system.ouvriers 
           WHERE TRIM(LOWER(nom || ' ' || prenom)) = TRIM(LOWER($1)) 
           AND is_active = true`,
          [ouvrier_nom]
        );
        if (ouvrierResult.rows.length > 0 && ouvrierResult.rows[0].localisation) {
          finalLocalisation = ouvrierResult.rows[0].localisation;
          console.log(`Localisation mise à jour via ouvrier: ${finalLocalisation}`);
        } else {
          console.warn(`Aucune localisation trouvée pour ouvrier ${ouvrier_nom}, utilisant ${finalLocalisation}`);
        }
      }

      const finalOuvrierNom = ouvrier_nom || lot.ouvrier_nom || null;

      if (statut === "en cours" || statut === "en attente") {
        await client.query(
          `UPDATE rfid_system.jeans 
           SET statut_qualite = 'non verifie',
               statut = $1,
               localisation = $2,
               ouvrier_nom = $3
           WHERE lot_id = $4`,
          [statut, finalLocalisation, finalOuvrierNom, lot_id]
        );
        console.log(`Statut qualite des jeans mis à 'non verifie' pour le lot ${lot_id}`);
      } else if (statut === "termine") {
        // Mise à jour simple du statut des jeans à 'termine', sans toucher statut_qualite
        await client.query(
          `UPDATE rfid_system.jeans 
           SET statut_qualite = 'ok',
               statut = $1,
               localisation = NULL,
               ouvrier_nom = NULL
           WHERE lot_id = $2`,
          [statut, lot_id]
        );
        console.log(`Statut des jeans mis à 'termine' pour le lot ${lot_id}`);
      }

      const defectueuxCount = await client.query(
        `SELECT COUNT(*) 
         FROM rfid_system.jeans 
         WHERE lot_id = $1 AND LOWER(TRIM(COALESCE(statut_qualite, ''))) = 'defectueux'`,
        [lot_id]
      );
      const count = parseInt(defectueuxCount.rows[0].count);
      await client.query(
        `UPDATE rfid_system.lots 
         SET jeans_defectueux = $1,
             quantite_finale = $2 - $1,
             localisation = NULL,
             ouvrier_nom = NULL,
             temps_debut_travail = $3,
             temps_fin = $4
         WHERE lot_id = $5`,
        [count, quantite_initiale, temps_debut_travail, temps_fin, lot_id]
      );
      console.log(`Nombre de jeans defectueux mis à jour: ${count}, quantite_finale: ${quantite_initiale - count}`);

      const updateLotResult = await client.query(
        `UPDATE rfid_system.lots 
         SET statut = $1,
             localisation = $2,
             ouvrier_nom = $3,
             temps_debut_travail = $4,
             temps_fin = $5
         WHERE lot_id = $6 RETURNING *`,
        [statut, statut === "termine" ? null : finalLocalisation, statut === "termine" ? null : finalOuvrierNom, temps_debut_travail, temps_fin, lot_id]
      );

      if (statut === "termine") {
        const existingHistory = await client.query(
          "SELECT history_id FROM rfid_system.lot_history WHERE lot_id = $1",
          [lot_id]
        );
        if (existingHistory.rows.length === 0) {
          await client.query(
            `INSERT INTO rfid_system.lot_history 
             (lot_id, couleur, taille, ouvrier_nom, temps_debut_travail, temps_fin, statut, machine, quantite_initiale, jeans_defectueux, quantite_finale, recorded_at, operateur_nom, temps_debut)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, $12, $13)`,
            [
              lot_id,
              lot.couleur || 'N/A',
              lot.taille || 'N/A',
              finalOuvrierNom || 'N/A',
              temps_debut_travail,
              temps_fin,
              statut,
              finalLocalisation,
              quantite_initiale,
              jeans_defectueux,
              quantite_initiale - jeans_defectueux,
              lot.operateur_nom || "Operateur inconnu",
              lot.temps_debut
            ]
          );
          console.log(`Insertion dans lot_history réussie pour le lot ${lot_id}`);
        }
      }

      await client.query("COMMIT");
      console.log(`Lot mis à jour: ${JSON.stringify(updateLotResult.rows[0])}`);
      res.json(updateLotResult.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("Erreur dans /api/lots/:lot_id:", err.stack);
      res.status(500).json({ error: "Erreur serveur", details: err.message });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Erreur lors de la connexion au client:", err.stack);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

// Endpoint pour mettre à jour un jean (PUT /api/jeans/:jean_id)
app.put("/api/jeans/:jean_id", authenticateToken, async (req, res) => {
  const { jean_id } = req.params;
  const { statut_qualite, statut, localisation, ouvrier_id, ouvrier_nom } = req.body;

  try {
    console.log(`Mise a jour du jean ${jean_id} avec statut_qualite: ${statut_qualite}, statut: ${statut}, localisation: ${localisation}, ouvrier_id: ${ouvrier_id}, ouvrier_nom: ${ouvrier_nom}`);

    const client = await pool.connect(); // Utiliser un client pour gérer la transaction
    try {
      await client.query("SET search_path TO rfid_system");
      await client.query('BEGIN');

      const previousJeanResult = await client.query(
        `SELECT statut_qualite, lot_id FROM rfid_system.jeans WHERE jean_id = $1`,
        [jean_id]
      );
      if (previousJeanResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: "Jean non trouve" });
      }

      const previousStatutQualite = previousJeanResult.rows[0].statut_qualite;
      const lotId = previousJeanResult.rows[0].lot_id;

      const normalizedStatutQualite = statut_qualite === "defectueux" ? "defectueux" : statut_qualite || previousStatutQualite;

      const updateJeanResult = await client.query(
        `UPDATE rfid_system.jeans 
         SET statut_qualite = COALESCE($1, statut_qualite),
             statut = COALESCE($2, statut),
             localisation = COALESCE($3, localisation),
             ouvrier_id = COALESCE($4, ouvrier_id),
             ouvrier_nom = COALESCE($5, ouvrier_nom)
         WHERE jean_id = $6 RETURNING *`,
        [normalizedStatutQualite, statut, localisation, ouvrier_id, ouvrier_nom, jean_id]
      );

      if (updateJeanResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: "Jean non trouve" });
      }

      // Mise à jour de jeans_defectueux
      if (normalizedStatutQualite === "defectueux" && previousStatutQualite !== "defectueux") {
        await client.query(
          `UPDATE rfid_system.lots 
           SET jeans_defectueux = jeans_defectueux + 1
           WHERE lot_id = $1`,
          [lotId]
        );
        console.log(`jeans_defectueux incremente pour le lot ${lotId}`);
      }

      if (previousStatutQualite === "defectueux" && normalizedStatutQualite !== "defectueux") {
        await client.query(
          `UPDATE rfid_system.lots 
           SET jeans_defectueux = GREATEST(jeans_defectueux - 1, 0)
           WHERE lot_id = $1`,
          [lotId]
        );
        console.log(`jeans_defectueux decremente pour le lot ${lotId}`);
      }

      // Vérifier si tous les jeans sont termine ou defectueux
      const jeansStatus = await client.query(
        `SELECT COUNT(*) 
         FROM rfid_system.jeans 
         WHERE lot_id = $1 AND statut NOT IN ('termine', 'defectueux')`,
        [lotId]
      );
      const remainingJeans = parseInt(jeansStatus.rows[0].count);

      if (remainingJeans === 0) {
        // Tous les jeans sont termine ou defectueux, mettre le lot à termine
        const lotUpdate = await client.query(
          `UPDATE rfid_system.lots 
           SET statut = 'termine',
               localisation = NULL,
               ouvrier_nom = NULL,
               temps_fin = COALESCE(temps_fin, CURRENT_TIMESTAMP)
           WHERE lot_id = $1 RETURNING *`,
          [lotId]
        );
        console.log(`Lot ${lotId} passe a termine car tous les jeans sont termine ou defectueux`);

        // Recalculer jeans_defectueux et quantite_finale
        const defectueuxCount = await client.query(
          `SELECT COUNT(*) 
           FROM rfid_system.jeans 
           WHERE lot_id = $1 AND LOWER(TRIM(COALESCE(statut_qualite, ''))) = 'defectueux'`,
          [lotId]
        );
        const count = parseInt(defectueuxCount.rows[0].count);
        const lot = lotUpdate.rows[0];
        const quantite_initiale = lot.quantite_initiale || 0;
        await client.query(
          `UPDATE rfid_system.lots 
           SET jeans_defectueux = $1,
               quantite_finale = $2 - $1
           WHERE lot_id = $3`,
          [count, quantite_initiale, lotId]
        );
        console.log(`Mise a jour: jeans_defectueux = ${count}, quantite_finale = ${quantite_initiale - count} pour le lot ${lotId}`);
      }

      await client.query('COMMIT');
      console.log(`Jean mis a jour: ${JSON.stringify(updateJeanResult.rows[0])}`);
      res.json(updateJeanResult.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("Erreur dans /api/jeans/:jean_id:", err);
      res.status(500).json({ error: "Erreur serveur", details: err.message });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Erreur lors de la connexion au client:", err);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

///////////////////////////////////////////////

// Direction
// --------------------------------------------------------------------------------
// Route principale pour la Vue Globale de la direction
// Direction
// --------------------------------------------------------------------------------
// Route principale pour la Vue Globale de la direction
app.get('/direction/global-view', authenticateToken, async (req, res) => {
  console.log('Requête reçue pour /direction/global-view');
  let client;
  try {
    client = await pool.connect();
    console.log('Connexion au client PostgreSQL réussie');

    await client.query('SET search_path TO rfid_system');
    console.log('Search path défini sur rfid_system');

    const query = `
      -- Sélection des lots depuis la table lot_history (historique)
      SELECT
        lot_id,
        epc,
        taille,
        couleur,
        quantite_initiale,
        jeans_defectueux,
        quantite_finale,
        temps_debut,
        temps_debut_travail,
        temps_fin,
        statut,
        chaine_id,
        machine AS localisation,
        ouvrier_nom,
        operateur_nom,
        date_stockage,
        detected_count,
        recorded_at,
        'lot_history' AS source,
        CAST(history_id AS TEXT) AS unique_id,
        (
          SELECT json_agg(
            json_build_object(
              'epc', COALESCE(jh.epc, j.epc),
              'raison_defaut', COALESCE(cq.raison_defaut, 'Non spécifiée')
            )
          )
          FROM rfid_system.jeans_history jh
          FULL OUTER JOIN rfid_system.jeans j ON jh.jean_id = j.jean_id AND jh.lot_id = j.lot_id
          LEFT JOIN rfid_system.controle_qualite cq ON COALESCE(jh.jean_id, j.jean_id) = cq.jean_id
          WHERE COALESCE(jh.lot_id, j.lot_id) = lot_history.lot_id
          AND (COALESCE(jh.statut_qualite, j.statut_qualite) = 'defectueux' OR cq.resultat = 'defectueux')
        ) AS jeans
      FROM rfid_system.lot_history
      UNION ALL
      -- Sélection des lots depuis la table lots, mais en excluant ceux déjà dans lot_history
      SELECT
        lot_id,
        epc,
        taille,
        couleur,
        quantite_initiale,
        jeans_defectueux,
        quantite_finale,
        temps_debut,
        temps_debut_travail,
        temps_fin,
        statut,
        chaine_id,
        localisation,
        ouvrier_nom,
        operateur_nom,
        NULL AS date_stockage,
        NULL AS detected_count, -- Ajouté pour correspondre à la structure de lot_history
        NULL AS recorded_at,
        'lots' AS source,
        lot_id AS unique_id,
        (
          SELECT json_agg(
            json_build_object(
              'epc', j.epc,
              'raison_defaut', COALESCE(cq.raison_defaut, 'Non spécifiée')
            )
          )
          FROM rfid_system.jeans j
          LEFT JOIN rfid_system.controle_qualite cq ON j.jean_id = cq.jean_id
          WHERE j.lot_id = lots.lot_id
          AND (j.statut_qualite = 'defectueux' OR cq.resultat = 'defectueux')
        ) AS jeans
      FROM rfid_system.lots
      WHERE lots.lot_id NOT IN (SELECT lot_id FROM rfid_system.lot_history)
    `;
    console.log('Exécution de la requête SQL...');
    const result = await client.query(query);
    console.log('Résultat de la requête:', result.rows.length, 'lignes récupérées');

    const combinedLots = result.rows.map(lot => ({
      lot_id: lot.lot_id || 'N/A',
      epc: lot.epc || 'N/A',
      taille: lot.taille || 'N/A',
      couleur: lot.couleur || 'N/A',
      quantite_initiale: lot.quantite_initiale ?? 'N/A',
      jeans_defectueux: lot.jeans_defectueux ?? 'N/A',
      quantite_finale: lot.quantite_finale ?? 'N/A',
      temps_debut: lot.temps_debut || 'N/A',
      temps_debut_travail: lot.temps_debut_travail || 'N/A',
      temps_fin: lot.temps_fin || 'N/A',
      statut: (lot.statut || 'N/A').toLowerCase().replace('terminé', 'termine'),
      chaine_id: lot.chaine_id || 'N/A',
      localisation: lot.localisation || 'N/A',
      ouvrier_nom: lot.ouvrier_nom || 'N/A',
      operateur_nom: lot.operateur_nom || 'N/A',
      date_stockage: lot.date_stockage || 'N/A',
      detected_count: lot.detected_count !== null && lot.detected_count !== undefined ? lot.detected_count : 'N/A', // Ajouté pour le frontend
      recorded_at: lot.recorded_at || 'N/A',
      source: lot.source,
      unique_id: lot.unique_id,
      jeans: lot.jeans || [],
    }));

    console.log('Lots combinés:', combinedLots);
    res.status(200).json(combinedLots);
  } catch (error) {
    console.error('Erreur détaillée dans /direction/global-view:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      query: query, // Ajout de la requête dans les logs pour debugging
    });
    res.status(500).json({ error: 'Erreur lors de la récupération des données', details: error.message });
  } finally {
    if (client) {
      client.release();
      console.log('Client PostgreSQL libéré');
    }
  }
});
// --------------------------------------------------------------------------------
// Fin Direction
// --------------------------------------------------------------------------------
// Fin Direction



///////////////////////////////vue ouvrierss
app.get("/api/worker-progress", authenticateToken, async (req, res) => {
  const { chaine_id, ouvrier_nom } = req.query;
  console.log("Requete pour l'avancement des ouvriers, chaine_id:", chaine_id, "ouvrier_nom:", ouvrier_nom);

  try {
    await pool.query("SET search_path TO rfid_system");
    const currentDate = new Date().toISOString().split('T')[0]; // e.g., '2025-05-15'
    const dailyTargetLots = 10; // Set daily target to 10 lots
    const percentagePerLot = 100 / dailyTargetLots; // e.g., 10% per lot

    let query = `
      SELECT 
        o.ouvrier_id,
        o.nom,
        o.prenom,
        o.localisation,
        o.chaine_id,
        -- Completed lots from lot_history (today only)
        COALESCE(
          (SELECT COUNT(DISTINCT lh.lot_id)
           FROM lot_history lh
           WHERE TRIM(lh.ouvrier_nom) = TRIM(o.nom || ' ' || o.prenom)
           AND lh.statut IN ('termine', 'stocke')
           AND DATE(lh.recorded_at) = $1
           ${chaine_id ? "AND lh.chaine_id = $2" : ""}
           ${ouvrier_nom ? "AND TRIM(lh.ouvrier_nom) = TRIM($3)" : ""}
          ), 0
        ) AS lots_termines,
        COALESCE(
          (SELECT SUM(lh.quantite_finale)
           FROM lot_history lh
           WHERE TRIM(lh.ouvrier_nom) = TRIM(o.nom || ' ' || o.prenom)
           AND lh.statut IN ('termine', 'stocke')
           AND DATE(lh.recorded_at) = $1
           ${chaine_id ? "AND lh.chaine_id = $2" : ""}
           ${ouvrier_nom ? "AND TRIM(lh.ouvrier_nom) = TRIM($3)" : ""}
          ), 0
        ) AS jeans_termines,
        COALESCE(
          (SELECT SUM(lh.jeans_defectueux)
           FROM lot_history lh
           WHERE TRIM(lh.ouvrier_nom) = TRIM(o.nom || ' ' || o.prenom)
           AND lh.statut IN ('termine', 'stocke')
           AND DATE(lh.recorded_at) = $1
           ${chaine_id ? "AND lh.chaine_id = $2" : ""}
           ${ouvrier_nom ? "AND TRIM(lh.ouvrier_nom) = TRIM($3)" : ""}
          ), 0
        ) AS jeans_defectueux,
        -- Total quantity to process today (workload from lots started today and completed today)
        COALESCE(
          (SELECT SUM(l.quantite_initiale)
           FROM lots l
           WHERE l.chaine_id = o.chaine_id
           AND TRIM(l.ouvrier_nom) = TRIM(o.nom || ' ' || o.prenom)
           AND l.statut IN ('en cours', 'en attente')
           AND DATE(l.temps_debut) = $1
          ), 0
        ) + COALESCE(
          (SELECT SUM(lh.quantite_initiale)
           FROM lot_history lh
           WHERE TRIM(lh.ouvrier_nom) = TRIM(o.nom || ' ' || o.prenom)
           AND lh.statut IN ('termine', 'stocke')
           AND DATE(lh.recorded_at) = $1
           ${chaine_id ? "AND lh.chaine_id = $2" : ""}
           ${ouvrier_nom ? "AND TRIM(lh.ouvrier_nom) = TRIM($3)" : ""}
          ), 0
        ) AS quantite_a_traiter,
        -- Calculate percentage of advancement based on daily target
        COALESCE(
          (SELECT SUM(
            CASE 
              WHEN lh.quantite_initiale > 0 
              THEN (${percentagePerLot}::float * lh.quantite_finale / lh.quantite_initiale)
              ELSE 0
            END
          )
           FROM lot_history lh
           WHERE TRIM(lh.ouvrier_nom) = TRIM(o.nom || ' ' || o.prenom)
           AND lh.statut IN ('termine', 'stocke')
           AND DATE(lh.recorded_at) = $1
           ${chaine_id ? "AND lh.chaine_id = $2" : ""}
           ${ouvrier_nom ? "AND TRIM(lh.ouvrier_nom) = TRIM($3)" : ""}
          ), 0
        ) AS pourcentage_avancement
      FROM ouvriers o
      WHERE o.is_active = true
      ${chaine_id ? "AND o.chaine_id = $2" : ""}
      ${ouvrier_nom ? "AND TRIM(o.nom || ' ' || o.prenom) = TRIM($3)" : ""}
    `;
    const params = [currentDate];
    if (chaine_id) params.push(chaine_id);
    if (ouvrier_nom) params.push(ouvrier_nom);

    const result = await pool.query(query, params);
    console.log("Avancement des ouvriers recupere:", result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur dans /api/worker-progress:", err.stack);
    res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
});

//////////////////////////////////////


app.get('/api/lot-history/stock', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    await client.query('SET search_path TO rfid_system');
    const result = await client.query(
      'SELECT lot_id, epc, quantite_finale, detected_count, statut FROM lot_history WHERE statut = $1',
      ['stocke']
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur dans /api/lot-history/stock:', err.stack);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  } finally {
    if (client) client.release();
  }
});

// Endpoint pour mettre à jour detected_count
// Endpoint pour mettre à jour detected_count (sans authentification)
app.post('/api/lots/detect-count', async (req, res) => {
  console.log('Requête reçue pour /api/lots/detect-count:', req.body);
  const { lot_id, detected_count } = req.body;

  // Vérification des paramètres d'entrée
  if (!lot_id || detected_count === undefined) {
    console.log('Erreur: lot_id ou detected_count manquant');
    return res.status(400).json({ error: 'lot_id et detected_count sont requis' });
  }

  // Vérifier que detected_count est un entier non négatif
  if (!Number.isInteger(detected_count) || detected_count < 0) {
    console.log('Erreur: detected_count doit être un entier non négatif:', detected_count);
    return res.status(400).json({ error: 'detected_count doit être un entier non négatif' });
  }

  let client;
  try {
    client = await pool.connect();
    console.log('Connexion à la base de données établie');

    // Démarrer une transaction
    await client.query('BEGIN');
    console.log('Transaction démarrée');

    await client.query('SET search_path TO rfid_system');
    console.log('Schéma rfid_system défini');

    // Vérifier si le lot_id existe avec statut = stocke
    const lotResult = await client.query(
      'SELECT lot_id, statut FROM lot_history WHERE lot_id = $1 AND statut = $2',
      [lot_id, 'stocke']
    );
    console.log('Résultat de la vérification du lot:', lotResult.rows);

    if (lotResult.rows.length === 0) {
      console.log('Aucun lot trouvé avec lot_id:', lot_id, 'et statut stocke');
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Aucun lot trouvé avec ce lot_id et statut stocke' });
    }

    // Mettre à jour detected_count
    const updateResult = await client.query(
      'UPDATE lot_history SET detected_count = $1 WHERE lot_id = $2 RETURNING *',
      [detected_count, lot_id]
    );
    console.log('Résultat de la mise à jour:', updateResult.rows);

    if (updateResult.rows.length === 0) {
      console.log('Échec de la mise à jour de detected_count pour lot_id:', lot_id);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Échec de la mise à jour de detected_count' });
    }

    // Vérifier l'état après la mise à jour
    const verifyResult = await client.query(
      'SELECT detected_count FROM lot_history WHERE lot_id = $1',
      [lot_id]
    );
    console.log('État après mise à jour:', verifyResult.rows);

    if (verifyResult.rows.length === 0 || verifyResult.rows[0].detected_count !== detected_count) {
      console.log('Incohérence après mise à jour pour lot_id:', lot_id, 'detected_count attendu:', detected_count, 'trouvé:', verifyResult.rows[0]?.detected_count);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Incohérence après mise à jour de detected_count' });
    }

    // Valider la transaction
    await client.query('COMMIT');
    console.log('Transaction validée');

    console.log('Mise à jour de detected_count réussie:', updateResult.rows[0]);
    res.json({ lot_id, detected_count, message: 'detected_count mis à jour avec succès' });
  } catch (err) {
    console.error('Erreur dans /api/lots/detect-count:', err.stack);
    if (client) {
      await client.query('ROLLBACK');
      console.log('Transaction annulée');
    }
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  } finally {
    if (client) {
      client.release();
      console.log('Connexion à la base de données libérée');
    }
  }
});

























// Configuration du serveur WebSocket
const wss = new WebSocket.Server({ port: 8081 });

wss.on("connection", (ws) => {
  console.log("Nouvelle connexion WebSocket établie");
  ws.on("message", (message) => {
    console.log("Message WebSocket reçu:", message.toString());
    try {
      const data = JSON.parse(message);
      if (data.type === "hid" && data.epc) {
        console.log("Diffusion de l'EPC via WebSocket:", data.epc);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "hid", epc: data.epc }));
          }
        });
      }
    } catch (err) {
      console.error("Erreur lors du traitement du message WebSocket:", err);
    }
  });

  ws.on("close", () => {
    console.log("Connexion WebSocket fermée");
  });

  ws.on("error", (error) => {
    console.error("Erreur WebSocket:", error);
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});