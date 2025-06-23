import { useEffect, useState } from "react";
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
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DialogContentText,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";

const StaffManagement = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [users, setUsers] = useState([]);
  const [chaines, setChaines] = useState([]);
  const [filteredOperateurs, setFilteredOperateurs] = useState([]);
  const [filteredResponsables, setFilteredResponsables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [openAddUserDialog, setOpenAddUserDialog] = useState(false);
  const [openEditUserDialog, setOpenEditUserDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [activeTab, setActiveTab] = useState("OPERATEUR");

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    password: "",
    chaine_id: "",
    type: "OPERATEUR",
    is_active: true,
  });
  const [editFormData, setEditFormData] = useState({
    telephone: "",
    email: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [editFormErrors, setEditFormErrors] = useState({});

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Aucun token d'authentification trouvé. Veuillez vous connecter.");
        }
        const response = await fetch("http://localhost:5000/api/gestion-utilisateurs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error(`Erreur API: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Données reçues de l'API:", data);

        const uniqueUsers = Array.from(new Map((data.users || []).map(user => [user.id, user])).values());
        setUsers(uniqueUsers);
        setChaines(data.chaines || []);

        const operateurs = uniqueUsers.filter((user) => user.type === "OPERATEUR");
        const responsables = uniqueUsers.filter((user) => user.type === "RESPONSABLE");

        console.log("Opérateurs filtrés:", operateurs);
        console.log("Responsables filtrés:", responsables);

        setFilteredOperateurs(operateurs);
        setFilteredResponsables(responsables);
      } catch (err) {
        console.error("Erreur dans fetchUsers:", err);
        setError(err.message);
        setSnackbarMessage(`Erreur: ${err.message}`);
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleOpenAddUserDialog = () => {
    setOpenAddUserDialog(true);
  };

  const handleCloseAddUserDialog = () => {
    setOpenAddUserDialog(false);
    setFormData({
      nom: "",
      prenom: "",
      telephone: "",
      email: "",
      password: "",
      chaine_id: "",
      type: "OPERATEUR",
      is_active: true,
    });
    setFormErrors({});
  };

  const handleOpenEditUserDialog = (user) => {
    if (user) {
      setSelectedUser(user);
      setEditFormData({
        telephone: user.telephone || "",
        email: user.email || "",
        password: "",
      });
      setOpenEditUserDialog(true);
    }
  };

  const handleCloseEditUserDialog = () => {
    setOpenEditUserDialog(false);
    setSelectedUser(null);
    setEditFormData({ telephone: "", email: "", password: "" });
    setEditFormErrors({});
  };

  const handleOpenDeleteDialog = (user) => {
    setSelectedUser(user);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedUser(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.nom) newErrors.nom = "Le nom est requis";
    if (!formData.prenom) newErrors.prenom = "Le prénom est requis";
    if (!formData.telephone) {
      newErrors.telephone = "Le numéro de téléphone est requis";
    } else if (!/^\d{10}$/.test(formData.telephone)) {
      newErrors.telephone = "Le numéro de téléphone doit contenir 10 chiffres";
    }
    if (!formData.email && formData.type !== "OUVRIER") {
      newErrors.email = "L'email est requis";
    } else if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    if (!formData.password && (formData.type === "OPERATEUR" || formData.type === "RESPONSABLE")) {
      newErrors.password = "Le mot de passe est requis";
    }
    if (!formData.chaine_id) {
      newErrors.chaine_id = "La chaîne est requise";
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors = {};
    if (!editFormData.telephone) {
      newErrors.telephone = "Le numéro de téléphone est requis";
    } else if (!/^\d{10}$/.test(editFormData.telephone)) {
      newErrors.telephone = "Le numéro de téléphone doit contenir 10 chiffres";
    }
    if (!editFormData.email && selectedUser?.type !== "OUVRIER") {
      newErrors.email = "L'email est requis";
    } else if (editFormData.email && !/\S+@\S+\.\S+/.test(editFormData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    setEditFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        const payload = {
          nom: formData.nom,
          prenom: formData.prenom,
          telephone: formData.telephone,
          email: formData.email || null,
          password: formData.password,
          role_id: formData.type === "OUVRIER" ? "4" : formData.type === "OPERATEUR" ? "1" : "2",
          chaine_id: formData.chaine_id,
          is_active: formData.is_active,
        };

        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/api/add-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("Utilisateur ajouté:", data);

        const updatedData = await fetch("http://localhost:5000/api/gestion-utilisateurs", {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json());

        const uniqueUsers = Array.from(new Map((updatedData.users || []).map(user => [user.id, user])).values());
        setUsers(uniqueUsers);
        setChaines(updatedData.chaines || []);

        const operateurs = uniqueUsers.filter((user) => user.type === "OPERATEUR");
        const responsables = uniqueUsers.filter((user) => user.type === "RESPONSABLE");

        setFilteredOperateurs(operateurs);
        setFilteredResponsables(responsables);

        handleCloseAddUserDialog();
        setSnackbarMessage("Utilisateur ajouté avec succès !");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } catch (err) {
        setError(err.message);
        setSnackbarMessage(`Erreur lors de l'ajout de l'utilisateur: ${err.message}`);
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    }
  };

  const handleEditFormSubmit = async (e) => {
  e.preventDefault();
  if (validateEditForm()) {
    try {
      const payload = {
        id: selectedUser.id, // Adjust if needed (e.g., selectedUser.id.replace("USER", ""))
        telephone: editFormData.telephone,
        email: editFormData.email || null,
        password: editFormData.password || null,
      };

      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/update-user/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const updatedData = await fetch("http://localhost:5000/api/gestion-utilisateurs", {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => res.json());

      const uniqueUsers = Array.from(new Map((updatedData.users || []).map(user => [user.id, user])).values());
      setUsers(uniqueUsers);
      setChaines(updatedData.chaines || []);

      const operateurs = uniqueUsers.filter((user) => user.type === "OPERATEUR");
      const responsables = uniqueUsers.filter((user) => user.type === "RESPONSABLE");

      setFilteredOperateurs(operateurs);
      setFilteredResponsables(responsables);

      handleCloseEditUserDialog();
      setSnackbarMessage("Utilisateur modifié avec succès !");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (err) {
      setError(err.message);
      setSnackbarMessage(`Erreur lors de la modification de l'utilisateur: ${err.message}`);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }
};

  const handleDeleteUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/delete-user/${selectedUser.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const updatedData = await fetch("http://localhost:5000/api/gestion-utilisateurs", {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => res.json());

      const uniqueUsers = Array.from(new Map((updatedData.users || []).map(user => [user.id, user])).values());
      setUsers(uniqueUsers);
      setChaines(updatedData.chaines || []);

      const operateurs = uniqueUsers.filter((user) => user.type === "OPERATEUR");
      const responsables = uniqueUsers.filter((user) => user.type === "RESPONSABLE");

      setFilteredOperateurs(operateurs);
      setFilteredResponsables(responsables);

      handleCloseDeleteDialog();
      setSnackbarMessage("Utilisateur supprimé avec succès !");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (err) {
      setError(err.message);
      setSnackbarMessage(`Erreur lors de la suppression de l'utilisateur: ${err.message}`);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filteredOp = (users || []).filter((user) => user.type === "OPERATEUR").filter((user) => user.nom.toLowerCase().includes(query) || user.prenom.toLowerCase().includes(query));
    const filteredResp = (users || []).filter((user) => user.type === "RESPONSABLE").filter((user) => user.nom.toLowerCase().includes(query) || user.prenom.toLowerCase().includes(query));

    setFilteredOperateurs(filteredOp);
    setFilteredResponsables(filteredResp);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderUserCards = (users) => (
    <Box display="grid" gridTemplateColumns="repeat(minmax(2000px, 1fr))" gap={2} sx={{ padding:1 }}>
      {users.map((user) => (
        <Box
          key={user.id}
          p={3}
          borderRadius="8px"
          backgroundColor={colors.primary[400]}
          boxShadow={`0 2px 4px ${colors.grey[900]}`}
          sx={{
            transition: "transform 0.2s ease-in-out",
            "&:hover": {
              transform: "scale(1.02)",
              backgroundColor: colors.primary[300],
            },
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h5" color={colors.greenAccent[300]} fontWeight="bold">
                {user.nom} {user.prenom}
              </Typography>
              <Typography variant="body1" color={colors.grey[100]} mt={1.5}>
                <strong>ID :</strong> {user.id}
              </Typography>
              <Typography variant="body1" color={colors.grey[100]} mt={1}>
                <strong>Email :</strong> {user.email || "Non défini"}
              </Typography>
              <Typography variant="body1" color={colors.grey[100]} mt={1}>
                <strong>Tél :</strong> {user.telephone || "Non défini"}
              </Typography>
              <Typography variant="body1" color={colors.grey[100]} mt={1}>
                <strong>Chaîne :</strong> {chaines.find(c => c.chaine_id === user.chaine_id)?.nom_chaine || "Non défini"}
              </Typography>
            </Box>
            <Box>
              <IconButton
                onClick={() => handleOpenEditUserDialog(user)}
                sx={{
                  backgroundColor: colors.blueAccent[700],
                  color: colors.grey[100],
                  padding: "6px",
                  "&:hover": {
                    backgroundColor: colors.blueAccent[600],
                    transform: "scale(1.05)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                onClick={() => handleOpenDeleteDialog(user)}
                sx={{
                  backgroundColor: colors.redAccent[700],
                  color: colors.grey[100],
                  padding: "6px",
                  marginLeft: "8px",
                  "&:hover": {
                    backgroundColor: colors.redAccent[600],
                    transform: "scale(1.05)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box m="20px" sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header title="GÉRER L'ÉQUIPE" subtitle="Liste des opérateurs et responsables" />
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" maxWidth="300px">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Rechercher par nom..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: colors.grey[300], mr: 1 }} />,
            }}
            sx={{
              "& .MuiInputBase-input": { color: colors.grey[100], padding: "8px" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.grey[500] },
                "&:hover fieldset": { borderColor: colors.grey[300] },
                "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                borderRadius: "6px",
              },
            }}
          />
        </Box>
        <Button
          variant="contained"
          onClick={handleOpenAddUserDialog}
          startIcon={<AddIcon />}
          sx={{
            backgroundColor: colors.greenAccent[600],
            color: colors.grey[100],
            padding: "8px 16px",
            borderRadius: "6px",
            boxShadow: `0 1px 3px ${colors.grey[900]}`,
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: colors.greenAccent[700],
              boxShadow: `0 2px 6px ${colors.grey[900]}`,
              transform: "translateY(-1px)",
            },
          }}
        >
          Ajouter un utilisateur
        </Button>
      </Box>

      {error ? (
        <Typography color={colors.redAccent[500]} variant="h6" textAlign="center">
          {error}
        </Typography>
      ) : loading ? (
        <Typography variant="h6" color={colors.grey[100]} textAlign="center">
          Chargement...
        </Typography>
      ) : users.length === 0 ? (
        <Typography variant="h6" color={colors.grey[100]} textAlign="center">
          Aucun utilisateur trouvé
        </Typography>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box display="flex" justifyContent="center">
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                backgroundColor: colors.primary[600],
                borderRadius: "12px",
                boxShadow: `0 4px 10px ${colors.primary[900]}`,
                mb: 3,
                padding: "6px",
                "& .MuiTabs-flexContainer": {
                  justifyContent: "center",
                },
                "& .MuiTab-root": {
                  color: colors.grey[300],
                  fontWeight: "bold",
                  fontSize: "1rem",
                  textTransform: "none",
                  padding: "10px 24px",
                  borderRadius: "10px",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    backgroundColor: colors.primary[500],
                    color: colors.greenAccent[400],
                    transform: "translateY(-1px)",
                  },
                },
                "& .MuiTab-root.Mui-selected": {
                  color: colors.greenAccent[300],
                  backgroundColor: colors.primary[400],
                  boxShadow: `0 1px 4px ${colors.grey[900]}`,
                },
                "& .MuiTabs-indicator": {
                  display: "none",
                },
              }}
            >
              <Tab label="Opérateurs" value="OPERATEUR" />
              <Tab label="Responsables" value="RESPONSABLE" />
            </Tabs>
          </Box>

          <Box
            p={2}
            borderRadius="12px"
            backgroundColor={colors.primary[500]}
            boxShadow={`0 4px 10px ${colors.primary[900]}`}
            sx={{
              flex: 1,
              overflowY: "auto",
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: colors.grey[700],
                borderRadius: "3px",
              },
            }}
          >
            {activeTab === "OPERATEUR" && (
              <>
                {filteredOperateurs.length === 0 ? (
                  <Typography variant="body2" color={colors.grey[100]} textAlign="center">
                    Aucun opérateur trouvé
                  </Typography>
                ) : (
                  renderUserCards(filteredOperateurs)
                )}
              </>
            )}
            {activeTab === "RESPONSABLE" && (
              <>
                {filteredResponsables.length === 0 ? (
                  <Typography variant="body2" color={colors.grey[100]} textAlign="center">
                    Aucun responsable trouvé
                  </Typography>
                ) : (
                  renderUserCards(filteredResponsables)
                )}
              </>
            )}
          </Box>
        </Box>
      )}

      <Dialog open={openAddUserDialog} onClose={handleCloseAddUserDialog}>
        <DialogTitle sx={{ backgroundColor: colors.primary[700], color: colors.grey[100] }}>
          Ajouter un utilisateur
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: colors.primary[600], padding: "20px" }}>
          <Box
            component="form"
            onSubmit={handleFormSubmit}
            sx={{
              maxWidth: "600px",
              margin: "0 auto",
              padding: "10px",
            }}
          >
            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ color: colors.grey[300] }}>Type d'utilisateur</InputLabel>
              <Select
                name="type"
                value={formData.type}
                onChange={handleFormChange}
                label="Type d'utilisateur"
                required
                sx={{
                  color: colors.grey[100],
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[500] },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[300] },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.greenAccent[500] },
                }}
              >
                <MenuItem value="OPERATEUR">Opérateur</MenuItem>
                <MenuItem value="RESPONSABLE">Responsable</MenuItem>
                <MenuItem value="OUVRIER">Ouvrier</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="normal"
              label="Nom"
              name="nom"
              value={formData.nom}
              onChange={handleFormChange}
              error={!!formErrors.nom}
              helperText={formErrors.nom}
              required
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                  "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                },
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Prénom"
              name="prenom"
              value={formData.prenom}
              onChange={handleFormChange}
              error={!!formErrors.prenom}
              helperText={formErrors.prenom}
              required
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                  "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                },
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Téléphone (10 chiffres)"
              name="telephone"
              value={formData.telephone}
              onChange={handleFormChange}
              error={!!formErrors.telephone}
              helperText={formErrors.telephone}
              required
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                  "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                },
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              error={!!formErrors.email}
              helperText={formErrors.email}
              required={formData.type !== "OUVRIER"}
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                  "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                },
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Mot de passe"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleFormChange}
              error={!!formErrors.password}
              helperText={formErrors.password}
              required={formData.type !== "OUVRIER"}
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                  "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                },
              }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ color: colors.grey[300] }}>Chaîne</InputLabel>
              <Select
                name="chaine_id"
                value={formData.chaine_id}
                onChange={handleFormChange}
                label="Chaîne"
                required
                sx={{
                  color: colors.grey[100],
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[500] },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[300] },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.greenAccent[500] },
                }}
              >
                <MenuItem value="">Sélectionner une chaîne</MenuItem>
                {chaines.map((chaine) => (
                  <MenuItem key={chaine.chaine_id} value={chaine.chaine_id}>
                    {chaine.nom_chaine}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.chaine_id && (
                <Typography variant="caption" color={colors.redAccent[500]} sx={{ mt: 1 }}>
                  {formErrors.chaine_id}
                </Typography>
              )}
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: colors.primary[700], padding: "10px 20px" }}>
          <Button
            onClick={handleCloseAddUserDialog}
            startIcon={<CancelIcon />}
            sx={{
              backgroundColor: colors.redAccent[600],
              color: colors.grey[100],
              padding: "8px 16px",
              borderRadius: "8px",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: colors.redAccent[700],
                transform: "translateY(-2px)",
              },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleFormSubmit}
            startIcon={<SaveIcon />}
            sx={{
              backgroundColor: colors.greenAccent[600],
              color: colors.grey[100],
              padding: "8px 16px",
              borderRadius: "8px",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: colors.greenAccent[700],
                transform: "translateY(-2px)",
              },
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditUserDialog} onClose={handleCloseEditUserDialog}>
        <DialogTitle sx={{ backgroundColor: colors.primary[700], color: colors.grey[100] }}>
          Modifier l'utilisateur {selectedUser?.nom} {selectedUser?.prenom}
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: colors.primary[600], padding: "20px" }}>
          <Box
            component="form"
            onSubmit={handleEditFormSubmit}
            sx={{
              maxWidth: "600px",
              margin: "0 auto",
              padding: "10px",
            }}
          >
            <TextField
              fullWidth
              margin="normal"
              label="Téléphone (10 chiffres)"
              name="telephone"
              value={editFormData.telephone}
              onChange={handleEditFormChange}
              error={!!editFormErrors.telephone}
              helperText={editFormErrors.telephone}
              required
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                  "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                },
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Email"
              name="email"
              value={editFormData.email}
              onChange={handleEditFormChange}
              error={!!editFormErrors.email}
              helperText={editFormErrors.email}
              required
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                  "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                },
              }}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Nouveau mot de passe (laisser vide pour ne pas changer)"
              name="password"
              type="password"
              value={editFormData.password}
              onChange={handleEditFormChange}
              sx={{
                "& .MuiInputBase-input": { color: colors.grey[100] },
                "& .MuiInputLabel-root": { color: colors.grey[300] },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: colors.grey[500] },
                  "&:hover fieldset": { borderColor: colors.grey[300] },
                  "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: colors.primary[700], padding: "10px 20px" }}>
          <Button
            onClick={handleCloseEditUserDialog}
            startIcon={<CancelIcon />}
            sx={{
              backgroundColor: colors.redAccent[600],
              color: colors.grey[100],
              padding: "8px 16px",
              borderRadius: "8px",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: colors.redAccent[700],
                transform: "translateY(-2px)",
              },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleEditFormSubmit}
            startIcon={<SaveIcon />}
            sx={{
              backgroundColor: colors.greenAccent[600],
              color: colors.grey[100],
              padding: "8px 16px",
              borderRadius: "8px",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: colors.greenAccent[700],
                transform: "translateY(-2px)",
              },
            }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle sx={{ backgroundColor: colors.primary[700], color: colors.grey[100] }}>
          Confirmer la suppression
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: colors.primary[600] }}>
          <DialogContentText sx={{ color: colors.grey[100] }}>
            Êtes-vous sûr de vouloir supprimer l'utilisateur {selectedUser?.nom} {selectedUser?.prenom} ?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: colors.primary[700] }}>
          <Button
            onClick={handleCloseDeleteDialog}
            sx={{
              backgroundColor: colors.grey[700],
              color: colors.grey[100],
              "&:hover": { backgroundColor: colors.grey[600] },
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleDeleteUser}
            sx={{
              backgroundColor: colors.redAccent[700],
              color: colors.grey[100],
              "&:hover": { backgroundColor: colors.redAccent[600] },
            }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StaffManagement;