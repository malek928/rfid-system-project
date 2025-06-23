const bcrypt = require("bcryptjs");

const users = [
  { utilisateur_id: "USER003", email: "ahmed.benali@email.com" },
  { utilisateur_id: "USER011", email: "hassan.mohamed@email.com" },
  { utilisateur_id: "USER012", email: "youssef.ali@email.com" },
  { utilisateur_id: "USER013", email: "nadia.khadra@email.com" },
  { utilisateur_id: "USER004", email: "amirimalekk92@gmail.com" },
  { utilisateur_id: "USER007", email: "operateur1@email.com" },
  { utilisateur_id: "USER008", email: "operateur2@email.com" },

];

const password = "password123";

const hashedPassword = bcrypt.hashSync(password, 10);

users.forEach((user) => {
  console.log(`Utilisateur: ${user.utilisateur_id} (${user.email})`);
  console.log(`Mot de passe haché: ${hashedPassword}`);
  console.log("Requête SQL:");
  console.log(`UPDATE utilisateurs SET password = '${hashedPassword}' WHERE utilisateur_id = '${user.utilisateur_id}';`);
  console.log("---");
});


