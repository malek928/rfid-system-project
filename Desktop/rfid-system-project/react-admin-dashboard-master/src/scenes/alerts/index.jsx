import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Card, CardContent, IconButton } from '@mui/material';
import { tokens } from '../../theme';
import { useTheme } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Header from '../../components/Header';

const Alerts = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [loading, setLoading] = useState(true);
  const [lotData, setLotData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [seenAlerts, setSeenAlerts] = useState(new Set());
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/lot-history/stock', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      });
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
      }
      const data = await response.json();

      const formattedData = data.map(lot => ({
        id: lot.lot_id || 'unknown',
        lot_id: lot.lot_id || 'N/A',
        lot_tag: lot.epc || 'N/A',
        quantite_finale: lot.quantite_finale ?? 0,
        detected_count: lot.detected_count ?? 0,
        statut: lot.statut || 'unknown', // Ajout du champ statut
      }));

      const newAlerts = [];
      formattedData.forEach(lot => {
        if (lot.statut === 'stocke' && lot.quantite_finale !== lot.detected_count) {
          const alertKey = `${lot.lot_id}-${lot.quantite_finale}-${lot.detected_count}`;
          if (!seenAlerts.has(alertKey)) {
            const difference = lot.quantite_finale - lot.detected_count;
            const message = difference > 0
              ? `${Math.abs(difference)} tag(s) manquant(s)`
              : `${Math.abs(difference)} tag(s) en trop`;
            newAlerts.push({
              id: alertKey,
              lot_id: lot.lot_id,
              message: `Le lot ${lot.lot_id} a un écart - ${message} (Finale: ${lot.quantite_finale}, Détectée: ${lot.detected_count})`,
              resolved: false,
            });
            setSeenAlerts(prev => new Set(prev).add(alertKey));
          }
        }
      });

      setAlerts(prevAlerts => {
        const updatedAlerts = prevAlerts.map(alert => {
          const newAlert = newAlerts.find(a => a.id === alert.id);
          if (newAlert) {
            return { ...alert, message: newAlert.message };
          }
          return alert;
        });
        const newAlertIds = updatedAlerts.map(a => a.id);
        const additionalAlerts = newAlerts.filter(a => !newAlertIds.includes(a.id));
        return [...updatedAlerts, ...additionalAlerts];
      });

      setLotData(formattedData);
      setLoading(false);
    } catch (error) {
      console.error('Erreur fetchAlerts:', error);
      setAlerts(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          message: `Erreur lors de la récupération des lots stockés: ${error.message}`,
          resolved: false,
          isError: true,
        },
      ]);
      setLotData([]);
      setLoading(false);
    }
  };

  const handleMarkAsResolved = (alertId) => {
    setAlerts(prev =>
      prev.map(alert =>
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    );
  };

  const handleCloseAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const handleCloseModal = () => {
    setOpenDetailsModal(false);
    setSelectedLot(null);
  };

  // Filtrer les lots pour ne garder que ceux avec une erreur et statut = 'stocke'
  const lotsWithErrors = lotData.filter(lot => 
    lot.statut === 'stocke' && lot.quantite_finale !== lot.detected_count
  );

  return (
    <Box m="20px" sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header title="Détection de Lots" subtitle="Affichage des lots avec erreurs" />
      {loading ? (
        <Typography color={colors.grey?.[100] || '#ffffff'} variant="h5" textAlign="center">
          Chargement des données...
        </Typography>
      ) : lotsWithErrors.length === 0 ? (
        <Typography color={colors.grey?.[100] || '#ffffff'} variant="h5" textAlign="center">
          Aucun lot avec erreur détecté (Statut : Stocké).
        </Typography>
      ) : (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Section des alertes sous forme de cartes rouges */}
          {alerts.length > 0 && (
            <Box mb={3}>
              <Typography variant="h5" color={colors.grey?.[100] || '#ffffff'} fontWeight="bold" mb={2}>
                Alertes Actives
              </Typography>
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  sx={{
                    mb: 2,
                    backgroundColor: alert.isError
                      ? (colors.redAccent?.[700] || '#d32f2f')
                      : (colors.redAccent?.[700] || '#d32f2f'),
                    borderRadius: '8px',
                    boxShadow: `0 2px 4px ${colors.primary?.[900] || '#000000'}`,
                    transition: 'all 0.3s ease',
                    opacity: alert.resolved ? 0.5 : 1,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 4px 8px ${colors.primary?.[800] || '#111111'}`,
                    },
                  }}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <WarningAmberIcon
                        sx={{
                          color: colors.grey?.[100] || '#ffffff',
                          mr: 2,
                          fontSize: '30px',
                          animation: 'pulse 2s infinite',
                          '@keyframes pulse': {
                            '0%': { transform: 'scale(1)' },
                            '50%': { transform: 'scale(1.2)' },
                            '100%': { transform: 'scale(1)' },
                          },
                        }}
                      />
                      <Typography color={colors.grey?.[100] || '#ffffff'} fontSize="14px">
                        {alert.message}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton onClick={() => handleMarkAsResolved(alert.id)} sx={{ p: 0.5 }}>
                        <CheckCircleIcon sx={{ color: colors.greenAccent?.[600] || '#43a047', fontSize: '20px' }} />
                      </IconButton>
                      <IconButton onClick={() => handleCloseAlert(alert.id)} sx={{ p: 0.5 }}>
                        <CloseIcon sx={{ color: colors.grey?.[100] || '#ffffff', fontSize: '25px' }} />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {/* Section des lots avec erreurs sous forme de cartes en grille */}
          <Box
            p={2}
            borderRadius="16px"
            backgroundColor={colors.primary[500]}
            boxShadow={`0 6px 15px ${colors.primary[900]}`}
            sx={{
              flex: 1,
              overflowY: 'auto',
              '&::-webkit-scrollbar': { width: '8px' },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: colors.grey[700],
                borderRadius: '4px',
              },
            }}
          >
            <Box
              display="grid"
              gridTemplateColumns="repeat(auto-fill, minmax(600px, 1fr))"
              gap={5}
              sx={{ padding: 2 }}
            >
              {lotsWithErrors.map((lot) => (
                <Box
                  key={lot.id}
                  p={5}
                  borderRadius="8px"
                  backgroundColor={colors.primary[400]}
                  boxShadow={`0 2px 4px ${colors.primary[900]}`}
                  sx={{
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.03)',
                      backgroundColor: colors.primary[300],
                    },
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="h6" color={colors.greenAccent[300]} fontWeight="bold" fontSize="20px">
                        Lot {lot.lot_id}
                      </Typography>
                      <Typography variant="body2" color={colors.grey[100]} mt={1} fontSize="16px">
                        <strong>EPC :</strong> {lot.lot_tag || "Non défini"}
                      </Typography>
                      <Box display="flex" justifyContent="flex-start" gap={3} mt={1} alignItems="center">
                        <Typography variant="body2" color={colors.grey[100]} fontSize="16px">
                          <strong>Quantité Finale :</strong> {lot.quantite_finale}
                        </Typography>
                        <Typography variant="body2" color={colors.grey[100]} fontSize="16px">
                          <strong>Quantité Détectée :</strong> {lot.detected_count}
                          {lot.quantite_finale !== lot.detected_count && (
                            <WarningAmberIcon sx={{ color: colors.redAccent[500], ml: 2, fontSize: '16px' }} />
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          <Dialog open={openDetailsModal} onClose={handleCloseModal} maxWidth="sm" fullWidth>
            <DialogTitle
              sx={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: colors.grey?.[100] || '#ffffff',
                backgroundColor: colors.primary?.[400] || '#333333',
                borderBottom: "1px solid #444",
              }}
            >
              Détails du Lot {selectedLot?.lot_id || "-"}
            </DialogTitle>
            <DialogContent sx={{ backgroundColor: colors.primary?.[400] || '#333333', p: 3 }}>
              {selectedLot && (
                <Box sx={{ display: "grid", gap: 2 }}>
                  <Typography><strong>ID du Lot :</strong> {selectedLot.lot_id || "-"}</Typography>
                  <Typography><strong>Tag EPC :</strong> {selectedLot.lot_tag || "-"}</Typography>
                  <Typography><strong>Quantité Finale :</strong> {selectedLot.quantite_finale ?? "-"}</Typography>
                  <Typography><strong>Quantité Détectée :</strong> {selectedLot.detected_count ?? "-"}</Typography>
                  {selectedLot.quantite_finale !== selectedLot.detected_count && (
                    <Typography sx={{ color: colors.redAccent?.[500] || '#d32f2f', fontWeight: 'bold' }}>
                      <strong>Écart :</strong> {Math.abs(selectedLot.quantite_finale - selectedLot.detected_count)} tag(s) {selectedLot.quantite_finale > selectedLot.detected_count ? 'manquant(s)' : 'en trop'}
                    </Typography>
                  )}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ backgroundColor: colors.primary?.[400] || '#333333', borderTop: "1px solid #444" }}>
              <Button onClick={handleCloseModal} sx={{ color: colors.redAccent?.[500] || '#d32f2f' }}>
                Fermer
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
};

export default Alerts;