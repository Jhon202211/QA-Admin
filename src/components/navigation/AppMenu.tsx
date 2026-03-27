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
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import InsightsIcon from '@mui/icons-material/Insights';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import HubIcon from '@mui/icons-material/Hub';
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

  const isReliabilityRoute = useMemo(
    () => location.pathname.startsWith('/reliability') || location.pathname.startsWith('/system_incidents'),
    [location.pathname]
  );
  const [reliabilityOpen, setReliabilityOpen] = useState(isReliabilityRoute);

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
        <MenuLinkItem
          to="/test_results"
          label="Vista de resultados"
          icon={<AssessmentIcon />}
          active={location.pathname.startsWith('/test_results')}
          onClick={handleNavClick}
        />

        <ListItemButton
          onClick={() => setReliabilityOpen((current) => !current)}
          selected={isReliabilityRoute}
          sx={itemStyles}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <MonitorHeartIcon />
          </ListItemIcon>
          <ListItemText primary="Reliability" />
          {reliabilityOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>

        <Collapse in={reliabilityOpen || isReliabilityRoute} timeout="auto" unmountOnExit>
          <List disablePadding>
            <MenuLinkItem
              to="/reliability/dashboard"
              label="Dashboard"
              icon={<InsightsIcon fontSize="small" />}
              active={location.pathname.startsWith('/reliability/dashboard')}
              nested
              onClick={handleNavClick}
            />
            <MenuLinkItem
              to="/system_incidents"
              label="Incidentes"
              icon={<ReportProblemIcon fontSize="small" />}
              active={location.pathname.startsWith('/system_incidents')}
              nested
              onClick={handleNavClick}
            />
            <MenuLinkItem
              to="/reliability/analysis"
              label="Análisis"
              icon={<HubIcon fontSize="small" />}
              active={location.pathname.startsWith('/reliability/analysis')}
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
