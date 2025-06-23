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

const WorkersManagement = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [users, setUsers] = useState([]);
  const [chaines, setChaines] = useState([]);
  const [machines, setMachines] = useState([]);
  const [filteredOuvriers, setFilteredOuvriers] = useState([]);
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

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    chaine_id: "",
    localisation: "",
    is_active: true,
  });
  const [editFormData, setEditFormData] = useState({
    telephone: "",
    chaine_id: "",
    localisation: "",
    is_active: true,
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

        const uniqueUsers = Array.from(new Map(data.users.map(user => [user.id, user])).values());
        setUsers(uniqueUsers);
        setChaines(data.chaines);
        setMachines(data.machines);

        const ouvriers = uniqueUsers.filter((user) => user.type === "OUVRIER");
        console.log("Ouvriers filtrés:", ouvriers);
        setFilteredOuvriers(ouvriers);
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
      chaine_id: "",
      localisation: "",
      is_active: true,
    });
    setFormErrors({});
  };

  const handleOpenEditUserDialog = (user) => {
    setSelectedUser(user);
    const machinePart = user.localisation ? user.localisation.split(", ")[1] : "";
    setEditFormData({
      telephone: user.telephone || "",
      chaine_id: user.chaine_id || "",
      localisation: machinePart || "",
      is_active: true,
    });
    setOpenEditUserDialog(true);
  };

  const handleCloseEditUserDialog = () => {
    setOpenEditUserDialog(false);
    setSelectedUser(null);
    setEditFormData({ telephone: "", chaine_id: "", localisation: "", is_active: true });
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
    if (name === "chaine_id") {
      setFormData((prev) => ({
        ...prev,
        localisation: "",
      }));
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === "chaine_id") {
      setEditFormData((prev) => ({
        ...prev,
        localisation: "",
      }));
    }
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
    if (!formData.chaine_id) {
      newErrors.chaine_id = "La chaîne est requise";
    }
    if (!formData.localisation) {
      newErrors.localisation = "La localisation est requise";
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateEditForm = () => {
    const newErrors = {};
    if (editFormData.telephone && !/^\d{10}$/.test(editFormData.telephone)) {
      newErrors.telephone = "Le numéro de téléphone doit contenir 10 chiffres";
    }
    if (editFormData.chaine_id && !editFormData.localisation) {
      newErrors.localisation = "La localisation est requise si une chaîne est sélectionnée";
    }
    if (!editFormData.telephone && !editFormData.chaine_id) {
      newErrors.general = "Veuillez modifier au moins le numéro ou la chaîne";
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
          email: null,
          password: null,
          role_id: "4",
          chaine_id: formData.chaine_id,
          localisation: formData.localisation,
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

        const uniqueUsers = Array.from(new Map(updatedData.users.map(user => [user.id, user])).values());
        setUsers(uniqueUsers);
        setChaines(updatedData.chaines);
        setMachines(updatedData.machines);

        const ouvriers = uniqueUsers.filter((user) => user.type === "OUVRIER");
        setFilteredOuvriers(ouvriers);

        handleCloseAddUserDialog();
        setSnackbarMessage("Ouvrier ajouté avec succès !");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } catch (err) {
        setError(err.message);
        setSnackbarMessage(`Erreur lors de l'ajout de l'ouvrier: ${err.message}`);
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    }
  };

  const handleEditFormSubmit = async (e) => {
    e.preventDefault();
    if (validateEditForm()) {
      try {
        // Construire le payload dynamiquement pour inclure uniquement les champs modifiés
        const payload = {
          id: selectedUser.id,
          is_active: editFormData.is_active,
          email: null, // Toujours null pour un ouvrier
        };

        // Inclure telephone si modifié
        if (editFormData.telephone && editFormData.telephone !== selectedUser.telephone) {
          payload.telephone = editFormData.telephone;
        }

        // Inclure chaine_id et localisation si chaine_id est modifié
        const currentLocalisation = selectedUser.localisation?.split(", ")[1] || null;
        if (editFormData.chaine_id && editFormData.chaine_id !== selectedUser.chaine_id) {
          payload.chaine_id = editFormData.chaine_id;
          payload.localisation = editFormData.localisation;
        } else if (editFormData.localisation && editFormData.localisation !== currentLocalisation) {
          // Si seulement la localisation change, on garde la chaine_id actuelle
          payload.chaine_id = selectedUser.chaine_id;
          payload.localisation = editFormData.localisation;
        }

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

        const uniqueUsers = Array.from(new Map(updatedData.users.map(user => [user.id, user])).values());
        setUsers(uniqueUsers);
        setChaines(updatedData.chaines);
        setMachines(updatedData.machines);

        const ouvriers = uniqueUsers.filter((user) => user.type === "OUVRIER");
        setFilteredOuvriers(ouvriers);

        handleCloseEditUserDialog();
        setSnackbarMessage("Ouvrier modifié avec succès !");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } catch (err) {
        setError(err.message);
        setSnackbarMessage(`Erreur lors de la modification de l'ouvrier: ${err.message}`);
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

      const uniqueUsers = Array.from(new Map(updatedData.users.map(user => [user.id, user])).values());
      setUsers(uniqueUsers);
      setChaines(updatedData.chaines);
      setMachines(updatedData.machines);

      const ouvriers = uniqueUsers.filter((user) => user.type === "OUVRIER");
      setFilteredOuvriers(ouvriers);

      handleCloseDeleteDialog();
      setSnackbarMessage("Ouvrier supprimé avec succès !");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (err) {
      setError(err.message);
      setSnackbarMessage(`Erreur lors de la suppression de l'ouvrier: ${err.message}`);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    const filteredOuv = users
      .filter((user) => user.type === "OUVRIER")
      .filter((user) => user.nom.toLowerCase().includes(query) || user.prenom.toLowerCase().includes(query));

    setFilteredOuvriers(filteredOuv);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const availableMachines = machines
    .filter(m => m.chaine_id === formData.chaine_id && m.est_disponible && !m.ouvrier_id)
    .map(m => ({
      machine_id: m.machine_id,
      nom_machine: m.nom_machine,
    }));

  const availableMachinesEdit = machines
    .filter(m => m.chaine_id === editFormData.chaine_id && (m.est_disponible && !m.ouvrier_id || m.nom_machine === editFormData.localisation))
    .map(m => ({
      machine_id: m.machine_id,
      nom_machine: m.nom_machine,
    }));

  const renderUserCards = (users) => (
    <Box display="grid" gridTemplateColumns="repeat( minmax(1900px, 1fr))" gap={2} sx={{ padding:1 }}>
      {users.map((user) => (
        <Box
          key={user.id}
          p={3}
          borderRadius="8px"
          backgroundColor={colors.primary[400]}
          boxShadow={`0 2px 4px ${colors.primary[900]}`}
          sx={{
            transition: "transform 0.2s ease-in-out",
            "&:hover": {
              transform: "scale(1.03)",
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
                <strong>Tél :</strong> {user.telephone || "Non défini"}
              </Typography>
              <Typography variant="body1" color={colors.grey[100]} mt={1}>
                <strong>Chaîne :</strong> {chaines.find(c => c.chaine_id === user.chaine_id)?.nom_chaine || "Non défini"}
              </Typography>
              <Typography variant="body1" color={colors.grey[100]} mt={1}>
                <strong>Loc :</strong> {user.localisation || "Non assigné"}
              </Typography>
            </Box>
            <Box>
              <IconButton
                onClick={() => handleOpenEditUserDialog(user)}
                sx={{
                  backgroundColor: colors.blueAccent[700],
                  color: colors.grey[100],
                  padding: "8px",
                  "&:hover": {
                    backgroundColor: colors.blueAccent[600],
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <EditIcon fontSize="medium" />
              </IconButton>
              <IconButton
                onClick={() => handleOpenDeleteDialog(user)}
                sx={{
                  backgroundColor: colors.redAccent[700],
                  color: colors.grey[100],
                  padding: "8px",
                  marginLeft: "8px",
                  "&:hover": {
                    backgroundColor: colors.redAccent[600],
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                <DeleteIcon fontSize="medium" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box m="20px" sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header title="GESTION DES OUVRIERS" subtitle="Liste des ouvriers" />
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
              "& .MuiInputBase-input": { color: colors.grey[100], padding: "10px" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: colors.grey[500] },
                "&:hover fieldset": { borderColor: colors.grey[300] },
                "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                borderRadius: "8px",
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
            padding: "10px 20px",
            borderRadius: "8px",
            boxShadow: `0 2px 5px ${colors.grey[900]}`,
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: colors.greenAccent[700],
              boxShadow: `0 4px 10px ${colors.grey[900]}`,
              transform: "translateY(-2px)",
            },
          }}
        >
          Ajouter un ouvrier
        </Button>
      </Box>

      {error ? (
        <Typography color={colors.redAccent[500]} variant="h5" textAlign="center">
          {error}
        </Typography>
      ) : loading ? (
        <Typography variant="h5" color={colors.grey[100]} textAlign="center">
          Chargement...
        </Typography>
      ) : users.length === 0 ? (
        <Typography variant="h5" color={colors.grey[100]} textAlign="center">
          Aucun ouvrier trouvé
        </Typography>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            p={3}
            borderRadius="16px"
            backgroundColor={colors.primary[500]}
            boxShadow={`0 6px 15px ${colors.primary[900]}`}
            sx={{
              flex: 1,
              overflowY: "auto",
              "&::-webkit-scrollbar": { width: "8px" },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: colors.grey[700],
                borderRadius: "4px",
              },
            }}
          >
            {filteredOuvriers.length === 0 ? (
              <Typography variant="body1" color={colors.grey[100]} textAlign="center">
                Aucun ouvrier trouvé
              </Typography>
            ) : (
              renderUserCards(filteredOuvriers)
            )}
          </Box>
        </Box>
      )}

      <Dialog open={openAddUserDialog} onClose={handleCloseAddUserDialog}>
        <DialogTitle sx={{ backgroundColor: colors.primary[700], color: colors.grey[100] }}>
          Ajouter un ouvrier
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
            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ color: colors.grey[300] }}>Localisation (Machine)</InputLabel>
              <Select
                name="localisation"
                value={formData.localisation}
                onChange={handleFormChange}
                label="Localisation (Machine)"
                required
                disabled={!formData.chaine_id}
                sx={{
                  color: colors.grey[100],
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[500] },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[300] },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.greenAccent[500] },
                }}
              >
                <MenuItem value="">Sélectionner une machine</MenuItem>
                {availableMachines.length > 0 ? (
                  availableMachines.map((machine) => (
                    <MenuItem key={machine.machine_id} value={machine.nom_machine}>
                      {machine.nom_machine}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    Aucune machine disponible
                  </MenuItem>
                )}
              </Select>
              {formErrors.localisation && (
                <Typography variant="caption" color={colors.redAccent[500]} sx={{ mt: 1 }}>
                  {formErrors.localisation}
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
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditUserDialog} onClose={handleCloseEditUserDialog}>
        <DialogTitle sx={{ backgroundColor: colors.primary[700], color: colors.grey[100] }}>
          Modifier l'ouvrier {selectedUser?.nom} {selectedUser?.prenom}
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
              helperText={editFormErrors.telephone || "Laisser vide pour ne pas modifier"}
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
                value={editFormData.chaine_id}
                onChange={handleEditFormChange}
                label="Chaîne"
                sx={{
                  color: colors.grey[100],
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[500] },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[300] },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.greenAccent[500] },
                }}
              >
                <MenuItem value="">Laisser inchangé</MenuItem>
                {chaines.map((chaine) => (
                  <MenuItem key={chaine.chaine_id} value={chaine.chaine_id}>
                    {chaine.nom_chaine}
                  </MenuItem>
                ))}
              </Select>
              {editFormErrors.chaine_id && (
                <Typography variant="caption" color={colors.redAccent[500]} sx={{ mt: 1 }}>
                  {editFormErrors.chaine_id}
                </Typography>
              )}
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ color: colors.grey[300] }}>Localisation (Machine)</InputLabel>
              <Select
                name="localisation"
                value={editFormData.localisation}
                onChange={handleEditFormChange}
                label="Localisation (Machine)"
                disabled={!editFormData.chaine_id}
                sx={{
                  color: colors.grey[100],
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[500] },
                  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[300] },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: colors.greenAccent[500] },
                }}
              >
                <MenuItem value="">Laisser inchangé</MenuItem>
                {availableMachinesEdit.length > 0 ? (
                  availableMachinesEdit.map((machine) => (
                    <MenuItem key={machine.machine_id} value={machine.nom_machine}>
                      {machine.nom_machine}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    Aucune machine disponible
                  </MenuItem>
                )}
              </Select>
              {editFormErrors.localisation && (
                <Typography variant="caption" color={colors.redAccent[500]} sx={{ mt: 1 }}>
                  {editFormErrors.localisation}
                </Typography>
              )}
            </FormControl>
            {editFormErrors.general && (
              <Typography variant="caption" color={colors.redAccent[500]} sx={{ mt: 1 }}>
                {editFormErrors.general}
              </Typography>
            )}
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
            Êtes-vous sûr de vouloir supprimer l'ouvrier {selectedUser?.nom} {selectedUser?.prenom} ?
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

export default WorkersManagement;