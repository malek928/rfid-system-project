import { useState } from "react";
import { Box, TextField, Button, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";

const Login = ({ setIsAuthenticated, setUserRole }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("utilisateur_id", data.utilisateur_id);
      localStorage.setItem("nom", data.nom);
      localStorage.setItem("prenom", data.prenom);
      localStorage.setItem("chaine_id", data.chaine_id);

      setIsAuthenticated(true);
      const decodedToken = JSON.parse(atob(data.token.split('.')[1]));
      const role = decodedToken.role.toLowerCase();
      setUserRole(role);

      if (role === "operateur") navigate("/my-tasks");
      else if (role === "responsable") navigate("/lots/general");
      else if (role === "direction") navigate("/analysis");
      else throw new Error("Rôle non reconnu");
    } catch (err) {
      if (err.message.includes("404")) {
        setError("Erreur : Le serveur backend n'est pas accessible. Vérifiez qu'il est démarré sur http://localhost:5000.");
      } else {
        setError(err.message || "Erreur réseau. Veuillez réessayer.");
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        background: `linear-gradient(135deg, #1F2A44 0%, #2A3B5A 70%, #3A4D6E 100%)`, // Dégradé subtil
        backgroundSize: "cover",
        animation: "gradientShift 10s ease infinite", // Animation lente du dégradé
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(circle, rgba(0, 200, 83, 0.1) 0%, transparent 70%)", // Motif radial discret
          zIndex: 0,
        },
      }}
    >
      {/* Style CSS pour l'animation du dégradé */}
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}
      </style>

      <Box
        sx={{
          position: "relative",
          maxWidth: "450px",
          width: "100%",
          p: 4,
          borderRadius: "12px",
          backgroundColor: "rgba(31, 42, 68, 0.9)",
          boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(5px)",
          zIndex: 1, // Assure que le formulaire est au-dessus du fond
        }}
      >
        {/* Logo amélioré avec bordure dégradée, animation et fond */}
        <Box sx={{ textAlign: "center", mb: 4, position: "relative" }}>
          <Box
            sx={{
              display: "inline-block",
              p: 1,
              background: "linear-gradient(135deg, #1F2A44, #2A3B5A)",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
            }}
          >
            <img
              src="/assets/img.png"
              alt="Logo de Connexion"
              style={{
                maxWidth: "180px",
                height: "auto",
                border: "3px solid transparent",
                borderImage: "linear-gradient(45deg, #00C853, #00B04C) 1",
                borderRadius: "10px",
                boxShadow: "0 6px 12px rgba(0, 200, 83, 0.4)",
                padding: "6px",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              sx={{
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: "0 8px 16px rgba(0, 200, 83, 0.6)",
                },
              }}
            />
          </Box>
        </Box>

        <Header
          title="CONNEXION"
          subtitle="Entrez vos identifiants pour accéder au système"
          sx={{ mb: 3, textAlign: "center" }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: "8px" }}>
            {error}
          </Alert>
        )}
        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={{
              "& .MuiInputBase-input": { color: "#D1D1D1" },
              "& .MuiInputLabel-root": { color: "#A0A0A0" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#A0A0A0" },
                "&:hover fieldset": { borderColor: "#FFFFFF" },
                "&.Mui-focused fieldset": { borderColor: "#00C853" },
              },
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
            }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{
              "& .MuiInputBase-input": { color: "#D1D1D1" },
              "& .MuiInputLabel-root": { color: "#A0A0A0" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#A0A0A0" },
                "&:hover fieldset": { borderColor: "#FFFFFF" },
                "&.Mui-focused fieldset": { borderColor: "#00C853" },
              },
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
            }}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{
              mt: 2,
              py: 1.5,
              backgroundColor: "#00C853",
              "&:hover": { backgroundColor: "#00B04C" },
              color: "#FFFFFF",
              textTransform: "none",
              fontSize: "1.1rem",
              borderRadius: "8px",
            }}
          >
            Se connecter
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;