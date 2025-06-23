import { useState, useEffect } from "react";
import { Box, Typography, useTheme, Tabs, Tab } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import axios from "axios";

const GeneralView = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [assignments, setAssignments] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkerProgress = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/worker-progress", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = response.data;
        const chains = [
          { chaine_id: "CH001", nom_chaine: "Chaîne 1" },
          { chaine_id: "CH002", nom_chaine: "Chaîne 2" },
        ];
        const groupedAssignments = chains.map((chain) => ({
          ...chain,
          ouvriers: data.filter((worker) => worker.chaine_id === chain.chaine_id),
        }));
        setAssignments(groupedAssignments);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkerProgress();
  }, []);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const allRows = assignments
    .flatMap((chaine) =>
      (chaine.ouvriers || []).map((ouvrier) => ({
        ...ouvrier,
        chaine_nom: chaine.nom_chaine,
      }))
    )
    .filter((ouvrier) => ouvrier.ouvrier_id && ouvrier.localisation);

  const rows = allRows.filter(
    (ouvrier) => ouvrier.chaine_nom === assignments[selectedTab]?.nom_chaine
  );

  const columns = [
    {
      field: "chaine_nom",
      headerName: "Chaîne",
      flex: 1,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "worker_name",
      headerName: "Nom et Prénom",
      flex: 1.5,
      valueGetter: (params) => `${params.row.nom || "N/A"} ${params.row.prenom || ""}`,
      cellClassName: "name-column--cell",
      headerAlign: "center",
      align: "center",
    },
    {
      field: "localisation",
      headerName: "Machine",
      flex: 2,
      valueGetter: (params) => params.row.localisation,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "lots_termines",
      headerName: "Lots Terminés",
      flex: 1,
      valueGetter: (params) => params.row.lots_termines || 0,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "jeans_termines",
      headerName: "Jeans Terminés",
      type: "number",
      flex: 1,
      valueGetter: (params) => params.row.jeans_termines || 0,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "jeans_defectueux",
      headerName: "Jeans Défectueux",
      type: "number",
      flex: 1,
      valueGetter: (params) => params.row.jeans_defectueux || 0,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "pourcentage_avancement",
      headerName: "Pourcentage d'Avancement",
      flex: 1,
      renderCell: (params) => {
        const pourcentage = params.row.pourcentage_avancement || 0;
        return `${pourcentage.toFixed(2)}%`;
      },
      headerAlign: "center",
      align: "center",
    },
  ];

  if (loading) {
    return (
      <Box m="20px">
        <Typography variant="h4" color={colors.grey[100]}>
          Chargement des données...
        </Typography>
      </Box>
    );
  }

  return (
    <Box m="20px">
      <Header
        title="VUE DES OUVRIERS PAR CHAÎNE"
        subtitle="Détails de l'avancement des ouvriers"
      />
      <Typography variant="h6" color={colors.grey[100]} mb={2}>
        Objectif journalier : Un ouvrier est attendu pour compléter environ 10 lots par jour (chaque lot contribue 10% à l'avancement).
      </Typography>

      <Tabs
        value={selectedTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          "& .MuiTab-root": {
            color: colors.grey[100],
            fontWeight: "bold",
            textTransform: "none",
            fontSize: "14px",
          },
          "& .MuiTab-root.Mui-selected": {
            color: colors.greenAccent[500],
          },
          "& .MuiTabs-indicator": {
            backgroundColor: colors.greenAccent[500],
          },
        }}
      >
        {assignments.map((chaine) => (
          <Tab key={chaine.chaine_id} label={chaine.nom_chaine} />
        ))}
      </Tabs>

      {rows.length === 0 ? (
        <Typography variant="h5" color={colors.grey[100]}>
          Aucune assignation trouvée pour cette chaîne.
        </Typography>
      ) : (
        <Box
          m="40px 0 0 0"
          height="75vh"
          sx={{
            "& .MuiDataGrid-root": {
              border: "none",
              borderRadius: "8px",
              boxShadow: `0 4px 8px ${colors.primary[900]}`,
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "none",
              padding: "0 8px",
              color: colors.grey[100],
              fontSize: "14px",
            },
            "& .name-column--cell": {
              color: colors.greenAccent[300],
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: colors.blueAccent[700],
              borderBottom: `2px solid ${colors.grey[700]}`,
              padding: "8px 0",
            },
            "& .MuiDataGrid-columnHeader": {
              padding: "0 16px",
              borderRight: `1px solid ${colors.grey[700]}`,
              "&:last-child": {
                borderRight: "none",
              },
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
              fontSize: "16px",
              color: colors.grey[100],
              whiteSpace: "normal",
              lineHeight: "1.2",
              textAlign: "center",
            },
            "& .MuiDataGrid-columnSeparator": {
              display: "none",
            },
            "& .MuiDataGrid-virtualScroller": {
              backgroundColor: colors.primary[400],
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "none",
              backgroundColor: colors.blueAccent[700],
            },
            "& .MuiCheckbox-root": {
              color: `${colors.greenAccent[200]} !important`,
            },
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.ouvrier_id}
            pageSize={10}
            rowsPerPageOptions={[10]}
            disableSelectionOnClick
          />
        </Box>
      )}
    </Box>
  );
};

export default GeneralView;