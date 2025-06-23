import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";

const AddWorker = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // État pour stocker les données du formulaire
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    role: "",
  });

  // État pour gérer les erreurs de validation
  const [errors, setErrors] = useState({});

  // Gérer les changements dans les champs du formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Valider le formulaire
  const validateForm = () => {
    const newErrors = {};
    if (!formData.nom) newErrors.nom = "Le nom est requis";
    if (!formData.prenom) newErrors.prenom = "Le prénom est requis";
    if (!formData.email) {
      newErrors.email = "L'email est requis";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }
    if (!formData.telephone) {
      newErrors.telephone = "Le numéro de téléphone est requis";
    } else if (!/^\d{10}$/.test(formData.telephone)) {
      newErrors.telephone = "Le numéro de téléphone doit contenir 10 chiffres";
    }
    if (!formData.role) newErrors.role = "Le rôle est requis";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Gérer la soumission du formulaire
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Simuler l'envoi des données (afficher dans la console pour l'instant)
      console.log("Données du nouvel ouvrier :", formData);
      // Réinitialiser le formulaire après soumission
      setFormData({
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        role: "",
      });
      setErrors({});
    }
  };

  return (
    <Box m="20px">
      <Header
        title="AJOUTER UN OUVRIER"
        subtitle="Remplissez le formulaire pour ajouter un nouvel ouvrier"
      />
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: colors.primary[400],
          padding: "20px",
          borderRadius: "8px",
          boxShadow: `0 4px 8px ${colors.primary[900]}`,
        }}
      >
        {/* Champ Nom */}
        <TextField
          fullWidth
          margin="normal"
          label="Nom"
          name="nom"
          value={formData.nom}
          onChange={handleChange}
          error={!!errors.nom}
          helperText={errors.nom}
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

        {/* Champ Prénom */}
        <TextField
          fullWidth
          margin="normal"
          label="Prénom"
          name="prenom"
          value={formData.prenom}
          onChange={handleChange}
          error={!!errors.prenom}
          helperText={errors.prenom}
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

        {/* Champ Email */}
        <TextField
          fullWidth
          margin="normal"
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={!!errors.email}
          helperText={errors.email}
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

        {/* Champ Téléphone */}
        <TextField
          fullWidth
          margin="normal"
          label="Téléphone (10 chiffres)"
          name="telephone"
          value={formData.telephone}
          onChange={handleChange}
          error={!!errors.telephone}
          helperText={errors.telephone}
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

        {/* Champ Rôle */}
        <FormControl
          fullWidth
          margin="normal"
          sx={{
            "& .MuiInputLabel-root": { color: colors.grey[300] },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: colors.grey[500] },
              "&:hover fieldset": { borderColor: colors.grey[300] },
              "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
            },
            "& .MuiSelect-select": { color: colors.grey[100] },
          }}
        >
          <InputLabel id="role-label">Rôle</InputLabel>
          <Select
            labelId="role-label"
            name="role"
            value={formData.role}
            onChange={handleChange}
            error={!!errors.role}
            required
          >
            <MenuItem value="" disabled>
              Sélectionner un rôle
            </MenuItem>
            <MenuItem value="ouvriere">Ouvrière</MenuItem>
            <MenuItem value="responsable">Responsable</MenuItem>
            <MenuItem value="direction">Direction</MenuItem>
          </Select>
          {errors.role && (
            <Typography
              variant="caption"
              color={colors.redAccent[500]}
              sx={{ mt: 1 }}
            >
              {errors.role}
            </Typography>
          )}
        </FormControl>

        {/* Bouton de Soumission */}
        <Box display="flex" justifyContent="flex-end" mt={3}>
          <Button
            type="submit"
            variant="contained"
            sx={{
              backgroundColor: colors.greenAccent[500],
              color: colors.grey[100],
              "&:hover": { backgroundColor: colors.greenAccent[700] },
            }}
          >
            Ajouter l'Ouvrier
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AddWorker;