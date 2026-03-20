import {
  createBaseThemeOptions,
  createUnifiedTheme,
  genPageTheme,
  palettes,
  shapes,
} from '@backstage/theme';

/**
 * EZ Platform dark theme — matches the ui-preview design system.
 *
 * Design tokens:
 *   bg          #0a0c0f
 *   surface     #111418
 *   surface2    #181c22
 *   accent      #00e5a0  (primary green)
 *   accent2     #3d7eff  (blue)
 *   accent3     #ff6b4a  (error / orange)
 *   warn        #f5c518
 *   text        #e8ecf0
 *   muted       #5a6272
 */
export const ezDarkTheme = createUnifiedTheme({
  ...createBaseThemeOptions({
    palette: {
      ...palettes.dark,
      primary: {
        main: '#00e5a0',
        light: '#33ebb3',
        dark: '#00b87d',
        contrastText: '#000000',
      },
      secondary: {
        main: '#3d7eff',
        light: '#6699ff',
        dark: '#1a5cd6',
        contrastText: '#ffffff',
      },
      error: {
        main: '#ff6b4a',
        light: '#ff9070',
        dark: '#cc3d1a',
        contrastText: '#ffffff',
      },
      warning: {
        main: '#f5c518',
        light: '#f7d14a',
        dark: '#c4990c',
        contrastText: '#000000',
      },
      success: {
        main: '#00e5a0',
        light: '#33ebb3',
        dark: '#00b87d',
        contrastText: '#000000',
      },
      info: {
        main: '#3d7eff',
        contrastText: '#ffffff',
      },
      background: {
        default: '#0a0c0f',
        paper: '#111418',
      },
      text: {
        primary: '#e8ecf0',
        secondary: '#5a6272',
        disabled: '#3a404d',
      },
      divider: 'rgba(255,255,255,0.07)',
      navigation: {
        background: '#111418',
        indicator: '#00e5a0',
        color: '#5a6272',
        selectedColor: '#00e5a0',
        navItem: {
          hoverBackground: '#181c22',
        },
        submenu: {
          background: '#181c22',
        },
      },
    },
  }),

  defaultPageTheme: 'home',

  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',

  components: {
    BackstageHeader: {
      styleOverrides: {
        header: {
          backgroundImage: 'unset',
          backgroundColor: '#111418',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          boxShadow: 'none',
          paddingBottom: 8,
          paddingTop: 8,
          minHeight: 56,
        },
        title: {
          fontFamily: '"Syne", sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          color: '#e8ecf0',
          fontSize: '1.4rem',
        },
        subtitle: {
          color: '#5a6272',
        },
      },
    },

    BackstageSidebar: {
      styleOverrides: {
        drawer: {
          backgroundColor: '#111418',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          width: 220,
        },
        drawerPaper: {
          backgroundColor: '#111418',
          borderRight: '1px solid rgba(255,255,255,0.07)',
        },
      },
    },

    BackstageSidebarItem: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          marginLeft: 8,
          marginRight: 8,
          width: 'calc(100% - 16px)',
          '&:hover': {
            backgroundColor: '#181c22',
          },
        },
        selected: {
          backgroundColor: 'rgba(0,229,160,0.1) !important',
          color: '#00e5a0 !important',
          '& svg': {
            color: '#00e5a0',
          },
        },
        label: {
          fontSize: '0.84rem',
          fontWeight: 500,
        },
      },
    },

    BackstageSidebarPage: {
      styleOverrides: {
        root: {
          backgroundColor: '#0a0c0f',
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#111418',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          boxShadow: 'none',
          backgroundImage: 'none',
          transition: 'border-color 0.2s, transform 0.2s',
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.14)',
          },
        },
      },
    },

    MuiCardHeader: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '14px 20px',
        },
        title: {
          fontFamily: '"Syne", sans-serif',
          fontWeight: 700,
          fontSize: '0.9rem',
          color: '#e8ecf0',
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#111418',
          '& th': {
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#5a6272',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          },
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.02)',
          },
          '&:last-child td': {
            borderBottom: 'none',
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.82rem',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          padding: '10px 16px',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.82rem',
          boxShadow: 'none',
        },
        containedPrimary: {
          backgroundColor: '#00e5a0',
          color: '#000000',
          '&:hover': {
            backgroundColor: '#00ffa8',
            boxShadow: '0 4px 16px rgba(0,229,160,0.3)',
          },
        },
        outlinedPrimary: {
          borderColor: 'rgba(0,229,160,0.4)',
          color: '#00e5a0',
          '&:hover': {
            borderColor: '#00e5a0',
            backgroundColor: 'rgba(0,229,160,0.06)',
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 5,
          fontSize: '0.7rem',
          fontFamily: '"DM Mono", monospace',
          fontWeight: 600,
          height: 22,
        },
        colorPrimary: {
          backgroundColor: 'rgba(0,229,160,0.1)',
          color: '#00e5a0',
        },
        colorSecondary: {
          backgroundColor: 'rgba(61,126,255,0.1)',
          color: '#3d7eff',
        },
      },
    },

    MuiInputBase: {
      styleOverrides: {
        root: {
          backgroundColor: '#181c22',
          borderRadius: 8,
          fontSize: '0.85rem',
          '&:hover': {
            backgroundColor: '#1e2229',
          },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: 'rgba(255,255,255,0.07)',
        },
        root: {
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.14)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#00e5a0',
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#00e5a0',
          height: 2,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.84rem',
          color: '#5a6272',
          minHeight: 44,
          '&.Mui-selected': {
            color: '#00e5a0',
          },
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid',
        },
        standardError: {
          backgroundColor: 'rgba(255,107,74,0.08)',
          borderColor: 'rgba(255,107,74,0.2)',
          color: '#ff6b4a',
        },
        standardWarning: {
          backgroundColor: 'rgba(245,197,24,0.08)',
          borderColor: 'rgba(245,197,24,0.2)',
          color: '#f5c518',
        },
        standardSuccess: {
          backgroundColor: 'rgba(0,229,160,0.08)',
          borderColor: 'rgba(0,229,160,0.2)',
          color: '#00e5a0',
        },
        standardInfo: {
          backgroundColor: 'rgba(61,126,255,0.08)',
          borderColor: 'rgba(61,126,255,0.2)',
          color: '#3d7eff',
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 3,
          height: 5,
          backgroundColor: '#181c22',
        },
        barColorPrimary: {
          backgroundColor: '#00e5a0',
          borderRadius: 3,
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#181c22',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#e8ecf0',
          fontSize: '0.75rem',
          borderRadius: 6,
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.07)',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#111418',
          border: '1px solid rgba(255,255,255,0.07)',
        },
        elevation1: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        },
      },
    },
  },

  pageTheme: {
    home: genPageTheme({
      colors: ['#0a0c0f', '#111418'],
      shape: shapes.wave,
    }),
    documentation: genPageTheme({
      colors: ['#0a0c0f', '#111418'],
      shape: shapes.wave2,
    }),
    tool: genPageTheme({
      colors: ['#0a0c0f', '#111418'],
      shape: shapes.round,
    }),
    service: genPageTheme({
      colors: ['#111418', '#181c22'],
      shape: shapes.wave,
    }),
    website: genPageTheme({
      colors: ['#111418', '#181c22'],
      shape: shapes.wave,
    }),
    library: genPageTheme({
      colors: ['#111418', '#181c22'],
      shape: shapes.wave2,
    }),
    other: genPageTheme({
      colors: ['#0a0c0f', '#111418'],
      shape: shapes.wave,
    }),
    app: genPageTheme({
      colors: ['#111418', '#181c22'],
      shape: shapes.wave,
    }),
    apis: genPageTheme({
      colors: ['#0a0c0f', '#111418'],
      shape: shapes.wave2,
    }),
  },
});
