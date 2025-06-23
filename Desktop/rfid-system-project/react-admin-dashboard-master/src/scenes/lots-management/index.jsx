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
import { formatInTimeZone } from "date-fns-tz";

const LotsManagement = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode) || {};
  const [lots, setLots] = useState([]);
  const [ouvriers, setOuvriers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [jeans, setJeans] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [scannedEpc, setScannedEpc] = useState("");
  const [scannedQuantity, setScannedQuantity] = useState("");
  const [finalQuantity, setFinalQuantity] = useState("");
  const [defectiveJeans, setDefectiveJeans] = useState("");
  const [lotColor, setLotColor] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [selectedOuvrierNom, setSelectedOuvrierNom] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [tempsDebutTravail, setTempsDebutTravail] = useState(null);
  const [tempsFin, setTempsFin] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [chainName, setChainName] = useState("Chaine inconnue");

  const responsableNom = localStorage.getItem("nom") || "";
  const responsablePrenom = localStorage.getItem("prenom") || "";
  const chaineId = localStorage.getItem("chaine_id");

  useEffect(() => {
    console.log("Etat lots mis a jour:", lots);
  }, [lots]);

  const fetchLotsAndChain = async () => {
    const token = localStorage.getItem("token");
    if (!chaineId) {
      setSnackbarMessage("Erreur : Aucune chaine associee a votre compte.");
      setSnackbarOpen(true);
      return;
    }
    try {
      const lotsResponse = await fetch(`http://localhost:5000/api/lots?chaine_id=${chaineId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      });
      const lotsData = await lotsResponse.json();
      if (lotsResponse.ok) {
        const validLots = lotsData.filter((lot) => lot.lot_id);
        setLots(validLots.sort((a, b) => a.lot_id.localeCompare(b.lot_id)));
      } else {
        setSnackbarMessage(`Erreur lors de la recuperation des lots: ${lotsData.error}`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      setSnackbarMessage("Erreur serveur lors de la recuperation des lots: " + err.message);
      setSnackbarOpen(true);
    }
    try {
      const ouvriersResponse = await fetch(`http://localhost:5000/api/ouvriers?chaine_id=${chaineId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      });
      const ouvriersData = await ouvriersResponse.json();
      if (ouvriersResponse.ok) {
        setOuvriers(ouvriersData);
      } else {
        setSnackbarMessage(`Erreur lors de la recuperation des ouvriers: ${ouvriersData.error}`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      setSnackbarMessage("Erreur serveur lors de la recuperation des ouvriers: " + err.message);
      setSnackbarOpen(true);
    }
    try {
      const machinesResponse = await fetch(`http://localhost:5000/api/machines?chaine_id=${chaineId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      });
      const machinesData = await machinesResponse.json();
      if (machinesResponse.ok) {
        setMachines(machinesData);
      } else {
        setSnackbarMessage(`Erreur lors de la recuperation des machines: ${machinesData.error}`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      setSnackbarMessage("Erreur serveur lors de la recuperation des machines: " + err.message);
      setSnackbarOpen(true);
    }
    try {
      const chainResponse = await fetch(`http://localhost:5000/api/chaines/${chaineId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      });
      const chainData = await chainResponse.json();
      if (chainResponse.ok) {
        setChainName(chainData.nom_chaine || "Chaine inconnue");
      } else {
        setChainName("Chaine inconnue");
        setSnackbarMessage(`Erreur lors de la recuperation du nom de la chaine: ${chainData.error}`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      setChainName("Chaine inconnue");
      setSnackbarMessage("Erreur serveur lors de la recuperation du nom de la chaine: " + err.message);
      setSnackbarOpen(true);
    }
    try {
      const jeansResponse = await fetch(`http://localhost:5000/api/jeans?chaine_id=${chaineId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      });
      const jeansData = await jeansResponse.json();
      if (jeansResponse.ok) {
        setJeans(jeansData);
      } else {
        setSnackbarMessage(`Erreur lors de la recuperation des jeans: ${jeansData.error}`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      setSnackbarMessage("Erreur serveur lors de la recuperation des jeans: " + err.message);
      setSnackbarOpen(true);
    }
  };

  useEffect(() => {
    if (chaineId) {
      fetchLotsAndChain();
      const intervalId = setInterval(fetchLotsAndChain, 10000);
      return () => clearInterval(intervalId);
    }
  }, [chaineId]);

  const fetchLotHistoryData = async (lotId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/lot-history/${lotId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      });
      const data = await response.json();
      if (response.ok && data.length > 0) {
        return {
          quantite_initiale: data[0].quantite_initiale || "0",
          quantite_finale: data[0].quantite_finale || "0",
          defectiveJeans: data[0].jeans_defectueux || "0",
        };
      }
      return null;
    } catch (err) {
      console.error("Erreur lors de la recuperation de lot_history:", err);
      return null;
    }
  };

  const handleScanLot = async (epc) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/lots/by-epc?epc=${epc}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      });
      const lot = await response.json();
      if (response.ok) {
        if (lot.chaine_id !== chaineId) {
          setSnackbarMessage("Erreur : Ce lot n'appartient pas a votre chaine.");
          setSnackbarOpen(true);
          return;
        }
        setSelectedLot(lot);
        setScannedEpc(epc);
        setScannedQuantity(lot.quantite_initiale || "0");
        setFinalQuantity(lot.quantite_finale || "0");
        setDefectiveJeans(lot.jeans_defectueux || "0");
        setLotColor(lot.couleur || "");
        setLotSize(lot.taille || "");
        setSelectedOuvrierNom(lot.ouvrier_nom || "");
        const currentStatus = lot.statut || "en attente";
        setSelectedStatus(currentStatus);
        setTempsDebutTravail(
          lot.temps_debut_travail
            ? formatInTimeZone(new Date(lot.temps_debut_travail), 'Africa/Tunis', "yyyy-MM-dd'T'HH:mm")
            : null
        );
        setTempsFin(
          lot.temps_fin
            ? formatInTimeZone(new Date(lot.temps_fin), 'Africa/Tunis', "yyyy-MM-dd'T'HH:mm")
            : null
        );
        if (currentStatus === "termine" || !lot.quantite_initiale || !lot.quantite_finale) {
          const historyData = await fetchLotHistoryData(lot.lot_id);
          if (historyData) {
            setScannedQuantity(historyData.quantite_initiale);
            setFinalQuantity(historyData.quantite_finale);
            setDefectiveJeans(historyData.defectiveJeans);
          }
        }
        setOpenDetailsModal(true);
      } else {
        setSnackbarMessage(`Erreur : Lot non trouve pour EPC ${epc}.`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      setSnackbarMessage("Erreur serveur lors de la recuperation du lot: " + err.message);
      setSnackbarOpen(true);
    }
  };

  const handleRowClick = async (params) => {
    const lot = lots.find((l) => l.lot_id === params.row.lot_id);
    if (lot) {
      setSelectedLot(lot);
      setScannedEpc(lot.epc || "");
      setScannedQuantity(lot.quantite_initiale || "0");
      setFinalQuantity(lot.quantite_finale || "0");
      setDefectiveJeans(lot.jeans_defectueux || "0");
      setLotColor(lot.couleur || "");
      setLotSize(lot.taille || "");
      setSelectedOuvrierNom(lot.ouvrier_nom || "");
      const currentStatus = lot.statut || "en attente";
      setSelectedStatus(currentStatus);
      setTempsDebutTravail(
        lot.temps_debut_travail
          ? formatInTimeZone(new Date(lot.temps_debut_travail), 'Africa/Tunis', "yyyy-MM-dd'T'HH:mm")
          : null
      );
      setTempsFin(
        lot.temps_fin
          ? formatInTimeZone(new Date(lot.temps_fin), 'Africa/Tunis', "yyyy-MM-dd'T'HH:mm")
          : null
      );
      if (currentStatus === "termine" || !lot.quantite_initiale || !lot.quantite_finale) {
        const historyData = await fetchLotHistoryData(lot.lot_id);
        if (historyData) {
          setScannedQuantity(historyData.quantite_initiale);
          setFinalQuantity(historyData.quantite_finale);
          setDefectiveJeans(historyData.defectiveJeans);
        }
      }
      setOpenDetailsModal(true);
    }
  };

  const handleSave = async () => {
    if (!selectedLot) {
      setSnackbarMessage("Erreur : Aucun lot selectionne.");
      setSnackbarOpen(true);
      return;
    }
    if (!selectedStatus || !selectedOuvrierNom) {
      setSnackbarMessage("Erreur : Les champs Statut et Selectionner un ouvrier sont obligatoires.");
      setSnackbarOpen(true);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const selectedOuvrier = ouvriers.find((ouvrier) => `${ouvrier.nom} ${ouvrier.prenom}` === selectedOuvrierNom);
      const localisation = selectedOuvrier ? selectedOuvrier.localisation : selectedLot.localisation || "Non defini";

      const finalStatus = selectedStatus === "en attente" && selectedOuvrierNom ? "en cours" : selectedStatus;

      const utcTempsDebutTravail = tempsDebutTravail
        ? new Date(new Date(tempsDebutTravail).getTime() - (new Date().getTimezoneOffset() * 60 * 1000)).toISOString()
        : (finalStatus === "en cours" && !selectedLot.temps_debut_travail
          ? new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60 * 1000)).toISOString()
          : selectedLot.temps_debut_travail);

      const utcTempsFin = tempsFin
        ? new Date(new Date(tempsFin).getTime() - (new Date().getTimezoneOffset() * 60 * 1000)).toISOString()
        : (finalStatus === "termine" && !selectedLot.temps_fin
          ? new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60 * 1000)).toISOString()
          : selectedLot.temps_fin);

      const updatedLot = {
        couleur: lotColor,
        taille: lotSize,
        ouvrier_nom: selectedOuvrierNom,
        localisation: localisation,
        statut: finalStatus,
        chaine_id: selectedLot.chaine_id,
        quantite_finale: finalQuantity || (finalStatus.toLowerCase() === "termine" ? Math.max(0, parseInt(scannedQuantity, 10) - parseInt(defectiveJeans, 10) || 0) : ""),
        temps_debut_travail: utcTempsDebutTravail,
        temps_fin: utcTempsFin,
      };
      const response = await fetch(`http://localhost:5000/api/lots/${selectedLot.lot_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatedLot),
      });
      const result = await response.json();
      if (response.ok) {
        await fetchLotsAndChain();
        setSnackbarMessage(`Lot ${selectedLot.lot_id} mis a jour avec succes !`);
        setSnackbarOpen(true);
        if (result.lot) {
          setScannedQuantity(result.lot.quantite_initiale || "0");
          setFinalQuantity(result.lot.quantite_finale || "0");
          setDefectiveJeans(result.lot.jeans_defectueux || "0");
        }
      } else {
        setSnackbarMessage(`Erreur lors de la mise a jour du lot: ${result.error || result.details}`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      setSnackbarMessage("Erreur serveur lors de la sauvegarde: " + err.message);
      setSnackbarOpen(true);
    }
    setOpenDetailsModal(false);
    setSelectedLot(null);
    setScannedEpc("");
    setScannedQuantity("");
    setFinalQuantity("");
    setDefectiveJeans("");
    setLotColor("");
    setLotSize("");
    setSelectedOuvrierNom("");
    setSelectedStatus("");
    setTempsDebutTravail(null);
    setTempsFin(null);
  };

  const handleRemoveAssignment = async () => {
    if (!selectedLot) {
      setSnackbarMessage("Erreur : Aucun lot selectionne.");
      setSnackbarOpen(true);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/lots/${selectedLot.lot_id}/remove-assignment`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
      });
      if (response.ok) {
        await fetchLotsAndChain();
        setSnackbarMessage(`Assignation du lot ${selectedLot.lot_id} supprimee avec succes !`);
        setSnackbarOpen(true);
        handleCloseDetailsModal();
      } else {
        const errorData = await response.json();
        setSnackbarMessage(`Erreur lors de la suppression de l'assignation: ${errorData.error || errorData.details}`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      setSnackbarMessage("Erreur serveur lors de la suppression de l'assignation: " + err.message);
      setSnackbarOpen(true);
    }
  };

  const handleCloseDetailsModal = () => {
    setOpenDetailsModal(false);
    setSelectedLot(null);
    setScannedEpc("");
    setScannedQuantity("");
    setFinalQuantity("");
    setDefectiveJeans("");
    setLotColor("");
    setLotSize("");
    setSelectedOuvrierNom("");
    setSelectedStatus("");
    setTempsDebutTravail(null);
    setTempsFin(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const getStatusColor = (status) => {
    const normalizedStatus = status?.toLowerCase() || "en attente";
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
    const normalizedStatus = status?.toLowerCase() || "en attente";
    return normalizedStatus === "en cours"
      ? "En cours"
      : normalizedStatus === "termine"
      ? "Terminé"
      : "En attente";
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    return formatInTimeZone(new Date(dateString), 'Africa/Tunis', "dd/MM/yyyy HH:mm:ss");
  };

  const getMachineForLot = (lot) => lot.localisation || "N/A";

  const getOuvrierLocalisation = (ouvrierNom) => {
    const ouvrier = ouvriers.find((o) => `${o.nom} ${o.prenom}` === ouvrierNom);
    return ouvrier ? ouvrier.localisation : selectedLot?.localisation || "Non défini";
  };

  const getAvailableStatuses = () => {
    if (!selectedLot) return ["en attente", "en cours", "termine"];
    const currentStatus = selectedLot.statut?.toLowerCase() || "en attente";
    if (currentStatus === "termine") {
      return [currentStatus];
    } else if (currentStatus === "en cours") {
      return [currentStatus, "termine"];
    } else if (currentStatus === "en attente") {
      return [currentStatus, "en cours"];
    }
    return ["en attente", "en cours", "termine"];
  };

  const getAvailableOuvriersForDropdown = () => {
    const availableOuvriers = [...ouvriers];
    if (selectedLot && selectedLot.ouvrier_nom) {
      const currentOuvrier = ouvriers.find((o) => `${o.nom} ${o.prenom}` === selectedLot.ouvrier_nom);
      if (!currentOuvrier) {
        const fetchCurrentOuvrier = async () => {
          try {
            const token = localStorage.getItem("token");
            const [nom, prenom] = selectedLot.ouvrier_nom.split(" ");
            const response = await fetch(`http://localhost:5000/api/ouvriers?chaine_id=${chaineId}`, {
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
            });
            const allOuvriers = await response.json();
            const ouvrier = allOuvriers.find((o) => o.nom === nom && o.prenom === prenom);
            if (ouvrier) {
              availableOuvriers.push(ouvrier);
            }
          } catch (err) {
            console.error("Erreur lors de la recuperation de l'ouvrier actuel:", err);
          }
        };
        fetchCurrentOuvrier();
      }
    }
    return availableOuvriers.sort((a, b) => a.nom.localeCompare(b.nom));
  };

  useEffect(() => {
    if (selectedStatus.toLowerCase() === "termine") {
      const calculatedFinal = Math.max(0, parseInt(scannedQuantity, 10) - parseInt(defectiveJeans, 10) || 0);
      setFinalQuantity(calculatedFinal.toString());
    } else {
      setFinalQuantity("");
    }
  }, [selectedStatus, scannedQuantity, defectiveJeans]);

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
          const cleanedEpc = buffer.trim().toUpperCase();

          if (!cleanedEpc) {
            setSnackbarMessage("Erreur : EPC invalide (aucun caractère détecté).");
            setSnackbarOpen(true);
            buffer = "";
            return;
          }

          let finalEpc = cleanedEpc;
          if (cleanedEpc.length !== 24) {
            console.warn("EPC de longueur incorrecte:", cleanedEpc.length, "caractères. Utilisé tel quel.");
          }

          console.log("EPC final:", finalEpc);
          handleScanLot(finalEpc);
          setSnackbarMessage(`Tag scanné : ${finalEpc}`);
          setSnackbarOpen(true);
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
  }, []);

  const columns = [
    { field: "lot_id", headerName: "ID Lot", flex: 1, minWidth: 150, headerAlign: "center", align: "center" },
    { field: "epc", headerName: "EPC", flex: 1, minWidth: 150, valueGetter: (params) => params.row.epc || "N/A", headerAlign: "center", align: "center" },
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
    { field: "localisation", headerName: "Localisation", flex: 1, minWidth: 150, valueGetter: (params) => getMachineForLot(params.row), headerAlign: "center", align: "center" },
    { field: "ouvrier_nom", headerName: "Nom de l'Ouvrier", flex: 1, minWidth: 150, valueGetter: (params) => params.row.ouvrier_nom || "Non assigné", headerAlign: "center", align: "center" },
  ];

  const rows = lots.map((lot) => ({
    id: lot.lot_id,
    ...lot,
  }));

  return (
    <Box m="20px">
      <Header title={`GESTION DES LOTS - ${chainName}`} subtitle={`${responsableNom} ${responsablePrenom}`} />
      {rows.length === 0 ? (
        <Typography variant="h5" color={colors.grey?.[100] || "#e0e0e0"} sx={{ padding: "20px" }}>
          Aucun lot trouve pour votre chaine.
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
            onRowClick={handleRowClick}
            sx={{ cursor: "pointer" }}
          />
        </Box>
      )}

      <Dialog open={openDetailsModal} onClose={handleCloseDetailsModal} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ backgroundColor: colors.primary?.[700], color: colors.grey?.[100], padding: "16px 24px", fontSize: "1.5rem", fontWeight: "bold" }}>
          Détails du Lot {selectedLot ? selectedLot.lot_id : "Nouveau"}
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: colors.primary?.[600], padding: "20px" }}>
          {selectedLot && (
            <Box sx={{ maxWidth: "1600px", margin: "0 auto", padding: "10px" }}>
              <Typography variant="h6" color={colors.grey?.[100]} sx={{ fontWeight: "500", mb: 3, textAlign: "center", letterSpacing: "0.5px" }}>
                Informations du Lot
              </Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(4, 1fr)" }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="ID du Lot"
                  value={selectedLot.lot_id || ""}
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
                  label="ID du Tag (EPC)"
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
                <TextField
                  fullWidth
                  margin="normal"
                  label="Couleur"
                  value={lotColor}
                  onChange={(e) => setLotColor(e.target.value)}
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
                  label="Taille"
                  value={lotSize}
                  onChange={(e) => setLotSize(e.target.value)}
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
                  label="Quantité Initiale"
                  type="number"
                  value={scannedQuantity}
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
                {selectedStatus.toLowerCase() === "termine" && (
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Quantité Finale"
                    type="number"
                    value={finalQuantity}
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
                )}
                <TextField
                  fullWidth
                  margin="normal"
                  label="Jeans Défectueux"
                  type="number"
                  value={defectiveJeans}
                  InputProps={{ readOnly: true, sx: { color: colors.grey?.[100] } }}
                  InputLabelProps={{ style: { color: colors.grey?.[300] } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: colors.grey?.[500] },
                      "&:hover fieldset": { borderColor: colors.grey?.[300] },
                      "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                      "& .MuiInputBase-input": { color: colors.grey?.[100] },
                    },
                  }}
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Date de Création du Lot"
                  value={formatDateTime(selectedLot.temps_debut)}
                  InputProps={{ readOnly: true, sx: { color: colors.grey?.[100] } }}
                  InputLabelProps={{ style: { color: colors.grey?.[300] } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: colors.grey?.[500] },
                      "&:hover fieldset": { borderColor: colors.grey?.[300] },
                      "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                      "& .MuiInputBase-input": { color: colors.grey?.[100] },
                    },
                  }}
                />
                <TextField
                  fullWidth
                  margin="normal"
                  label="Début du Travail de l'Ouvrier"
                  type="datetime-local"
                  value={tempsDebutTravail || ""}
                  onChange={(e) => setTempsDebutTravail(e.target.value)}
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
                  label="Fin du Travail de l'Ouvrier"
                  type="datetime-local"
                  value={tempsFin || ""}
                  onChange={(e) => setTempsFin(e.target.value)}
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
              </Box>
              <Typography variant="h6" color={colors.grey?.[100]} sx={{ fontWeight: "500", mt: 3, mb: 2, textAlign: "center", letterSpacing: "0.5px" }}>
                Assignations
              </Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(4, 1fr)" }}>
                <TextField
                  fullWidth
                  margin="normal"
                  label="Localisation de l'Ouvrier"
                  value={getOuvrierLocalisation(selectedOuvrierNom || selectedLot.ouvrier_nom)}
                  InputProps={{ readOnly: true, sx: { color: colors.grey?.[100] } }}
                  InputLabelProps={{ style: { color: colors.grey?.[300] } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: colors.grey?.[500] },
                      "&:hover fieldset": { borderColor: colors.grey?.[300] },
                      "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                      "& .MuiInputBase-input": { color: colors.grey?.[100] },
                    },
                  }}
                />
                {selectedStatus.toLowerCase() === "termine" || (selectedStatus.toLowerCase() === "en cours" && selectedOuvrierNom) ? (
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Ouvrier Assigné"
                    value={selectedOuvrierNom || "Aucun"}
                    InputProps={{ readOnly: true, sx: { color: colors.grey?.[100] } }}
                    InputLabelProps={{ style: { color: colors.grey?.[300] } }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: colors.grey?.[500] },
                        "&:hover fieldset": { borderColor: colors.grey?.[300] },
                        "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                        "& .MuiInputBase-input": { color: colors.grey?.[100] },
                      },
                    }}
                  />
                ) : (
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel id="ouvrier-select-label" style={{ color: colors.grey?.[300] }}>Sélectionner un Ouvrier</InputLabel>
                    <Select
                      labelId="ouvrier-select-label"
                      value={selectedOuvrierNom}
                      onChange={(e) => setSelectedOuvrierNom(e.target.value)}
                      label="Sélectionner un Ouvrier"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: colors.grey?.[500] },
                          "&:hover fieldset": { borderColor: colors.grey?.[300] },
                          "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                        },
                        "& .MuiSelect-select": { color: colors.grey?.[100] },
                      }}
                    >
                      <MenuItem value="">Aucun</MenuItem>
                      {getAvailableOuvriersForDropdown().map((ouvrier) => (
                        <MenuItem
                          key={ouvrier.ouvrier_id}
                          value={`${ouvrier.nom} ${ouvrier.prenom}`}
                          sx={{ color: colors.grey?.[100] }}
                        >
                          {ouvrier.nom} {ouvrier.prenom} - {ouvrier.localisation}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
              <Typography variant="h6" color={colors.grey?.[100]} sx={{ fontWeight: "500", mt: 3, mb: 2, textAlign: "center", letterSpacing: "0.5px" }}>
                Statut
              </Typography>
              <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(4, 1fr)" }}>
                {selectedStatus.toLowerCase() === "termine" ? (
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Statut"
                    value={formatStatusText(selectedStatus)}
                    InputProps={{ readOnly: true, sx: { color: colors.grey?.[100] } }}
                    InputLabelProps={{ style: { color: colors.grey?.[300] } }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: colors.grey?.[500] },
                        "&:hover fieldset": { borderColor: colors.grey?.[300] },
                        "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                        "& .MuiInputBase-input": { color: colors.grey?.[100] },
                      },
                    }}
                  />
                ) : (
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel id="status-select-label" style={{ color: colors.grey?.[300] }}>Statut</InputLabel>
                    <Select
                      labelId="status-select-label"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      label="Statut"
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          "& fieldset": { borderColor: colors.grey?.[500] },
                          "&:hover fieldset": { borderColor: colors.grey?.[300] },
                          "&.Mui-focused fieldset": { borderColor: colors.greenAccent?.[500] },
                        },
                        "& .MuiSelect-select": { color: colors.grey?.[100] },
                      }}
                    >
                      {getAvailableStatuses().map((status) => (
                        <MenuItem key={status} value={status} sx={{ color: colors.grey?.[100] }}>
                          {formatStatusText(status)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ backgroundColor: colors.primary?.[700], padding: "10px 20px", borderTop: `2px solid ${colors.grey?.[700]}` }}>
          <Button
            onClick={handleCloseDetailsModal}
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
          {selectedOuvrierNom && selectedStatus.toLowerCase() !== "termine" && (
            <Button
              onClick={handleRemoveAssignment}
              sx={{
                backgroundColor: colors.redAccent?.[600],
                color: colors.grey?.[100],
                padding: "8px 16px",
                borderRadius: "8px",
                "&:hover": { backgroundColor: colors.redAccent?.[700], transform: "translateY(-2px)" },
              }}
            >
              Supprimer l'Assignation
            </Button>
          )}
          <Button
            onClick={handleSave}
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

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarMessage.includes("Erreur") ? "error" : "success"}>{snackbarMessage}</Alert>
      </Snackbar>
    </Box>
  );
};

export default LotsManagement;