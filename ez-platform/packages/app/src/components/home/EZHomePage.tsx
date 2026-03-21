import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Content, Header, Page } from '@backstage/core-components';

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  accent:  '#00e5a0',
  blue:    '#3d7eff',
  red:     '#ff6b4a',
  amber:   '#ffb547',
  surface: '#111418',
  border:  'rgba(255,255,255,0.07)',
  muted:   'rgba(255,255,255,0.35)',
  sub:     'rgba(255,255,255,0.6)',
} as const;

// ── Mock data ────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Services',    value: '24', delta: '+3 this week',  color: T.accent, up: true  },
  { label: 'Deployments', value: '18', delta: '+2 today',      color: T.blue,   up: true  },
  { label: 'Open Alerts', value: '3',  delta: '−1 since yesterday', color: T.red, up: false },
  { label: 'Pipelines',   value: '12', delta: '+5 today',      color: T.amber,  up: true  },
];

const PIPELINES = [
  { name: 'api-gateway',       branch: 'main',        status: 'success', ago: '4m ago',   duration: '1m 42s' },
  { name: 'auth-service',      branch: 'feat/oauth2',  status: 'running', ago: 'now',      duration: '—'      },
  { name: 'frontend',          branch: 'main',         status: 'success', ago: '18m ago',  duration: '3m 05s' },
  { name: 'billing-service',   branch: 'fix/invoice',  status: 'failed',  ago: '32m ago',  duration: '2m 11s' },
  { name: 'notification-svc',  branch: 'main',         status: 'success', ago: '1h ago',   duration: '0m 58s' },
];

const ALERTS = [
  { title: 'High CPU — api-gateway (prod)',      sev: 'critical', ago: '8m'  },
  { title: 'Disk > 85% — db-primary (prod)',     sev: 'warning',  ago: '23m' },
  { title: 'Build failure — billing-service',    sev: 'error',    ago: '32m' },
];

const QUICK_ACTIONS = [
  { label: 'Create Service',   icon: '✦', to: '/create'       },
  { label: 'Browse Catalog',   icon: '⊞', to: '/catalog'      },
  { label: 'View Docs',        icon: '⊡', to: '/docs'         },
  { label: 'API Explorer',     icon: '⟡', to: '/api-docs'     },
  { label: 'Catalog Graph',    icon: '◎', to: '/catalog-graph' },
  { label: 'Settings',         icon: '⚙', to: '/settings'     },
];

const SERVICES = [
  { name: 'api-gateway',      kind: 'Service', owner: 'platform',  env: 'prod',    health: 'Healthy',    deploy: '4m ago'  },
  { name: 'auth-service',     kind: 'Service', owner: 'identity',  env: 'staging', health: 'Deploying',  deploy: 'now'     },
  { name: 'frontend',         kind: 'Website', owner: 'ui-team',   env: 'prod',    health: 'Healthy',    deploy: '18m ago' },
  { name: 'billing-service',  kind: 'Service', owner: 'payments',  env: 'prod',    health: 'Degraded',   deploy: '32m ago' },
  { name: 'notification-svc', kind: 'Service', owner: 'platform',  env: 'prod',    health: 'Healthy',    deploy: '1h ago'  },
  { name: 'data-pipeline',    kind: 'Library', owner: 'data-team', env: 'prod',    health: 'Healthy',    deploy: '3h ago'  },
];

const SCORECARD = [
  { label: 'Has owner',        score: 96 },
  { label: 'Has TechDocs',     score: 72 },
  { label: 'Has SLOs defined', score: 58 },
  { label: 'SBOM attached',    score: 83 },
  { label: 'Secrets scanned',  score: 91 },
  { label: 'On-call assigned', score: 67 },
];

const INFRA = [
  { env: 'Production',  nodes: 12, pods: 48, health: 'Healthy',   cluster: 'eks-prod-eu-west-1' },
  { env: 'Staging',     nodes: 4,  pods: 16, health: 'Healthy',   cluster: 'eks-stg-eu-west-1'  },
  { env: 'Dev',         nodes: 2,  pods: 8,  health: 'Degraded',  cluster: 'eks-dev-eu-west-1'  },
];

