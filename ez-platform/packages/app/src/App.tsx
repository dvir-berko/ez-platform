import React from 'react';
import { Route } from 'react-router-dom';
import { apiDocsPlugin, ApiExplorerPage } from '@backstage/plugin-api-docs';
import {
  CatalogEntityPage,
  CatalogIndexPage,
  catalogPlugin,
} from '@backstage/plugin-catalog';
import { CatalogImportPage } from '@backstage/plugin-catalog-import';
import { scaffolderPlugin, ScaffolderPage } from '@backstage/plugin-scaffolder';
import { SearchPage } from '@backstage/plugin-search';
import {
  TechDocsIndexPage,
  TechDocsReaderPage,
  techdocsPlugin,
} from '@backstage/plugin-techdocs';
import { UserSettingsPage } from '@backstage/plugin-user-settings';
import { apis } from './apis';
import { entityPage } from './components/catalog/EntityPage';
import { searchPage } from './components/search/SearchPage';
import { Root } from './components/Root';
import { EZHomePage } from './components/home/EZHomePage';
import { githubAuthApiRef } from '@backstage/core-plugin-api';
import {
  AlertDisplay,
  OAuthRequestDialog,
  SignInPage,
} from '@backstage/core-components';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { CatalogGraphPage } from '@backstage/plugin-catalog-graph';
import { UnifiedThemeProvider } from '@backstage/theme';
import { ezDarkTheme } from './theme/ezTheme';

const app = createApp({
  apis,
  themes: [
    {
      id:       'ez-dark',
      title:    'EZ Dark',
      variant:  'dark',
      Provider: ({ children }) => (
        <UnifiedThemeProvider theme={ezDarkTheme} children={children} />
      ),
    },
  ],
  bindRoutes({ bind }) {
    bind(catalogPlugin.externalRoutes, {
      createComponent: scaffolderPlugin.routes.root,
      viewTechDoc: techdocsPlugin.routes.docRoot,
      createFromTemplate: scaffolderPlugin.routes.selectedTemplate,
    });
    bind(apiDocsPlugin.externalRoutes, {
      registerApi: catalogPlugin.routes.importPage,
    });
    bind(scaffolderPlugin.externalRoutes, {
      registerComponent: catalogPlugin.routes.importPage,
      viewTechDoc: techdocsPlugin.routes.docRoot,
    });
  },
  components: {
    SignInPage: props => (
      <SignInPage
        {...props}
        auto
        provider={{
          id:        'github-auth-provider',
          title:     'GitHub',
          message:   'Sign in using GitHub',
          apiRef:    githubAuthApiRef,
        }}
      />
    ),
  },
});

export default app.createRoot(
  <>
    <AlertDisplay />
    <OAuthRequestDialog />
    <AppRouter>
      <Root>
        <FlatRoutes>
          <Route path="/"          element={<EZHomePage />} />
          <Route path="/catalog"   element={<CatalogIndexPage />} />
          <Route
            path="/catalog/:namespace/:kind/:name"
            element={<CatalogEntityPage />}
          >
            {entityPage}
          </Route>
          <Route path="/docs"       element={<TechDocsIndexPage />} />
          <Route
            path="/docs/:namespace/:kind/:name/*"
            element={<TechDocsReaderPage />}
          />
          <Route path="/create"     element={<ScaffolderPage />} />
          <Route path="/api-docs"   element={<ApiExplorerPage />} />
          <Route path="/catalog-graph" element={<CatalogGraphPage />} />
          <Route path="/catalog-import" element={<CatalogImportPage />} />
          <Route path="/search"     element={<SearchPage />}>
            {searchPage}
          </Route>
          <Route path="/settings"   element={<UserSettingsPage />} />
        </FlatRoutes>
      </Root>
    </AppRouter>
  </>,
);
