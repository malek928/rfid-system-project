import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import Header from "../../components/Header";

const Production = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode) || {};
  const [jeans, setJeans] = useState([]);
  const [filteredJeans, setFilteredJeans] = useState([]);
  const [selectedJean, setSelectedJean] = useState(null);
  const [scannedEpc, setScannedEpc] = useState("");
  const [defectReason, setDefectReason] = useState("");
  const [dateControle, setDateControle] = useState(new Date().toISOString().split("T")[0]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [openQualityControlModal, setOpenQualityControlModal] = useState(false);
  const [chainName, setChainName] = useState("Chaine inconnue");
  const [filterLot, setFilterLot] = useState("");
  const [filterQuality, setFilterQuality] = useState("");
  const [openFilterLotModal, setOpenFilterLotModal] = useState(false);
  const [openFilterQualityModal, setOpenFilterQualityModal] = useState(false);

  const responsableNom = localStorage.getItem("nom");
  const responsablePrenom = localStorage.getItem("prenom");
  const chaineId = localStorage.getItem("chaine_id");

  useEffect(() => {
    let ws;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectInterval = 3000;
    const initialDelay = 1000;

    const connectWebSocket = () => {
      console.log("Tentative de connexion WebSocket...");
      ws = new WebSocket("ws://localhost:8081");

      ws.onopen = () => {
        console.log("Connexion WebSocket etablie");
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Message recu via WebSocket:", data);
        if (data.type === "hid" && data.epc) {
          handleScanJean(data.epc);
        }
      };

      ws.onclose = (event) => {
        console.log("Connexion WebSocket fermee:", event);
        if (reconnectAttempts < maxReconnectAttempts) {
          console.log(`Tentative de reconnexion ${reconnectAttempts + 1}/${maxReconnectAttempts} dans ${reconnectInterval/1000} secondes...`);
          setTimeout(connectWebSocket, reconnectInterval);
          reconnectAttempts++;
        } else {
          console.error("Echec de la reconnexion apres plusieurs tentatives.");
        }
      };

      ws.onerror = (error) => {
        console.error("Erreur WebSocket:", error);
        ws.close();
      };
    };

    const timer = setTimeout(() => {
      connectWebSocket();
    }, initialDelay);

    return () => {
      clearTimeout(timer);
      if (ws) {
        console.log("Fermeture de la connexion WebSocket");
        ws.close();
      }
    };
  }, []);

  const fetchJeansAndChain = async () => {
    try {
      const token = localStorage.getItem("token");
      console.log("Token utilise:", token);
      if (!token) {
        setSnackbarMessage("Erreur : Aucun token d'authentification trouve. Veuillez vous connecter.");
        setSnackbarOpen(true);
        return;
      }
      if (!chaineId) {
        setSnackbarMessage("Erreur : Aucune chaine associee a votre compte.");
        setSnackbarOpen(true);
        return;
      }

      const jeansResponse = await fetch(`http://localhost:5000/api/jeans?chaine_id=${chaineId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Reponse API jeans:", jeansResponse.status, jeansResponse.statusText);
      const jeansData = await jeansResponse.json();
      if (jeansResponse.ok) {
        setJeans(jeansData);
        applyFilters(jeansData, filterLot, filterQuality);
      } else {
        throw new Error(`Erreur API: ${jeansResponse.status} - ${jeansResponse.statusText}`);
      }

      const chainResponse = await fetch(`http://localhost:5000/api/chaines/${chaineId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Reponse API chaines:", chainResponse.status, chainResponse.statusText);
      const chainData = await chainResponse.json();
      if (chainResponse.ok) {
        setChainName(chainData.nom_chaine || "Chaine inconnue");
      } else {
        console.warn("Impossible de recuperer le nom de la chaine:", chainData);
        setChainName("Chaine inconnue");
      }
    } catch (err) {
      console.error("Erreur lors du chargement des donnees:", err);
      setSnackbarMessage(`Erreur serveur: ${err.message}`);
      setSnackbarOpen(true);
    }
  };

  useEffect(() => {
    if (chaineId) {
      fetchJeansAndChain();
    }
  }, [chaineId]);

  const applyFilters = (data, lotFilter, qualityFilter) => {
    let filtered = [...data];
    if (lotFilter) {
      filtered = filtered.filter((jean) => jean.lot_id === lotFilter);
    }
    if (qualityFilter) {
      filtered = filtered.filter((jean) => jean.statut_qualite === qualityFilter);
    }
    setFilteredJeans(filtered);
  };

  useEffect(() => {
    applyFilters(jeans, filterLot, filterQuality);
  }, [jeans, filterLot, filterQuality]);

  const handleScanJean = async (epc) => {
    try {
      const token = localStorage.getItem("token");
      console.log("Token pour scan:", token);
      if (!token) {
        setSnackbarMessage("Erreur : Aucun token d'authentification trouve. Veuillez vous connecter.");
        setSnackbarOpen(true);
        return;
      }
      const response = await fetch(`http://localhost:5000/api/jeans/by-epc?epc=${epc}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Reponse API scan:", response.status, response.statusText);
      const jean = await response.json();
      if (response.ok) {
        console.log("lot_id recu:", jean.lot_id);
        if (!jean.lot_id) {
          setSnackbarMessage("Erreur : Aucun lot_id trouve pour ce jean.");
          setSnackbarOpen(true);
          return;
        }
        const lotResponse = await fetch(`http://localhost:5000/api/lots/${jean.lot_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Reponse API lot:", lotResponse.status, lotResponse.statusText);
        if (!lotResponse.ok) {
          throw new Error(`Erreur API: ${lotResponse.status} - Lot non trouve`);
        }
        const lot = await lotResponse.json();
        if (lot.chaine_id !== chaineId) {
          setSnackbarMessage("Erreur : Ce jean n'appartient pas a votre chaine.");
          setSnackbarOpen(true);
          return;
        }
        if (lot.statut !== "en cours") {
          setSnackbarMessage("Erreur : Le controle qualite ne peut etre effectue que sur un lot en cours.");
          setSnackbarOpen(true);
          return;
        }
        // Appliquer le filtrage automatique par lot
        setFilterLot(jean.lot_id);
        setSelectedJean(jean);
        setScannedEpc(epc);
        setDefectReason("");
        setDateControle(new Date().toISOString().split("T")[0]);
        setOpenQualityControlModal(true);
      } else {
        throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
      }
    } catch (err) {
      console.error("Erreur lors de la recuperation du jean par EPC:", err);
      setSnackbarMessage(`Erreur: ${err.message}`);
      setSnackbarOpen(true);
    }
  };

  const handleSimulateScanJean = () => {
    const epc = prompt("Entrez un EPC pour simuler (ex: JEAN_EPC001)");
    if (epc) {
      handleScanJean(epc.trim());
    }
  };

  const handleSaveQualityControl = async () => {
    if (!selectedJean) {
      setSnackbarMessage("Erreur : Aucun jean selectionne.");
      setSnackbarOpen(true);
      return;
    }
    if (!defectReason) {
      setSnackbarMessage("Erreur : Veuillez specifier la raison du defaut.");
      setSnackbarOpen(true);
      return;
    }
    if (!dateControle) {
      setSnackbarMessage("Erreur : Veuillez specifier la date de controle.");
      setSnackbarOpen(true);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const responsableId = localStorage.getItem("utilisateur_id");

      if (!token) throw new Error("Aucun token d'authentification trouve. Veuillez vous connecter.");
      if (!responsableId) throw new Error("ID de l'utilisateur manquant. Veuillez vous connecter.");
      if (!selectedJean.lot_id) throw new Error("Lot ID manquant pour ce jean.");
      if (!selectedJean.jean_id) throw new Error("Jean ID manquant.");

      const qualityControlData = {
        lot_id: selectedJean.lot_id,
        date_controle: new Date(dateControle).toISOString(),
        resultat: "defectueux",
        raison_defaut: defectReason,
        responsable_id: responsableId,
      };

      console.log("Donnees envoyees a l'API:", qualityControlData);

      const qualityResponse = await fetch(`http://localhost:5000/api/jeans/${selectedJean.jean_id}/quality-control`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(qualityControlData),
      });

      console.log("Reponse API qualite:", qualityResponse.status, qualityResponse.statusText);
      if (!qualityResponse.ok) {
        const errorData = await qualityResponse.json();
        throw new Error(`Erreur API: ${qualityResponse.status} - ${errorData.error || qualityResponse.statusText} - Details: ${errorData.details || "Aucun detail"}`);
      }

      const updateJeanResponse = await fetch(`http://localhost:5000/api/jeans/${selectedJean.jean_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statut_qualite: "defectueux" }),
      });

      console.log("Reponse API mise a jour:", updateJeanResponse.status, updateJeanResponse.statusText);
      if (!updateJeanResponse.ok) {
        const errorData = await updateJeanResponse.json();
        throw new Error(`Erreur API: ${updateJeanResponse.status} - ${errorData.error || updateJeanResponse.statusText}`);
      }

      await fetchJeansAndChain();
      setSnackbarMessage(`Jean ${selectedJean.jean_id} marque comme defectueux avec succes !`);
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du controle qualite:", err);
      setSnackbarMessage(`Erreur: ${err.message}`);
      setSnackbarOpen(true);
    }

    setOpenQualityControlModal(false);
    setSelectedJean(null);
    setScannedEpc("");
    setDefectReason("");
    setDateControle(new Date().toISOString().split("T")[0]);
  };

  const handleCloseQualityControlModal = () => {
    setOpenQualityControlModal(false);
    setSelectedJean(null);
    setScannedEpc("");
    setDefectReason("");
    setDateControle(new Date().toISOString().split("T")[0]);
  };

  const handleOpenFilterLotModal = () => setOpenFilterLotModal(true);
  const handleCloseFilterLotModal = () => {
    setOpenFilterLotModal(false);
    setFilterLot("");
  };
  const handleApplyFilterLot = () => {
    setOpenFilterLotModal(false);
  };

  const handleOpenFilterQualityModal = () => setOpenFilterQualityModal(true);
  const handleCloseFilterQualityModal = () => {
    setOpenFilterQualityModal(false);
    setFilterQuality("");
  };
  const handleApplyFilterQuality = () => {
    setOpenFilterQualityModal(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const getQualityColor = (quality) => {
    const normalizedQuality = quality ? quality.toLowerCase() : "non verifie";
    const safeColors = colors || {};
    const green = safeColors.greenAccent || { 500: "#4caf50" };
    const red = safeColors.redAccent || { 500: "#f44336" };
    switch (normalizedQuality) {
      case "ok":
        return green[500];
      case "defectueux":
        return red[500];
      case "non verifie":
      default:
        return "transparent"; // Pas de couleur pour "non verifie"
    }
  };

  // Méthode HID pour capturer les scans RFID
  useEffect(() => {
    let buffer = ""; // Stocke les caractères de l'EPC
    const modifierKeys = ["Shift", "Control", "Alt", "Meta"]; // Touches à ignorer

    const handleKeyDown = (event) => {
      // Ignorer les touches de modification
      if (modifierKeys.includes(event.key)) {
        return;
      }

      if (event.key === "Enter") {
        // Fin du scan (Enter détecté), traiter l'EPC
        if (buffer.trim()) {
          console.log("Buffer brut avant conversion:", buffer.trim());
          const cleanedEpc = buffer.trim().toUpperCase();

          // Vérifier si le buffer est valide
          if (!cleanedEpc) {
            setSnackbarMessage("Erreur : EPC invalide (aucun caractère détecté).");
            setSnackbarOpen(true);
            buffer = "";
            return;
          }

          // Utiliser l'EPC tel quel
          console.log("EPC final:", cleanedEpc);
          handleScanJean(cleanedEpc);
          setSnackbarMessage(`Tag scanné : ${cleanedEpc}`);
          setSnackbarOpen(true);
          buffer = ""; // Réinitialise le buffer
        }
      } else {
        // Ajoute chaque caractère au buffer
        buffer += event.key;
      }
    };

    // Ajoute l'écouteur d'événements clavier
    window.addEventListener("keydown", handleKeyDown);

    // Nettoie l'écouteur quand le composant est démonté
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const columns = [
    {
      field: "jean_id",
      headerName: "ID du Jean",
      flex: 1,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "epc",
      headerName: "EPC",
      flex: 1,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "lot_id",
      headerName: "ID du Lot",
      flex: 1,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "statut_qualite",
      headerName: "Qualite",
      flex: 1,
      renderCell: (params) => {
        const status = params.row.statut || "en attente"; // Récupère le statut du jean
        let quality = params.value || ""; // Utilise "" si undefined/null

        // Si le statut est "termine" et que statut_qualite n'est pas "defectueux", forcer quality à "ok"
        if (status.toLowerCase() === "termine" && quality.toLowerCase() !== "defectueux") {
          quality = "ok";
        } else if (!quality) {
          quality = "non verifie"; // Ajoute "non vérifié" si quality est vide
        }

        const qualityColor = getQualityColor(quality);
        const displayQuality = quality.toLowerCase() === "non verifie" ? "Non vérifié" : quality.charAt(0).toUpperCase() + quality.slice(1);
        return (
          <Box display="flex" alignItems="center" gap="8px" justifyContent="center">
            <Box sx={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: qualityColor }} />
            <Typography color={qualityColor}>{displayQuality}</Typography>
          </Box>
        );
      },
      headerAlign: "center",
      align: "center",
    },
    {
      field: "localisation",
      headerName: "Localisation",
      flex: 1,
      valueGetter: (params) => params.row.localisation || "N/A",
      headerAlign: "center",
      align: "center",
    },
    {
      field: "ouvrier_nom",
      headerName: "Ouvrier",
      flex: 1,
      valueGetter: (params) => params.row.ouvrier_nom || "Non assigne",
      cellClassName: "name-column--cell",
      headerAlign: "center",
      align: "center",
    },
  ];

  const rows = filteredJeans.map((jean) => ({
    id: jean.jean_id,
    ...jean,
  }));

  const uniqueLotIds = [...new Set(jeans.map((jean) => jean.lot_id))].sort();

  return (
    <Box m="20px">
      <Header
        title={`TRACABILITE DES JEANS - ${chainName}`}
        subtitle={`${responsableNom} ${responsablePrenom}`}
      />

      <Box mb={2} display="flex" gap={2} flexWrap="wrap">
        <Button
          variant="contained"
          onClick={handleOpenFilterLotModal}
          sx={{
            backgroundColor: colors.blueAccent?.[500] || "#1976d2",
            color: colors.grey?.[100] || "#e0e0e0",
            padding: "10px 20px",
            borderRadius: "12px",
            "&:hover": { backgroundColor: colors.blueAccent?.[700] || "#1565c0" },
            textTransform: "none",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          Filtrer par Lot
        </Button>
        <Button
          variant="contained"
          onClick={handleOpenFilterQualityModal}
          sx={{
            backgroundColor: colors.greenAccent?.[500] || "#4caf50",
            color: colors.grey?.[100] || "#e0e0e0",
            padding: "10px 20px",
            borderRadius: "12px",
            "&:hover": { backgroundColor: colors.greenAccent?.[700] || "#43a047" },
            textTransform: "none",
            fontWeight: "bold",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          Filtrer par Qualité
        </Button>
      </Box>

      {rows.length === 0 ? (
        <Typography variant="h5" color={colors.grey?.[100] || "#e0e0e0"}>
          Aucun jean trouve pour votre chaine.
        </Typography>
      ) : (
        <Box
          m="40px 0 0 0"
          height="75vh"
          sx={{
            "& .MuiDataGrid-root": {
              border: "none",
              borderRadius: "8px",
              boxShadow: `0 4px 8px ${colors.primary?.[900] || "#1a202c"}`,
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "none",
              padding: "0 8px",
              color: colors.grey?.[100] || "#e0e0e0",
              fontSize: "14px",
            },
            "& .name-column--cell": {
              color: colors.greenAccent?.[300] || "#66bb6a",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: colors.blueAccent?.[700] || "#1976d2",
              borderBottom: `2px solid ${colors.grey?.[700] || "#b0b0b0"}`,
              padding: "8px 0",
            },
            "& .MuiDataGrid-columnHeader": {
              padding: "0 16px",
              borderRight: `1px solid ${colors.grey?.[700] || "#b0b0b0"}`,
              "&:last-child": {
                borderRight: "none",
              },
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
              fontSize: "16px",
              color: colors.grey?.[100] || "#e0e0e0",
              whiteSpace: "normal",
              lineHeight: "1.2",
              textAlign: "center",
            },
            "& .MuiDataGrid-columnSeparator": {
              display: "none",
            },
            "& .MuiDataGrid-virtualScroller": {
              backgroundColor: colors.primary?.[400] || "#2d3748",
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "none",
              backgroundColor: colors.blueAccent?.[700] || "#1976d2",
            },
            "& .MuiCheckbox-root": {
              color: `${colors.greenAccent?.[200] || "#66bb6a"} !important`,
            },
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            pageSize={10}
            rowsPerPageOptions={[10]}
            disableSelectionOnClick
          />
        </Box>
      )}

      <Box mt={3} display="flex" gap={2}>
        <Button
          variant="contained"
          onClick={handleSimulateScanJean}
          sx={{
            backgroundColor: colors.greenAccent?.[500] || "#4caf50",
            color: colors.grey?.[100] || "#e0e0e0",
            padding: "10px 20px",
            borderRadius: "8px",
            "&:hover": { backgroundColor: colors.greenAccent?.[700] || "#43a047" },
            textTransform: "none",
            fontWeight: "bold",
          }}
        >
          Simuler un scan HID
        </Button>
      </Box>

      {/* Modal de filtre par Lot */}
      <Dialog
        open={openFilterLotModal}
        onClose={handleCloseFilterLotModal}
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "90%", sm: "400px" },
            backgroundColor: colors.primary?.[400] || "#2d3748",
            borderRadius: "16px",
            padding: "24px",
          },
        }}
      >
        <DialogTitle sx={{ color: colors.grey?.[100] || "#e0e0e0", fontWeight: "bold" }}>Filtrer par Lot</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel sx={{ color: colors.grey?.[500] || "#b0b0b0" }}>Lot</InputLabel>
            <Select
              value={filterLot}
              onChange={(e) => setFilterLot(e.target.value)}
              label="Lot"
              sx={{ color: colors.grey?.[100] || "#e0e0e0", ".MuiSelect-icon": { color: colors.grey?.[500] || "#b0b0b0" } }}
            >
              <MenuItem value="">Tous</MenuItem>
              {uniqueLotIds.map((lotId) => (
                <MenuItem key={lotId} value={lotId}>{lotId}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFilterLotModal} sx={{ color: colors.redAccent?.[500] || "#f44336" }}>Annuler</Button>
          <Button onClick={handleApplyFilterLot} sx={{ color: colors.greenAccent?.[500] || "#4caf50" }}>Appliquer</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de filtre par Qualite */}
      <Dialog
        open={openFilterQualityModal}
        onClose={handleCloseFilterQualityModal}
        sx={{
          "& .MuiDialog-paper": {
            width: { xs: "90%", sm: "400px" },
            backgroundColor: colors.primary?.[400] || "#2d3748",
            borderRadius: "16px",
            padding: "24px",
          },
        }}
      >
        <DialogTitle sx={{ color: colors.grey?.[100] || "#e0e0e0", fontWeight: "bold" }}>Filtrer par Qualite</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel sx={{ color: colors.grey?.[500] || "#b0b0b0" }}>Qualite</InputLabel>
            <Select
              value={filterQuality}
              onChange={(e) => setFilterQuality(e.target.value)}
              label="Qualite"
              sx={{ color: colors.grey?.[100] || "#e0e0e0", ".MuiSelect-icon": { color: colors.grey?.[500] || "#b0b0b0" } }}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="ok">OK</MenuItem>
              <MenuItem value="defectueux">Defectueux</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFilterQualityModal} sx={{ color: colors.redAccent?.[500] || "#f44336" }}>Annuler</Button>
          <Button onClick={handleApplyFilterQuality} sx={{ color: colors.greenAccent?.[500] || "#4caf50" }}>Appliquer</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de controle qualite */}
      <Dialog
        open={openQualityControlModal}
        onClose={handleCloseQualityControlModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            backgroundColor: colors.primary?.[700],
            color: colors.grey?.[100],
            padding: "10px 24px",
            fontSize: "1.5rem",
            fontWeight: "bold",
          }}
        >
          Controle Qualite - Jean {selectedJean?.jean_id}
        </DialogTitle>
        <DialogContent
          sx={{
            backgroundColor: colors.primary?.[600],
            padding: "10px",
          }}
        >
          {selectedJean && (
            <Box sx={{ maxWidth: "400px", margin: "0 auto", padding: "10px" }}>
              <Typography
                variant="h6"
                color={colors.grey?.[100]}
                sx={{ fontWeight: "500", mb: 3, textAlign: "center", letterSpacing: "0.5px" }}
              >
                Informations du Contrôle Qualité
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                label="ID du Jean"
                value={selectedJean.jean_id || ""}
                InputProps={{ readOnly: true, sx: { color: colors.grey?.[100] } }}
                InputLabelProps={{ style: { color: colors.grey?.[300] } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: colors.grey?.[500] },
                    "&:hover fieldset": { borderColor: colors.grey?.[300] },
                    "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                  },
                }}
              />
              <TextField
                fullWidth
                margin="normal"
                label="EPC"
                value={scannedEpc || ""}
                InputProps={{ readOnly: true, sx: { color: colors.grey?.[100] } }}
                InputLabelProps={{ style: { color: colors.grey?.[300] } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: colors.grey?.[500] },
                    "&:hover fieldset": { borderColor: colors.grey?.[300] },
                    "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                  },
                }}
              />
              <Typography sx={{ color: colors.grey?.[100], mt: 2 }}>
                Resultat : Defectueux
              </Typography>
              <TextField
                fullWidth
                margin="normal"
                label="Raison du Defaut"
                value={defectReason}
                onChange={(e) => setDefectReason(e.target.value)}
                required
                InputLabelProps={{ style: { color: colors.grey?.[300] } }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: colors.grey?.[500] },
                    "&:hover fieldset": { borderColor: colors.grey?.[300] },
                    "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                  },
                }}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Date de Controle"
                type="date"
                value={dateControle}
                onChange={(e) => setDateControle(e.target.value)}
                InputLabelProps={{ shrink: true, style: { color: colors.grey?.[300] } }}
                required
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: colors.grey?.[500] },
                    "&:hover fieldset": { borderColor: colors.grey?.[300] },
                    "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                  },
                }}
              />
              <Typography color={colors.grey?.[500]} sx={{ mt: 1 }}>
                Note : Ce jean sera marque comme defectueux. Les autres jeans seront marques "OK" lorsque le lot sera termine.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            backgroundColor: colors.primary?.[700],
            padding: "10px 20px",
            borderTop: `2px solid ${colors.grey?.[700]}`,
          }}
        >
          <Button
            onClick={handleCloseQualityControlModal}
            sx={{
              backgroundColor: colors.redAccent?.[600],
              color: colors.grey?.[100],
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: colors.redAccent?.[700], transform: "translateY(-2px)" },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSaveQualityControl}
            sx={{
              backgroundColor: colors.greenAccent?.[600],
              color: colors.grey?.[100],
              padding: "8px 16px",
              borderRadius: "8px",
              "&:hover": { backgroundColor: colors.greenAccent?.[700], transform: "translateY(-2px)" },
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarMessage.includes("Erreur") ? "error" : "success"}
          sx={{
            width: "100%",
            fontSize: "16px",
            backgroundColor: colors.primary?.[400] || "#2d3748",
            color: colors.grey?.[100] || "#e0e0e0",
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Production;