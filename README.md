# rfid-system-project
## Description
Ce projet est un système RFID (Radio Frequency Identification) conçu pour gérer et suivre des lots de jeans dans un atelier textile, en utilisant des lecteurs RFID mobiles et fixes. Développé dans un cadre académique, il inclut les composants suivants :
- **Backend (`backend-textile`)** : Un serveur Node.js qui gère les requêtes API, se connecte à une base de données PostgreSQL, et traite les données des lecteurs RFID pour suivre les lots et les jeans en temps réel.
- **Frontend (`react-admin-dashboard-master`)** : Un tableau de bord React offrant une interface utilisateur pour visualiser les données, comme les détails des lots et les historiques de suivi, avec des grilles de données interactives.
- **Intégration des lecteurs RFID** : Utilisation d’un lecteur RFID mobile pour les opérateurs sur le terrain et d’un lecteur fixe à la fin de la ligne de production pour automatiser le suivi, notamment dans la partie stockage avec un système antivol basé sur la détection des tags RFID.
- **Base de données (`rfid_system2.sql`)** : Un dump PostgreSQL contenant des tables comme `lots`, `jeans`, et `suivi_production` pour enregistrer les localisations et les statuts.

Le système a été présenté avec succès et a obtenu une "Mention Très Bien". Il permet une traçabilité précise des jeans tout au long du processus de production et intègre une sécurité renforcée avec le système antivol dans le stockage.
