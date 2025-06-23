import { useState } from "react";
import {
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  IconButton,
  Typography,
  useTheme,
  Divider,
  ListSubheader,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { tokens } from "../../theme";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ContactsOutlinedIcon from "@mui/icons-material/ContactsOutlined";
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import TimelineOutlinedIcon from "@mui/icons-material/TimelineOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";

const Sidebar = ({ isSidebar, userRole }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const getRoleLabel = () => {
    switch (userRole) {
      case "operateur":
        return "Opérateur";
      case "responsable":
        return "Responsable";
      case "direction":
        return "Direction";
      default:
        return "Utilisateur";
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: isCollapsed ? 80 : 240,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: isCollapsed ? 80 : 240,
          boxSizing: "border-box",
          background: colors.primary[400],
          color: colors.grey[100],
          transition: "width 0.3s",
        },
      }}
    >
      <List>
        <ListItem
          onClick={() => setIsCollapsed(!isCollapsed)}
          sx={{
            margin: "10px 0 20px 0",
            color: colors.grey[100],
            justifyContent: isCollapsed ? "center" : "space-between",
          }}
        >
          {isCollapsed ? (
            <ListItemIcon sx={{ color: colors.grey[100] }}>
              <MenuOutlinedIcon />
            </ListItemIcon>
          ) : (
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ width: "100%", paddingLeft: "15px" }}
            >
              <Typography variant="h3" color={colors.grey[100]}>
                {getRoleLabel()}
              </Typography>
              <IconButton onClick={() => setIsCollapsed(!isCollapsed)}>
                <MenuOutlinedIcon sx={{ color: colors.grey[100] }} />
              </IconButton>
            </Box>
          )}
        </ListItem>

        <Box paddingLeft={isCollapsed ? 0 : "10%"}>
          {userRole === "responsable" && (
            <>
              <ListItem
                button
                onClick={() => navigate("/lots/management")}
                selected={window.location.pathname === "/lots/management"}
                sx={{
                  color: colors.grey[100],
                  paddingLeft: isCollapsed ? "20px" : "25px",
                  "&:hover": { backgroundColor: "#868dfb" },
                  "&.Mui-selected": { backgroundColor: "#6870fa" },
                }}
                component={Link}
                to="/lots/management"
              >
                <ListItemIcon sx={{ color: colors.grey[100], minWidth: "40px" }}>
                  <InventoryOutlinedIcon />
                </ListItemIcon>
                {!isCollapsed && <ListItemText primary="Gestion des Lots" />}
              </ListItem>

              <ListItem
                button
                onClick={() => navigate("/production")}
                selected={window.location.pathname === "/production"}
                sx={{
                  color: colors.grey[100],
                  paddingLeft: isCollapsed ? "20px" : "10%",
                  "&:hover": { backgroundColor: "#868dfb" },
                  "&.Mui-selected": { backgroundColor: "#6870fa" },
                }}
                component={Link}
                to="/production"
              >
                <ListItemIcon sx={{ color: colors.grey[100], minWidth: "40px" }}>
                  <ReceiptOutlinedIcon />
                </ListItemIcon>
                {!isCollapsed && <ListItemText primary="Production" />}
              </ListItem>
            </>
          )}

          {userRole === "direction" && (
            <>
              <ListItem
                button
                onClick={() => navigate("/lots/general")}
                selected={window.location.pathname === "/lots/general"}
                sx={{
                  color: colors.grey[100],
                  paddingLeft: isCollapsed ? "20px" : "25px",
                  "&:hover": { backgroundColor: "#868dfb" },
                  "&.Mui-selected": { backgroundColor: "#6870fa" },
                }}
                component={Link}
                to="/lots/general"
              >
                <ListItemIcon sx={{ color: colors.grey[100], minWidth: "40px" }}>
                  <HomeOutlinedIcon />
                </ListItemIcon>
                {!isCollapsed && <ListItemText primary="Vue Générale" />}
              </ListItem>

              <ListItem
                button
                onClick={() => navigate("/alerts")}
                selected={window.location.pathname === "/alerts"}
                sx={{
                  color: colors.grey[100],
                  paddingLeft: isCollapsed ? "20px" : "10%",
                  "&:hover": { backgroundColor: "#868dfb" },
                  "&.Mui-selected": { backgroundColor: "#6870fa" },
                }}
                component={Link}
                to="/alerts"
              >
                <ListItemIcon sx={{ color: colors.grey[100], minWidth: "40px" }}>
                  <ContactsOutlinedIcon />
                </ListItemIcon>
                {!isCollapsed && <ListItemText primary="Alertes" />}
              </ListItem>

              <ListItem
                button
                onClick={() => navigate("/vue_globale")}
                selected={window.location.pathname === "/vue_globale"}
                sx={{
                  color: colors.grey[100],
                  paddingLeft: isCollapsed ? "20px" : "25px",
                  "&:hover": { backgroundColor: "#868dfb" },
                  "&.Mui-selected": { backgroundColor: "#6870fa" },
                }}
                component={Link}
                to="/vue_globale"
              >
                <ListItemIcon sx={{ color: colors.grey[100], minWidth: "40px" }}>
                  <BarChartOutlinedIcon />
                </ListItemIcon>
                {!isCollapsed && <ListItemText primary="Vue Globale" />}
              </ListItem>

              <ListSubheader
                sx={{
                  backgroundColor: colors.primary[400],
                  color: colors.grey[100],
                  fontSize: "16px",
                  fontWeight: "bold",
                  paddingLeft: isCollapsed ? "20px" : "25px",
                  display: isCollapsed ? "none" : "block",
                }}
              >
                Gestion des Utilisateurs
              </ListSubheader>

              <ListItem
                button
                onClick={() => navigate("/lots/workers-management")}
                selected={window.location.pathname === "/lots/workers-management"}
                sx={{
                  color: colors.grey[100],
                  paddingLeft: isCollapsed ? "20px" : "25px",
                  "&:hover": { backgroundColor: "#868dfb" },
                  "&.Mui-selected": { backgroundColor: "#6870fa" },
                }}
                component={Link}
                to="/lots/workers-management"
              >
                <ListItemIcon sx={{ color: colors.grey[100], minWidth: "40px" }}>
                  <PeopleOutlinedIcon />
                </ListItemIcon>
                {!isCollapsed && <ListItemText primary="Gestion des Ouvriers" />}
              </ListItem>

              <ListItem
                button
                onClick={() => navigate("/lots/staff-management")}
                selected={window.location.pathname === "/lots/staff-management"}
                sx={{
                  color: colors.grey[100],
                  paddingLeft: isCollapsed ? "20px" : "25px",
                  "&:hover": { backgroundColor: "#868dfb" },
                  "&.Mui-selected": { backgroundColor: "#6870fa" },
                }}
                component={Link}
                to="/lots/staff-management"
              >
                <ListItemIcon sx={{ color: colors.grey[100], minWidth: "40px" }}>
                  <PeopleOutlinedIcon />
                </ListItemIcon>
                {!isCollapsed && <ListItemText primary="Gérer l'Équipe" />}
              </ListItem>
            </>
          )}

          {userRole === "operateur" && (
            <ListItem
              button
              onClick={() => navigate("/my-tasks")}
              selected={window.location.pathname === "/my-tasks"}
              sx={{
                color: colors.grey[100],
                paddingLeft: isCollapsed ? "20px" : "10%",
                "&:hover": { backgroundColor: "#868dfb" },
                "&.Mui-selected": { backgroundColor: "#6870fa" },
              }}
              component={Link}
              to="/my-tasks"
            >
              <ListItemIcon sx={{ color: colors.grey[100], minWidth: "40px" }}>
                <PeopleOutlinedIcon />
              </ListItemIcon>
              {!isCollapsed && <ListItemText primary="Préparer les Lots" />}
            </ListItem>
          )}
        </Box>
      </List>
    </Drawer>
  );
};

export default Sidebar;