import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useSidebarState } from 'react-admin';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PsychologyIcon from '@mui/icons-material/Psychology';
import ChatIcon from '@mui/icons-material/Chat';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const itemStyles = {
  px: 3,
  py: 1.4,
  color: '#2B2D42',
  '&:hover': {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    color: '#FF6B35',
  },
  '&.Mui-selected': {
    color: '#FF6B35',
    fontWeight: 600,
    borderLeft: '3px solid #FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
  },
};

const MenuLinkItem = ({
  to,
  label,
  icon,
  active,
  nested = false,
  onClick,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  nested?: boolean;
  onClick?: () => void;
}) => (
  <ListItemButton
    component={RouterLink}
    to={to}
    selected={active}
    onClick={onClick}
    sx={{
      ...itemStyles,
      pl: nested ? 5.5 : 3,
    }}
  >
    <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{icon}</ListItemIcon>
    <ListItemText primary={label} />
  </ListItemButton>
);

export const AppMenu = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [, setOpen] = useSidebarState();

  const isAiRoute = useMemo(
    () =>
      location.pathname.startsWith('/ia') ||
      location.pathname.startsWith('/openlaila'),
    [location.pathname]
  );
  const [aiOpen, setAiOpen] = useState(isAiRoute);

  const handleNavClick = () => {
    if (isMobile) setOpen(false);
  };

  return (
    <Box sx={{ mt: 3, width: '240px', minWidth: '240px' }}>
      <List disablePadding>
        <MenuLinkItem to="/" label="Dashboard" icon={<DashboardIcon />} active={location.pathname === '/'} onClick={handleNavClick} />
        <MenuLinkItem
          to="/test_cases"
          label="Pruebas manuales"
          icon={<AssignmentIcon />}
          active={location.pathname.startsWith('/test_cases')}
          onClick={handleNavClick}
        />
        <MenuLinkItem
          to="/test_planning"
          label="Test plannings"
          icon={<EventNoteIcon />}
          active={location.pathname.startsWith('/test_planning')}
          onClick={handleNavClick}
        />
        <MenuLinkItem
          to="/automation"
          label="Automatización"
          icon={<PlayCircleIcon />}
          active={location.pathname.startsWith('/automation')}
          onClick={handleNavClick}
        />

        <ListItemButton
          onClick={() => setAiOpen((current) => !current)}
          selected={isAiRoute}
          sx={itemStyles}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <SmartToyIcon />
          </ListItemIcon>
          <ListItemText primary="IA" />
          {aiOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>

        <Collapse in={aiOpen || isAiRoute} timeout="auto" unmountOnExit>
          <List disablePadding>
            <MenuLinkItem
              to="/ia/chatbot"
              label="Chatbot"
              icon={<ChatIcon fontSize="small" />}
              active={
                location.pathname.startsWith('/ia/chatbot') ||
                location.pathname.startsWith('/openlaila')
              }
              nested
              onClick={handleNavClick}
            />
            <MenuLinkItem
              to="/ia/conocimiento"
              label="Base de conocimiento"
              icon={<MenuBookIcon fontSize="small" />}
              active={location.pathname.startsWith('/ia/conocimiento')}
              nested
              onClick={handleNavClick}
            />
            <MenuLinkItem
              to="/ia/instrucciones"
              label="Instrucciones del agente"
              icon={<PsychologyIcon fontSize="small" />}
              active={location.pathname.startsWith('/ia/instrucciones')}
              nested
              onClick={handleNavClick}
            />
          </List>
        </Collapse>

        <MenuLinkItem
          to="/configuration"
          label="Configuración"
          icon={<SettingsIcon />}
          active={location.pathname.startsWith('/configuration')}
          onClick={handleNavClick}
        />
      </List>
    </Box>
  );
};
