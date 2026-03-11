export interface ReliabilityIncident {
  id: string;
  date?: Date | string;
  system?: string;
  subsystem?: string;
  causeType?: string;
  controlScope?: string;
  severity?: string;
  status?: string;
  durationMin?: number;
  description?: string;
  owner?: string;
  rootCause?: string;
}

export const CAUSE_TYPE_CHOICES = [
  { id: 'internal', name: 'Interno' },
  { id: 'infrastructure', name: 'Infraestructura' },
  { id: 'external', name: 'Externo' },
  { id: 'network', name: 'Red / CDN' },
  { id: 'client', name: 'Cliente / Usuario' },
];

export const CONTROL_SCOPE_CHOICES = [
  { id: 'controllable', name: 'Controlable' },
  { id: 'external', name: 'Externo' },
];

export const SEVERITY_CHOICES = [
  { id: 'critical', name: 'Crítica' },
  { id: 'high', name: 'Alta' },
  { id: 'medium', name: 'Media' },
  { id: 'low', name: 'Baja' },
];

export const STATUS_CHOICES = [
  { id: 'open', name: 'Abierto' },
  { id: 'investigating', name: 'Investigando' },
  { id: 'resolved', name: 'Resuelto' },
];

const CAUSE_TYPE_LABELS = Object.fromEntries(
  CAUSE_TYPE_CHOICES.map((choice) => [choice.id, choice.name])
);

const CONTROL_SCOPE_LABELS = Object.fromEntries(
  CONTROL_SCOPE_CHOICES.map((choice) => [choice.id, choice.name])
);

const SEVERITY_LABELS = Object.fromEntries(
  SEVERITY_CHOICES.map((choice) => [choice.id, choice.name])
);

const STATUS_LABELS = Object.fromEntries(
  STATUS_CHOICES.map((choice) => [choice.id, choice.name])
);

export const RELIABILITY_COLORS = ['#FF6B35', '#2B2D42', '#4CAF50', '#2196F3', '#9C27B0'];

export const getChoiceLabel = (value: string | undefined, map: Record<string, string>, fallback = 'Sin definir') =>
  value ? map[value] ?? value : fallback;

export const getCauseTypeLabel = (value?: string) => getChoiceLabel(value, CAUSE_TYPE_LABELS);
export const getControlScopeLabel = (value?: string) => getChoiceLabel(value, CONTROL_SCOPE_LABELS);
export const getSeverityLabel = (value?: string) => getChoiceLabel(value, SEVERITY_LABELS);
export const getStatusLabel = (value?: string) => getChoiceLabel(value, STATUS_LABELS);

export const parseIncidentDate = (value?: Date | string) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end: now };
};

export const filterCurrentMonthIncidents = (incidents: ReliabilityIncident[]) => {
  const { start, end } = getCurrentMonthRange();

  return incidents.filter((incident) => {
    const incidentDate = parseIncidentDate(incident.date);
    return incidentDate && incidentDate >= start && incidentDate <= end;
  });
};

export const inferControlScope = (incident: ReliabilityIncident) => {
  if (incident.controlScope) return incident.controlScope;
  return incident.causeType === 'internal' || incident.causeType === 'infrastructure'
    ? 'controllable'
    : 'external';
};

export const computeReliabilityStats = (incidents: ReliabilityIncident[]) => {
  const monthlyIncidents = filterCurrentMonthIncidents(incidents);
  const { start, end } = getCurrentMonthRange();
  const totalMinutes = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 60000));
  const downtimeMinutes = monthlyIncidents.reduce((sum, incident) => sum + (Number(incident.durationMin) || 0), 0);
  const incidentCount = monthlyIncidents.length;
  const availability = Math.max(0, ((totalMinutes - downtimeMinutes) / totalMinutes) * 100);
  const mttr = incidentCount > 0 ? downtimeMinutes / incidentCount : 0;
  const mtbf = incidentCount > 1 ? (totalMinutes - downtimeMinutes) / (incidentCount - 1) : totalMinutes - downtimeMinutes;

  return {
    monthlyIncidents,
    totalMinutes,
    downtimeMinutes,
    incidentCount,
    availability,
    mttr,
    mtbf,
  };
};

const aggregate = (
  incidents: ReliabilityIncident[],
  keySelector: (incident: ReliabilityIncident) => string,
  valueSelector: (incident: ReliabilityIncident) => number
) => {
  const map = new Map<string, number>();

  incidents.forEach((incident) => {
    const key = keySelector(incident);
    const current = map.get(key) ?? 0;
    map.set(key, current + valueSelector(incident));
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const aggregateDowntimeByCause = (incidents: ReliabilityIncident[]) =>
  aggregate(
    incidents,
    (incident) => getCauseTypeLabel(incident.causeType),
    (incident) => Number(incident.durationMin) || 0
  );

export const aggregateIncidentsBySubsystem = (incidents: ReliabilityIncident[]) =>
  aggregate(
    incidents,
    (incident) => incident.subsystem || incident.system || 'Sin sistema',
    () => 1
  );

export const aggregateIncidentsByScope = (incidents: ReliabilityIncident[]) =>
  aggregate(
    incidents,
    (incident) => getControlScopeLabel(inferControlScope(incident)),
    () => 1
  );

export const computeAvailabilityByScope = (incidents: ReliabilityIncident[]) => {
  const { totalMinutes } = computeReliabilityStats(incidents);
  const monthlyIncidents = filterCurrentMonthIncidents(incidents);
  const controllableDowntime = monthlyIncidents
    .filter((incident) => inferControlScope(incident) === 'controllable')
    .reduce((sum, incident) => sum + (Number(incident.durationMin) || 0), 0);
  const externalDowntime = monthlyIncidents
    .filter((incident) => inferControlScope(incident) === 'external')
    .reduce((sum, incident) => sum + (Number(incident.durationMin) || 0), 0);

  return {
    controllableAvailability: Math.max(0, ((totalMinutes - controllableDowntime) / totalMinutes) * 100),
    externalAvailability: Math.max(0, ((totalMinutes - externalDowntime) / totalMinutes) * 100),
    controllableDowntime,
    externalDowntime,
  };
};

export const formatMinutes = (minutes: number) => {
  if (!minutes) return '0 min';

  const roundedMinutes = Math.round(minutes);
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} h`;

  return `${hours} h ${remainingMinutes} min`;
};

export const formatPercentage = (value: number) => `${value.toFixed(2)}%`;