// ── Helper: status colour / badge ────────────────────────────────────────────
const statusColor = (s: string) => {
  if (s === 'success' || s === 'Healthy')   return T.accent;
  if (s === 'failed'  || s === 'Degraded')  return T.red;
  if (s === 'running' || s === 'Deploying') return T.blue;
  if (s === 'warning' || s === 'warning')   return T.amber;
  return T.muted;
};

const Dot = ({ status }: { status: string }) => (
  <Box
    component="span"
    sx={{
      display:       'inline-block',
      width:         8,
      height:        8,
      borderRadius:  '50%',
      backgroundColor: statusColor(status),
      mr: 1,
      flexShrink: 0,
      ...(status === 'running' || status === 'Deploying'
        ? {
            animation: 'pulse 1.4s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%':       { opacity: 0.35 },
            },
          }
        : {}),
    }}
  />
);

const SevChip = ({ sev }: { sev: string }) => {
  const colors: Record<string, string> = {
    critical: T.red,
    error:    T.red,
    warning:  T.amber,
    info:     T.blue,
  };
  return (
    <Chip
      label={sev}
      size="small"
      sx={{
        height:          18,
        fontSize:        '0.65rem',
        backgroundColor: `${colors[sev] ?? T.muted}22`,
        color:           colors[sev] ?? T.muted,
        border:          `1px solid ${colors[sev] ?? T.muted}44`,
        borderRadius:    '3px',
      }}
    />
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontFamily:  "'Syne', sans-serif",
      fontWeight:  700,
      fontSize:    '0.9rem',
      color:       'rgba(255,255,255,0.85)',
      mb:          1.5,
      letterSpacing: '0.01em',
    }}
  >
    {children}
  </Typography>
);

const StatCard = ({ label, value, delta, color, up }: typeof STATS[0]) => (
  <Card
    sx={{
      borderTop:       `2px solid ${color}`,
      height:          '100%',
      transition:      'border-color 0.2s',
      '&:hover': { borderColor: color, boxShadow: `0 0 0 1px ${color}20` },
    }}
  >
    <CardContent sx={{ p: '20px !important' }}>
      <Typography sx={{ fontFamily: "'DM Mono', monospace", fontSize: '2rem', fontWeight: 500, color, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', color: up ? T.accent : T.red, mt: 0.5 }}>
        {delta}
      </Typography>
    </CardContent>
  </Card>
);

const PipelineFeed = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: '16px !important' }}>
      <SectionTitle>Recent Pipelines</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {PIPELINES.map(p => (
          <Box
            key={p.name}
            sx={{
              display:      'flex',
              alignItems:   'center',
              gap:          1,
              py:           '7px',
              px:           '10px',
              borderRadius: '6px',
              '&:hover':    { backgroundColor: 'rgba(255,255,255,0.03)' },
            }}
          >
            <Dot status={p.status} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: T.muted, fontFamily: "'DM Mono', monospace" }}>
                {p.branch}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
              <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>{p.ago}</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: T.muted, fontFamily: "'DM Mono', monospace" }}>{p.duration}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

