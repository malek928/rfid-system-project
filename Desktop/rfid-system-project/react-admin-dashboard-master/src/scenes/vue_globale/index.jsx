import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useTheme } from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import { formatInTimeZone, toDate } from "date-fns-tz"; // Ajout de date-fns-tz

const VueGlobale = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState("chains");
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [openTraceabilityModal, setOpenTraceabilityModal] = useState(false);
  const [openJeansModal, setOpenJeansModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://localhost:5000/direction/global-view", {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        });
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        console.log("Données reçues de l'API:", data);
        const sortedLots = Array.isArray(data) ? data.sort((a, b) => a.lot_id.localeCompare(b.lot_id)) : [];
        setLots(sortedLots);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setLots([]);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDateTime = (dateString) => {
    if (!dateString || dateString === "N/A") return "-";
    // Supposons que la date renvoyée par l'API est en UTC
    // Convertir en Africa/Tunis pour l'affichage
    return formatInTimeZone(toDate(dateString, { timeZone: 'UTC' }), 'Africa/Tunis', "dd/MM/yyyy HH:mm");
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "en attente":
        return "#FFB300";
      case "en cours":
        return "#42A5F5";
      case "terminé":
      case "termine":
      case "stocké":
      case "stocke":
        return "#66BB6A";
      default:
        return "#B0BEC5";
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedView(newValue);
  };

  const handleOpenDetailsModal = (lot) => {
    console.log("Selected lot for details:", lot);
    setSelectedLot(lot);
    setOpenDetailsModal(true);
  };

  const handleOpenTraceabilityModal = (lot) => {
    console.log("Selected lot for traceability:", lot);
    setSelectedLot(lot);
    setOpenTraceabilityModal(true);
  };

  const handleOpenJeansModal = (lot) => {
    console.log("Selected lot for jeans:", lot);
    setSelectedLot(lot);
    setOpenJeansModal(true);
  };

  const handleCloseModal = () => {
    setOpenDetailsModal(false);
    setOpenTraceabilityModal(false);
    setOpenJeansModal(false);
    setSelectedLot(null);
  };

  const filteredLots = selectedView === "chains"
    ? lots.filter(
        (lot) =>
          lot.chaine_id &&
          lot.chaine_id !== "N/A" &&
          lot.statut?.toLowerCase() !== "stocké" &&
          lot.statut?.toLowerCase() !== "stocke"
      )
    : lots.filter(
        (lot) => lot.statut?.toLowerCase() === "stocké" || lot.statut?.toLowerCase() === "stocke"
      );

  console.log("filteredLots:", filteredLots);

  const baseColumns = [
    { field: "lot_id", headerName: "ID Lot", width: 150, headerAlign: "center", align: "center" },
    {
      field: "epc",
      headerName: "EPC",
      width: 250,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => params.value && params.value !== "N/A" ? params.value : "-",
    },
    {
      field: "statut",
      headerName: "Statut",
      width: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Box display="flex" alignItems="center" sx={{ padding: "8px 16px" }}>
          <Typography fontWeight="bold">{params.value || "-"}</Typography>
          <Box
            sx={{
              ml: 2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: getStatusColor(params.value),
            }}
          />
        </Box>
      ),
    },
    { field: "quantite_initiale", headerName: "Quantité Initiale", width: 150, headerAlign: "center", align: "center" },
    { field: "quantite_finale", headerName: "Quantité Finale", width: 150, headerAlign: "center", align: "center" },
    { field: "jeans_defectueux", headerName: "Jeans Défectueux", width: 150, headerAlign: "center", align: "center" },
    {
      field: "details",
      headerName: "Détails",
      width: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Button
          variant="contained"
          onClick={() => handleOpenDetailsModal(params.row)}
          sx={{
            backgroundColor: colors.blueAccent[600],
            color: colors.grey[100],
            "&:hover": { backgroundColor: colors.blueAccent[500] },
            padding: "6px 12px",
          }}
        >
          Détails
        </Button>
      ),
    },
    {
      field: "traceability",
      headerName: "Traçabilité",
      width: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Button
          variant="contained"
          onClick={() => handleOpenTraceabilityModal(params.row)}
          sx={{
            backgroundColor: colors.greenAccent[600],
            color: colors.grey[100],
            "&:hover": { backgroundColor: colors.greenAccent[500] },
            padding: "6px 12px",
          }}
        >
          Traçabilité
        </Button>
      ),
    },
    {
      field: "jeans",
      headerName: "Jeans Défectueux",
      width: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <Button
          variant="contained"
          onClick={() => handleOpenJeansModal(params.row)}
          sx={{
            backgroundColor: colors.redAccent[600],
            color: colors.grey[100],
            "&:hover": { backgroundColor: colors.redAccent[500] },
            padding: "6px 12px",
          }}
        >
          Jeans Défectueux
        </Button>
      ),
    },
  ];

  const columns = baseColumns;

  const rows = filteredLots.sort((a, b) => a.lot_id.localeCompare(b.lot_id));

  console.log("rows:", rows);

  const getTraceabilitySteps = (lot) => {
    const steps = [];

    if (["en cours", "en attente", "terminé", "termine", "stocké", "stocke"].includes(lot.statut?.toLowerCase())) {
      steps.push({
        title: "Préparation (En Attente)",
        details: {
          heure: formatDateTime(lot.temps_debut),
          preparateur: lot.operateur_nom || "-",
          quantiteInitiale: lot.quantite_initiale || "-", // Ajout de quantite_initiale
        },
      });
    }

    if (["en cours", "terminé", "termine", "stocké", "stocke"].includes(lot.statut?.toLowerCase()) && lot.temps_debut_travail && lot.temps_debut_travail !== "N/A") {
      steps.push({
        title: "Travail en Cours",
        details: {
          heure: formatDateTime(lot.temps_debut_travail),
          ouvrier: lot.ouvrier_nom || "-",
          localisation: lot.localisation || "-",
          quantiteInitiale: lot.quantite_initiale || "-", // Ajout de quantite_initiale
        },
      });
    }

    if (["terminé", "termine", "stocké", "stocke"].includes(lot.statut?.toLowerCase()) && lot.temps_fin && lot.temps_fin !== "N/A") {
      steps.push({
        title: "Terminaison",
        details: {
          heure: formatDateTime(lot.temps_fin),
          ouvrier: lot.ouvrier_nom || "-",
          localisation: lot.localisation || "-",
          quantiteFinale: lot.quantite_finale || "-", // Ajout de quantite_finale
        },
      });
    }

    if ((lot.statut?.toLowerCase() === "stocké" || lot.statut?.toLowerCase() === "stocke") && lot.date_stockage && lot.date_stockage !== "N/A") {
      steps.push({
        title: "Stockage",
        details: {
          heure: formatDateTime(lot.date_stockage),
          quantiteDetectee: lot.detected_count !== null && lot.detected_count !== undefined ? lot.detected_count : "-", // Remplacement de quantite par quantiteDetectee
        },
      });
    }

    console.log("Traceability steps for lot:", lot.lot_id, steps);
    return steps;
  };

  return (
    <Box m="20px">
      <Header title="Vue Globale Direction" subtitle="Vue des lots par chaîne" />
      {loading ? (
        <Typography color={colors.grey[100]}>Chargement des données...</Typography>
      ) : (
        <Box>
          <Tabs
            value={selectedView}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              mb: 3,
              "& .MuiTab-root": { color: colors.grey[100], fontWeight: "bold", textTransform: "none", fontSize: "14px" },
              "& .MuiTab-root.Mui-selected": { color: colors.greenAccent[500] },
              "& .MuiTabs-indicator": { backgroundColor: colors.greenAccent[500] },
            }}
          >
            <Tab label="Lots par Chaîne" value="chains" />
            <Tab label="Lots Stockés" value="expedited" />
          </Tabs>

          <Box
            m="40px 0 0 0"
            height="75vh"
            sx={{
              "& .MuiDataGrid-root": { border: "none", borderRadius: "8px", boxShadow: `0 4px 8px ${colors.primary[900]}` },
              "& .MuiDataGrid-cell": { borderBottom: "none", padding: "0 8px", color: colors.grey[100], fontSize: "14px" },
              "& .MuiDataGrid-columnHeaders": { backgroundColor: colors.blueAccent[700], borderBottom: `2px solid ${colors.grey[700]}`, padding: "8px 0" },
              "& .MuiDataGrid-columnHeader": { padding: "0 16px", borderRight: `1px solid ${colors.grey[700]}`, "&:last-child": { borderRight: "none" } },
              "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold", fontSize: "16px", color: colors.grey[100], whiteSpace: "normal", lineHeight: "1.2", textAlign: "center" },
              "& .MuiDataGrid-columnSeparator": { display: "none" },
              "& .MuiDataGrid-virtualScroller": { backgroundColor: colors.primary[400] },
              "& .MuiDataGrid-footerContainer": { borderTop: "none", backgroundColor: colors.blueAccent[700] },
              "& .MuiCheckbox-root": { color: `${colors.greenAccent[200]} !important` },
            }}
          >
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row.unique_id}
              pageSizeOptions={[10]}
              disableRowSelectionOnClick
            />
          </Box>

          {/* Modal des Détails */}
          <Dialog open={openDetailsModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontSize: "1.5rem", fontWeight: "bold", color: colors.grey[100], backgroundColor: colors.primary[400], borderBottom: "1px solid #444" }}>
              Détails du Lot {selectedLot?.lot_id || "-"}
            </DialogTitle>
            <DialogContent sx={{ backgroundColor: colors.primary[400], p: 3 }}>
              {selectedLot && (
                <Box sx={{ display: "grid", gap: 2 }}>
                  <Typography><strong>Taille :</strong> {selectedLot.taille || "-"}</Typography>
                  <Typography><strong>Couleur :</strong> {selectedLot.couleur || "-"}</Typography>
                  <Typography><strong>Chaîne ID :</strong> {selectedLot.chaine_id || "-"}</Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ backgroundColor: colors.primary[400], borderTop: "1px solid #444" }}>
              <Button onClick={handleCloseModal} sx={{ color: colors.redAccent[500] }}>Fermer</Button>
            </DialogActions>
          </Dialog>

          {/* Modal de Traçabilité */}
          <Dialog open={openTraceabilityModal} onClose={handleCloseModal} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ fontSize: "1.5rem", fontWeight: "bold", color: colors.grey[100], backgroundColor: colors.primary[400], borderBottom: `2px solid ${colors.grey[700]}`, p: 3 }}>
              Traçabilité du Lot {selectedLot?.lot_id || "-"}
            </DialogTitle>
            <DialogContent sx={{ backgroundColor: colors.primary[400], p: 3 }}>
              {selectedLot && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {getTraceabilitySteps(selectedLot).length > 0 ? (
                    getTraceabilitySteps(selectedLot).map((step, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 3,
                          border: `1px solid ${colors.grey[600]}`,
                          borderRadius: 12,
                          backgroundColor: colors.primary[500],
                          boxShadow: `0 6px 12px ${colors.primary[900]}`,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            boxShadow: `0 8px 16px ${colors.primary[800]}`,
                          },
                        }}
                      >
                        <Typography
                          variant="h5"
                          sx={{ color: colors.greenAccent[500], mb: 2, fontWeight: "bold", borderBottom: `2px solid ${colors.greenAccent[700]}`, pb: 1 }}
                        >
                          Étape {index + 1}: {step.title}
                        </Typography>
                        <Box sx={{ ml: 2, display: "grid", gap: 1 }}>
                          {Object.entries(step.details).map(([key, value]) => (
                            <Typography key={key} sx={{ color: colors.grey[300], fontSize: "1rem" }}>
                              <strong style={{ color: colors.grey[100] }}>
                                {key === "quantiteInitiale" ? "Quantité Initiale" :
                                 key === "quantiteFinale" ? "Quantité Finale" :
                                 key === "quantiteDetectee" ? "Quantité Détectée" :
                                 key.charAt(0).toUpperCase() + key.slice(1)} :
                              </strong>{" "}
                              {value}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Typography color={colors.grey[300]} sx={{ textAlign: "center", py: 2 }}>
                      Aucune information de traçabilité disponible.
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ backgroundColor: colors.primary[400], borderTop: `2px solid ${colors.grey[700]}`, p: 2 }}>
              <Button onClick={handleCloseModal} sx={{ color: colors.redAccent[500], fontSize: "1rem", px: 2, py: 1 }}>
                Fermer
              </Button>
            </DialogActions>
          </Dialog>

          {/* Modal des Jeans Défectueux */}
          <Dialog open={openJeansModal} onClose={handleCloseModal} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ fontSize: "1.5rem", fontWeight: "bold", color: colors.grey[100], backgroundColor: colors.primary[400], borderBottom: "1px solid #444" }}>
              Jeans Défectueux du Lot {selectedLot?.lot_id || "-"}
            </DialogTitle>
            <DialogContent sx={{ backgroundColor: colors.primary[400], p: 3 }}>
              {selectedLot && selectedLot.jeans && selectedLot.jeans.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {selectedLot.jeans.map((jean, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 2,
                        border: `1px solid ${colors.redAccent[700]}`,
                        borderRadius: 8,
                        backgroundColor: colors.primary[500],
                        boxShadow: `0 4px 6px ${colors.primary[900]}`,
                      }}
                    >
                      <Typography variant="h6" sx={{ color: colors.redAccent[500], mb: 1, fontWeight: "bold" }}>
                        Jean {index + 1}
                      </Typography>
                      <Typography sx={{ color: colors.grey[100], whiteSpace: "pre-wrap" }}>
                        <strong>EPC :</strong> {jean.epc || "-"}<br />
                        <strong>Raison du Défaut :</strong> {jean.raison_defaut || "Non spécifiée"}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color={colors.grey[100]}>Aucun jean défectueux associé à ce lot.</Typography>
              )}
            </DialogContent>
            <DialogActions sx={{ backgroundColor: colors.primary[400], borderTop: "1px solid #444" }}>
              <Button onClick={handleCloseModal} sx={{ color: colors.redAccent[500] }}>Fermer</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
};

export default VueGlobale;