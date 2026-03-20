import React, { PropsWithChildren } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import HomeIcon from '@material-ui/icons/Home';
import ExtensionIcon from '@material-ui/icons/Extension';
import LibraryBooks from '@material-ui/icons/LibraryBooks';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import MapIcon from '@material-ui/icons/AccountTree';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import SettingsIcon from '@material-ui/icons/Settings';
import TimelineIcon from '@material-ui/icons/Timeline';
import CloudIcon from '@material-ui/icons/Cloud';
import SecurityIcon from '@material-ui/icons/Security';
import CodeIcon from '@material-ui/icons/Code';
import {
  Link,
  Sidebar,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarPage,
  SidebarScrollWrapper,
  SidebarSpace,
  useSidebarOpenState,
} from '@backstage/core-components';
import { SidebarSearchModal } from '@backstage/plugin-search';
import { MyGroupsSidebarItem } from '@backstage/plugin-org';
import GroupIcon from '@material-ui/icons/People';

const useSidebarLogoStyles = makeStyles({
  root: {
    width: '100%',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    gap: 10,
    flexShrink: 0,
    textDecoration: 'none',
    '&:hover': { textDecoration: 'none' },
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#00e5a0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Syne", sans-serif',
    fontWeight: 800,
    fontSize: 16,
    color: '#000',
    flexShrink: 0,
    letterSpacing: '-0.5px',
  },
  logoText: {
    fontFamily: '"Syne", sans-serif',
    fontWeight: 700,
    fontSize: 18,
    color: '#e8ecf0',
    letterSpacing: '-0.5px',
    '& span': { color: '#00e5a0' },
  },
});

const SidebarLogo = () => {
  const classes = useSidebarLogoStyles();
  const { isOpen } = useSidebarOpenState();

  return (
    <Link to="/" underline="none" className={classes.root}>
      <div className={classes.logoMark}>EZ</div>
      {isOpen && (
        <div className={classes.logoText}>
          Platform<span>.</span>
        </div>
      )}
    </Link>
  );
};

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />

      <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
        <SidebarSearchModal />
      </SidebarGroup>

      <SidebarDivider />

      {/* Overview */}
      <SidebarGroup label="Overview" icon={<MenuIcon />}>
        <SidebarItem icon={HomeIcon} to="/" text="Dashboard" />
      </SidebarGroup>

      <SidebarDivider />

      {/* Catalog */}
      <SidebarScrollWrapper>
        <SidebarItem icon={ExtensionIcon} to="catalog" text="Services" />
        <SidebarItem icon={CodeIcon} to="api-docs" text="APIs" />
        <SidebarItem icon={LibraryBooks} to="docs" text="TechDocs" />
        <SidebarItem icon={MapIcon} to="catalog-graph" text="Catalog Graph" />
        <MyGroupsSidebarItem
          singularTitle="My Team"
          pluralTitle="My Teams"
          icon={GroupIcon}
        />
      </SidebarScrollWrapper>

      <SidebarDivider />

      {/* Platform */}
      <SidebarItem icon={CreateComponentIcon} to="create" text="Create Service" />
      <SidebarItem icon={TimelineIcon} to="catalog?filters%5Bkind%5D=component" text="CI/CD Pipelines" />
      <SidebarItem icon={CloudIcon} to="catalog?filters%5Bkind%5D=system" text="Deployments" />
      <SidebarItem icon={SecurityIcon} to="catalog?filters%5Bkind%5D=resource" text="Security" />

      <SidebarSpace />
      <SidebarDivider />

      <SidebarItem icon={SettingsIcon} to="settings" text="Settings" />
    </Sidebar>

    {children}
  </SidebarPage>
);