const AlertsFeed = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: '16px !important' }}>
      <SectionTitle>Active Alerts</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {ALERTS.map(a => (
          <Box
            key={a.title}
            sx={{
              p:            '10px 12px',
              borderRadius: '6px',
              border:       `1px solid ${statusColor(a.sev)}22`,
              backgroundColor: `${statusColor(a.sev)}08`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <SevChip sev={a.sev} />
              <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>{a.ago} ago</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.35 }}>
              {a.title}
            </Typography>
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

const QuickActions = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: '16px !important' }}>
      <SectionTitle>Quick Actions</SectionTitle>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        {QUICK_ACTIONS.map(a => (
          <Box
            key={a.label}
            component="a"
            href={a.to}
            sx={{
              display:         'flex',
              flexDirection:   'column',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             0.5,
              p:               '12px 8px',
              borderRadius:    '6px',
              border:          `1px solid ${T.border}`,
              backgroundColor: 'rgba(255,255,255,0.02)',
              textDecoration:  'none',
              cursor:          'pointer',
              transition:      'all 0.15s ease',
              '&:hover': {
                backgroundColor: `${T.accent}0d`,
                borderColor:     `${T.accent}40`,
              },
            }}
          >
            <Typography sx={{ fontSize: '1.1rem', color: T.accent, lineHeight: 1 }}>{a.icon}</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: T.sub, textAlign: 'center', lineHeight: 1.2 }}>{a.label}</Typography>
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

const ServiceCatalog = () => (
  <Card>
    <CardContent sx={{ p: '16px !important' }}>
      <SectionTitle>Service Catalog</SectionTitle>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {['Service', 'Kind', 'Owner', 'Env', 'Health', 'Last Deploy'].map(h => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {SERVICES.map(s => (
              <TableRow key={s.name}>
                <TableCell>
                  <Typography sx={{ fontFamily: "'DM Mono', monospace", fontSize: '0.82rem', color: T.accent }}>
                    {s.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={s.kind} size="small" sx={{ height: 18, fontSize: '0.67rem', backgroundColor: `${T.blue}18`, color: T.blue, border: `1px solid ${T.blue}33`, borderRadius: '3px' }} />
                </TableCell>
                <TableCell sx={{ color: T.sub, fontSize: '0.8rem' }}>{s.owner}</TableCell>
                <TableCell sx={{ color: T.muted, fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>{s.env}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Dot status={s.health} />
                    <Typography sx={{ fontSize: '0.8rem', color: statusColor(s.health) }}>{s.health}</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ color: T.muted, fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>{s.deploy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </CardContent>
  </Card>
);

const GoldenPathScorecard = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: '16px !important' }}>
      <SectionTitle>Golden Path Scorecard</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {SCORECARD.map(item => (
          <Box key={item.label}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.78rem', color: T.sub }}>{item.label}</Typography>
              <Typography sx={{ fontSize: '0.78rem', fontFamily: "'DM Mono', monospace", color: item.score >= 80 ? T.accent : item.score >= 60 ? T.amber : T.red }}>
                {item.score}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={item.score}
              sx={{
                '& .MuiLinearProgress-bar': {
                  backgroundColor: item.score >= 80 ? T.accent : item.score >= 60 ? T.amber : T.red,
                },
              }}
            />
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

const InfraOverview = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: '16px !important' }}>
      <SectionTitle>Infrastructure Overview</SectionTitle>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {INFRA.map(e => (
          <Box
            key={e.env}
            sx={{
              p:            '12px',
              borderRadius: '6px',
              border:       `1px solid ${statusColor(e.health)}22`,
              backgroundColor: `${statusColor(e.health)}07`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Dot status={e.health} />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{e.env}</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.7rem', color: statusColor(e.health), fontWeight: 500 }}>{e.health}</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.7rem', color: T.muted, fontFamily: "'DM Mono', monospace", mb: 0.75 }}>
              {e.cluster}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>Nodes</Typography>
                <Typography sx={{ fontSize: '0.9rem', fontFamily: "'DM Mono', monospace", color: T.blue, fontWeight: 500 }}>{e.nodes}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.7rem', color: T.muted }}>Pods</Typography>
                <Typography sx={{ fontSize: '0.9rem', fontFamily: "'DM Mono', monospace", color: T.blue, fontWeight: 500 }}>{e.pods}</Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </CardContent>
  </Card>
);

// ── Page ─────────────────────────────────────────────────────────────────────
export const EZHomePage = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <Page themeId="home">
      <Header
        title="Platform Overview"
        subtitle={`${dateStr} · ${timeStr}`}
      />
      <Content>
        {/* ── Stat cards ── */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {STATS.map(s => (
            <Grid item xs={12} sm={6} md={3} key={s.label}>
              <StatCard {...s} />
            </Grid>
          ))}
        </Grid>

        {/* ── Middle row: pipelines / alerts / quick actions ── */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={5}>
            <PipelineFeed />
          </Grid>
          <Grid item xs={12} md={4}>
            <AlertsFeed />
          </Grid>
          <Grid item xs={12} md={3}>
            <QuickActions />
          </Grid>
        </Grid>

        {/* ── Service catalog ── */}
        <Box sx={{ mb: 2 }}>
          <ServiceCatalog />
        </Box>

        {/* ── Scorecard + infra ── */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <GoldenPathScorecard />
          </Grid>
          <Grid item xs={12} md={6}>
            <InfraOverview />
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
