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
  Snackbar,
  Alert,
  IconButton,
  LinearProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import { formatInTimeZone } from "date-fns-tz";

const MyTasks = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode) || {};
  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [scannedEpc, setScannedEpc] = useState("");
  const [scanTime, setScanTime] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [chainName, setChainName] = useState("Chaine inconnue");
  const [lotColor, setLotColor] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [openJeansScanModal, setOpenJeansScanModal] = useState(false);
  const [currentLotId, setCurrentLotId] = useState(null);
  const [scannedJeans, setScannedJeans] = useState([]);

  const operatorNom = localStorage.getItem("nom");
  const operatorPrenom = localStorage.getItem("prenom");
  const chaineId = localStorage.getItem("chaine_id");

  const fetchLotsAndChain = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!chaineId) {
        setSnackbarMessage("Erreur : Aucune chaine associee a votre compte.");
        setSnackbarOpen(true);
        return;
      }
      const response = await fetch(`http://localhost:5000/api/lots?chaine_id=${chaineId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText || "Erreur serveur"}`);
      }
      const data = await response.json();
      if (data && Array.isArray(data)) {
        setLots(data);
      } else {
        throw new Error("Reponse invalide : donnees non conformes");
      }

      const chainResponse = await fetch(`http://localhost:5000/api/chaines/${chaineId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (chainResponse.ok) {
        const chainData = await chainResponse.json();
        setChainName(chainData.nom_chaine || "Chaine inconnue");
      } else {
        setChainName("Chaine inconnue");
        const errorText = await chainResponse.text();
        setSnackbarMessage(`Erreur lors de la recuperation du nom de la chaine: ${errorText || "Erreur serveur"}`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des lots ou de la chaine:", err);
      setSnackbarMessage(`Erreur serveur: ${err.message}`);
      setSnackbarOpen(true);
    }
  };

  const fetchJeansForLot = async (lotId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/jeans/by-lot?lot_id=${lotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setScannedJeans(data.jeans || []);
      } else {
        throw new Error(`Erreur HTTP ${response.status}: ${await response.text() || "Erreur serveur"}`);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des jeans:", err);
      setSnackbarMessage(`Erreur serveur: ${err.message}`);
      setSnackbarOpen(true);
    }
  };

  useEffect(() => {
    if (chaineId) {
      fetchLotsAndChain();
    }
  }, [chaineId]);

  const handleScanLot = async (epc) => {
    const cleanedEpc = epc.trim().toUpperCase();
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/lots/by-epc?epc=${encodeURIComponent(cleanedEpc)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const lot = await response.json();
        if (lot.chaine_id !== chaineId) {
          setSnackbarMessage("Erreur : Ce lot n'appartient pas a votre chaine.");
          setSnackbarOpen(true);
          return;
        }
        setSelectedLot(lot);
        setScannedEpc(cleanedEpc);
        const localTime = formatInTimeZone(
          new Date(lot.temps_debut || new Date()),
          'Africa/Tunis',
          "yyyy-MM-dd'T'HH:mm"
        );
        setScanTime(localTime);
        setLotColor(lot.couleur || "");
        setLotSize(lot.taille || "");
        setOpenDetailsModal(true);
      } else {
        if (response.status === 404) {
          setSelectedLot(null);
          setScannedEpc(cleanedEpc);
          const localTime = formatInTimeZone(
            new Date(),
            'Africa/Tunis',
            "yyyy-MM-dd'T'HH:mm"
          );
          setScanTime(localTime);
          setLotColor("");
          setLotSize("");
          setOpenDetailsModal(true);
          setSnackbarMessage(`Aucun lot trouve pour EPC ${cleanedEpc}. Creation d'un nouveau lot proposee.`);
          setSnackbarOpen(true);
        } else {
          const errorText = await response.text();
          throw new Error(`Erreur HTTP ${response.status}: ${errorText || "Erreur serveur"}`);
        }
      }
    } catch (err) {
      console.error("Erreur lors de la recuperation du lot par EPC:", err);
      setSnackbarMessage(`Erreur serveur lors de la recuperation du lot: ${err.message}`);
      setSnackbarOpen(true);
    }
  };

  const handleSave = async () => {
    if (!scannedEpc) return;

    try {
      const token = localStorage.getItem("token");
      // Convertir scanTime (heure locale Tunisia) en UTC en soustrayant l'offset
      const date = new Date(scanTime);
      const utcTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60 * 1000)).toISOString();

      let lotId;
      if (selectedLot) {
        const response = await fetch(`http://localhost:5000/api/lots/prepare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lot_id: selectedLot.lot_id,
            temps_debut: utcTime, // Envoyer l'heure en UTC
            epc: scannedEpc,
            chaine_id: selectedLot.chaine_id,
            couleur: lotColor,
            taille: lotSize,
          }),
        });
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${await response.text()}`);
        }
        const data = await response.json();
        lotId = data.lot_id;
        setSnackbarMessage(`Lot ${formatId(lotId)} préparé avec succès !`);
        setSnackbarOpen(true);
      } else {
        const response = await fetch(`http://localhost:5000/api/lots`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            epc: scannedEpc,
            temps_debut: utcTime, // Envoyer l'heure en UTC
            chaine_id: chaineId,
            couleur: lotColor,
            taille: lotSize,
            statut: "en attente",
          }),
        });
        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${await response.text()}`);
        }
        const data = await response.json();
        lotId = data.lot_id;
        setSnackbarMessage(`Nouveau lot ${formatId(lotId)} créé avec succès !`);
        setSnackbarOpen(true);
      }

      setCurrentLotId(lotId);
      await fetchJeansForLot(lotId);
      await fetchLotsAndChain();
      setOpenJeansScanModal(true);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
      setSnackbarMessage(`Erreur serveur lors de la sauvegarde: ${err.message}`);
      setSnackbarOpen(true);
    }

    setOpenDetailsModal(false);
    setSelectedLot(null);
    setScannedEpc("");
    setScanTime(null);
    setLotColor("");
    setLotSize("");
  };

  const handleScanJean = async (epc) => {
    if (!currentLotId) return;

    const cleanedEpc = epc.trim().toUpperCase();
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/jeans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          epc: cleanedEpc,
          lot_id: currentLotId,
          chaine_id: chaineId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${await response.text() || "Erreur serveur"}`);
      }
      const data = await response.json();
      const updatedScannedJeans = [...scannedJeans, cleanedEpc];
      setScannedJeans(updatedScannedJeans);
      await fetchLotsAndChain();
      setSnackbarMessage(`Jean ${formatId(data.jean_id)} ajouté ! (${updatedScannedJeans.length} jeans scannés)`);
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Erreur lors de l'ajout du jean:", err);
      setSnackbarMessage(`Erreur serveur lors de l'ajout du jean: ${err.message}`);
      setSnackbarOpen(true);
    }
  };

  const handleRemoveJean = async (epcToRemove) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/jeans`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ epc: epcToRemove }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${await response.text() || "Erreur serveur"}`);
      }

      const updatedScannedJeans = scannedJeans.filter((epc) => epc !== epcToRemove);
      setScannedJeans(updatedScannedJeans);
      await fetchLotsAndChain();
      setSnackbarMessage(`Jean avec EPC ${epcToRemove} supprimé. (${updatedScannedJeans.length} jeans restants)`);
      setSnackbarOpen(true);
    } catch (err) {
      console.error("Erreur lors de la suppression du jean:", err);
      setSnackbarMessage(`Erreur serveur lors de la suppression du jean: ${err.message}`);
      setSnackbarOpen(true);
    }
  };

  const handleCloseDetailsModal = () => {
    setOpenDetailsModal(false);
    setSelectedLot(null);
    setScannedEpc("");
    setScanTime(null);
    setLotColor("");
    setLotSize("");
  };

  const handleCloseJeansScanModal = () => {
    setOpenJeansScanModal(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const getStatusColor = (status) => {
    const normalizedStatus = status ? status.toLowerCase() : "en attente";
    const safeColors = colors || {};
    const safeGreen = safeColors.greenAccent?.[500] || "#4caf50";
    const safeBlue = safeColors.blueAccent?.[500] || "#2196f3";
    const safeOrange = safeColors.orangeAccent?.[500] || "#ff9800";
    const safeGrey = safeColors.grey?.[500] || "#9e9e9e";
    switch (normalizedStatus) {
      case "en cours":
        return safeGreen;
      case "termine":
        return safeBlue;
      case "en attente":
        return safeOrange;
      default:
        return safeGrey;
    }
  };

  const formatStatusText = (status) => {
    if (!status) return "En attente";
    return status.toLowerCase() === "en cours"
      ? "En cours"
      : status.toLowerCase() === "termine"
      ? "Terminé"
      : "En attente";
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return formatInTimeZone(new Date(dateString), 'Africa/Tunis', "dd/MM/yyyy HH:mm:ss");
  };

  const formatId = (id) => {
    if (!id) return "N/A";
    return id;
  };

  useEffect(() => {
    let buffer = "";
    const modifierKeys = ["Shift", "Control", "Alt", "Meta"];

    const handleKeyDown = (event) => {
      if (modifierKeys.includes(event.key)) {
        return;
      }

      if (event.key === "Enter") {
        if (buffer.trim()) {
          console.log("Buffer brut avant conversion:", buffer.trim());
          const cleanedBuffer = buffer.trim().toUpperCase();

          if (!cleanedBuffer) {
            setSnackbarMessage("Erreur : EPC invalide (aucun caractère détecté).");
            setSnackbarOpen(true);
            buffer = "";
            return;
          }

          let finalEpc = cleanedBuffer;
          if (cleanedBuffer.length !== 24) {
            console.warn("EPC de longueur incorrecte:", cleanedBuffer.length, "caractères. Utilisé tel quel.");
          }

          console.log("EPC final:", finalEpc);
          if (openJeansScanModal) {
            handleScanJean(finalEpc);
          } else {
            handleScanLot(finalEpc);
            setSnackbarMessage(`Tag scanné : ${finalEpc}`);
            setSnackbarOpen(true);
          }
          buffer = "";
        }
      } else {
        buffer += event.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openJeansScanModal, currentLotId, scannedJeans]);

  const columns = [
    {
      field: "lot_id",
      headerName: "ID du Lot",
      flex: 1,
      minWidth: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => formatId(params.value),
    },
    { field: "epc", headerName: "EPC", flex: 1, minWidth: 200, headerAlign: "center", align: "center" },
    {
      field: "statut",
      headerName: "Statut",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap="8px" justifyContent="center">
          <Box sx={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: getStatusColor(params.value) }} />
          <Typography color={getStatusColor(params.value)} fontWeight="bold">
            {formatStatusText(params.value)}
          </Typography>
        </Box>
      ),
      headerAlign: "center",
      align: "center",
    },
    { field: "couleur", headerName: "Couleur", flex: 1, minWidth: 150, headerAlign: "center", align: "center" },
    { field: "taille", headerName: "Taille", flex: 1, minWidth: 150, headerAlign: "center", align: "center" },
    {
      field: "quantite_initiale",
      headerName: "Quantité Détectée",
      flex: 1,
      minWidth: 150,
      type: "number",
      headerAlign: "center",
      align: "center",
      renderCell: (params) => {
        const lot = lots.find((l) => l.lot_id === params.id);
        return lot ? lot.quantite_initiale || 0 : 0;
      },
    },
    {
      field: "temps_debut",
      headerName: "Date et Heure de Début",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => formatDateTime(params.value),
      headerAlign: "center",
      align: "center",
    },
  ];

  const rows = lots.map((lot) => ({
    id: lot.lot_id,
    ...lot,
  }));

  return (
    <Box m="20px">
      <Header title={`PRÉPARATION DES LOTS - ${chainName}`} subtitle={`${operatorNom} ${operatorPrenom}`} />
      {rows.length === 0 ? (
        <Typography variant="h5" color={colors.grey?.[100]} sx={{ padding: "20px" }}>
          Aucun lot trouvé pour votre chaîne.
        </Typography>
      ) : (
        <Box
          m="40px 0 0 0"
          height="75vh"
          sx={{
            "& .MuiDataGrid-root": { border: "none", borderRadius: "8px", boxShadow: `0 4px 8px ${colors.primary?.[900] || "#1a202c"}` },
            "& .MuiDataGrid-cell": { borderBottom: "none", padding: "0 8px", color: colors.grey?.[100] || "#e0e0e0", fontSize: "14px" },
            "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent?.[700] || "#1976d2", borderBottom: `2px solid ${colors.grey?.[700] || "#b0b0b0"}`, padding: "8px 0" },
            "& .MuiDataGrid-columnHeader": { padding: "0 16px", borderRight: `1px solid ${colors.grey?.[700] || "#b0b0b0"}`, "&:last-child": { borderRight: "none" } },
            "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold", fontSize: "16px", color: colors.grey?.[100] || "#e0e0e0", whiteSpace: "normal", lineHeight: "1.2", textAlign: "center" },
            "& .MuiDataGrid-columnSeparator": { display: "none" },
            "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary?.[400] || "#2d3748" },
            "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent?.[700] || "#1976d2" },
            "& .MuiCheckbox-root": { color: `${colors.greenAccent?.[200] || "#66bb6a"} !important` },
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            pageSizeOptions={[10, 20, 50]}
            autoHeight
            sx={{ cursor: "pointer" }}
          />
        </Box>
      )}

      <Dialog open={openDetailsModal} onClose={handleCloseDetailsModal}>
        <DialogTitle sx={{ backgroundColor: colors.primary?.[700], color: colors.grey?.[100], padding: "16px 24px", fontSize: "1.5rem", fontWeight: "bold" }}>
          Détails du Lot {selectedLot ? formatId(selectedLot.lot_id) : "Nouveau"}
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: colors.primary?.[600], padding: "20px" }}>
          <Box sx={{ maxWidth: "600px", margin: "0 auto", padding: "10px" }}>
            <Typography variant="h6" color={colors.grey?.[100]} sx={{ fontWeight: "500", mb: 3, textAlign: "center", letterSpacing: "0.5px" }}>
              Informations du Lot
            </Typography>
            <TextField
              fullWidth
              margin="normal"
              label="ID du Tag (EPC)"
              value={scannedEpc}
              InputProps={{
                readOnly: true,
                sx: { color: colors.grey?.[100] },
              }}
              InputLabelProps={{ style: { color: colors.grey?.[300] } }}
              sx={{
                "& .MuiInputBase-input": { color: colors.grey?.[100] },
                "& .MuiInputLabel-root": { color: colors.grey?.[300] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey?.[500] },
                  "&:hover fieldset": { borderColor: colors.grey?.[300] },
                  "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                },
              }}
            />
            {selectedLot && (
              <TextField
                fullWidth
                margin="normal"
                label="ID du Lot"
                value={formatId(selectedLot.lot_id)}
                InputProps={{
                  readOnly: true,
                  sx: { color: colors.grey?.[100] },
                }}
                InputLabelProps={{ style: { color: colors.grey?.[300] } }}
                sx={{
                  "& .MuiInputBase-input": { color: colors.grey?.[100] },
                  "& .MuiInputLabel-root": { color: colors.grey?.[300] },
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: colors.grey?.[500] },
                    "&:hover fieldset": { borderColor: colors.grey?.[300] },
                    "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                  },
                }}
              />
            )}
            <TextField
              fullWidth
              margin="normal"
              label="Date et Heure de Début"
              type="datetime-local"
              value={scanTime || ""}
              onChange={(e) => setScanTime(e.target.value)}
              InputLabelProps={{ shrink: true, style: { color: colors.grey?.[300] } }}
              sx={{
                "& .MuiInputBase-input": { color: colors.grey?.[100] },
                "& .MuiInputLabel-root": { color: colors.grey?.[300] },
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
              label="Couleur"
              value={lotColor}
              onChange={(e) => setLotColor(e.target.value)}
              InputLabelProps={{ style: { color: colors.grey?.[300] } }}
              sx={{
                "& .MuiInputBase-input": { color: colors.grey?.[100] },
                "& .MuiInputLabel-root": { color: colors.grey?.[300] },
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
              label="Taille"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              InputLabelProps={{ style: { color: colors.grey?.[300] } }}
              sx={{
                "& .MuiInputBase-input": { color: colors.grey?.[100] },
                "& .MuiInputLabel-root": { color: colors.grey?.[300] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey?.[500] },
                  "&:hover fieldset": { borderColor: colors.grey?.[300] },
                  "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: colors.primary?.[700], padding: "10px 20px" }}>
          <Button
            onClick={handleCloseDetailsModal}
            startIcon={<CancelIcon />}
            sx={{
              backgroundColor: colors.redAccent?.[600],
              color: colors.grey?.[100],
              padding: "8px 16px",
              borderRadius: "8px",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: colors.redAccent?.[700],
                transform: "translateY(-2px)",
              },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            startIcon={<SaveIcon />}
            sx={{
              backgroundColor: colors.greenAccent?.[600],
              color: colors.grey?.[100],
              padding: "8px 16px",
              borderRadius: "8px",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: colors.greenAccent?.[700],
                transform: "translateY(-2px)",
              },
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openJeansScanModal} onClose={handleCloseJeansScanModal} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: colors.grey?.[100],
            backgroundColor: colors.primary?.[700],
            borderBottom: `2px solid ${colors.grey?.[700]}`,
            p: 2,
          }}
        >
          Scanner les Jeans pour le Lot {currentLotId ? formatId(currentLotId) : ""}
        </DialogTitle>
        <DialogContent sx={{ p: 3, backgroundColor: colors.primary?.[600] }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" color={colors.grey?.[100]} sx={{ mb: 1 }}>
              Progression : {scannedJeans.length} jeans scannés
            </Typography>
            <LinearProgress
              variant="determinate"
              value={(scannedJeans.length / 50) * 100}
              sx={{
                height: 10,
                borderRadius: 5,
                backgroundColor: colors.grey?.[700],
                "& .MuiLinearProgress-bar": { backgroundColor: colors.greenAccent?.[500] },
              }}
            />
          </Box>
          <Box display="flex" justifyContent="space-between" mb="20px">
            <Typography variant="body1" color={colors.grey?.[100]}>
              Scannez chaque jean avec votre lecteur RFID.
            </Typography>
          </Box>
          {scannedJeans.length > 0 && (
            <Box sx={{ maxHeight: "300px", overflowY: "auto", mb: 2 }}>
              {scannedJeans.map((epc, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    p: 1.5,
                    mb: 1,
                    borderRadius: 8,
                    backgroundColor: colors.primary?.[500],
                    boxShadow: `0 2px 4px ${colors.primary?.[900]}`,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: colors.primary?.[600],
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <Typography color={colors.grey?.[100]}>Jean {index + 1}: {epc}</Typography>
                  <IconButton
                    onClick={() => handleRemoveJean(epc)}
                    sx={{ color: colors.redAccent?.[500], "&:hover": { color: colors.redAccent?.[700] } }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
          {scannedJeans.length === 0 && (
            <Typography color={colors.grey?.[300]} sx={{ textAlign: "center", py: 2 }}>
              Aucun jean scanné pour ce lot.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: colors.primary?.[700], borderTop: `2px solid ${colors.grey?.[700]}` }}>
          <Button onClick={handleCloseJeansScanModal} sx={{ color: colors.greenAccent?.[500] }}>
            Terminer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarMessage.includes("Erreur") ? "error" : "success"}>{snackbarMessage}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MyTasks;