import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import GeneralView from "./scenes/general-view";
import Production from "./scenes/production";
import Alerts from "./scenes/alerts";
import VueGlobale from "./scenes/vue_globale";
import Performance from "./scenes/performance";
import Profitability from "./scenes/profitability";
import LotsManagement from "./scenes/lots-management";
import WorkersManagement from "./scenes/WorkersManagement";
import StaffManagement from "./scenes/StaffManagement";
import MyTasks from "./scenes/my-tasks";
import Login from "./scenes/login/";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";

function App() {
  const [theme, colorMode] = useMode();
  const [isSidebar, setIsSidebar] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch("http://localhost:5000/api/verify-token", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.message === "Token valide") {
            setIsAuthenticated(true);
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            setUserRole(decodedToken.role.toLowerCase());
          } else {
            handleLogout();
          }
        })
        .catch(() => {
          handleLogout();
        });
    } else {
      setIsAuthenticated(false);
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("utilisateur_id");
    localStorage.removeItem("nom");
    localStorage.removeItem("prenom");
    localStorage.removeItem("chaine_id");
    setIsAuthenticated(false);
    setUserRole(null);
    navigate("/login");
  };

  const getDefaultRoute = () => {
    switch (userRole) {
      case "operateur":
        return "/my-tasks";
      case "responsable":
        return "/lots/management"; // Changé ici, car "responsable" n'a plus accès à /lots/general
      case "direction":
        return "/vue_globale";
      default:
        return "/login";
    }
  };

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="app">
          {isAuthenticated && <Sidebar isSidebar={isSidebar} userRole={userRole} />}
          <main className="content">
            {isAuthenticated && <Topbar setIsSidebar={setIsSidebar} handleLogout={handleLogout} />}
            <Routes>
              <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} setUserRole={setUserRole} />} />
              <Route
                path="/my-tasks"
                element={
                  isAuthenticated && userRole === "operateur" ? (
                    <MyTasks />
                  ) : (
                    <Navigate to={getDefaultRoute()} replace />
                  )
                }
              />
              <Route
                path="/lots/general"
                element={
                  isAuthenticated && userRole === "direction" ? ( // Supprimé userRole === "responsable"
                    <GeneralView />
                  ) : (
                    <Navigate to={getDefaultRoute()} replace />
                  )
                }
              />
              <Route
                path="/lots/management"
                element={
                  isAuthenticated && userRole === "responsable" ? (
                    <LotsManagement />
                  ) : (
                    <Navigate to={getDefaultRoute()} replace />
                  )
                }
              />
              <Route
                path="/production"
                element={
                  isAuthenticated && userRole === "responsable" ? (
                    <Production />
                  ) : (
                    <Navigate to={getDefaultRoute()} replace />
                  )
                }
              />
              <Route
                path="/alerts"
                element={
                  isAuthenticated && userRole === "direction" ? ( // Supprimé userRole === "responsable"
                    <Alerts />
                  ) : (
                    <Navigate to={getDefaultRoute()} replace />
                  )
                }
              />
              <Route
                path="/vue_globale"
                element={
                  isAuthenticated && userRole === "direction" ? (
                    <VueGlobale />
                  ) : (
                    <Navigate to={getDefaultRoute()} replace />
                  )
                }
              />
              <Route
                path="/vue_globale/performance"
                element={
                  isAuthenticated && userRole === "direction" ? (
                    <Performance />
                  ) : (
                    <Navigate to={getDefaultRoute()} replace />
                  )
                }
              />
              <Route
                path="/vue_globale/profitability"
                element={
                  isAuthenticated && userRole === "direction" ? (
                    <Profitability />
                  ) : (
                    <Navigate to={getDefaultRoute()} replace />
                  )
                }
              />
              <Route
                path="/lots/workers-management"
                element={
                  isAuthenticated && userRole === "direction" ? (
                    <WorkersManagement />
                  ) : (
                    <Navigate to={getDefaultRoute()} replace />
                  )
                }
              />
              <Route
                path="/lots/staff-management"
                element={
                  isAuthenticated && userRole === "direction" ? (
                    <StaffManagement />
                  ) : (
                    <Navigate to={getDefaultRoute()} replace />
                  )
                }
              />
              <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
              <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
            </Routes>
          </main>
        </div>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;