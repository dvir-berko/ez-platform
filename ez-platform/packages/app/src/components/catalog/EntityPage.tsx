import React from 'react';
import {
  EntityAboutCard,
  EntityDependsOnComponentsCard,
  EntityDependsOnResourcesCard,
  EntityHasComponentsCard,
  EntityHasResourcesCard,
  EntityHasSubcomponentsCard,
  EntityLinksCard,
  EntityOrphanWarning,
  EntityProcessingErrorsPanel,
  EntitySwitch,
  hasCatalogProcessingErrors,
  hasRelationWarnings,
  isComponentType,
  isKind,
} from '@backstage/plugin-catalog';
import { EntityTechdocsContent, EntityTechdocsContentProps } from '@backstage/plugin-techdocs';
import { Grid } from '@material-ui/core';
import { EntityLayout, EntityRelationWarning } from '@backstage/plugin-catalog';

const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={6}>
      <EntityAboutCard variant="gridItem" />
    </Grid>
    <Grid item md={6}>
      <EntityLinksCard />
    </Grid>
    <Grid item xs={12}>
      <EntitySwitch>
        <EntitySwitch.Case if={hasCatalogProcessingErrors}>
          <EntityProcessingErrorsPanel />
        </EntitySwitch.Case>
      </EntitySwitch>
      <EntitySwitch>
        <EntitySwitch.Case if={hasRelationWarnings}>
          <EntityRelationWarning />
        </EntitySwitch.Case>
      </EntitySwitch>
      <EntityOrphanWarning />
    </Grid>
    <Grid item md={6}>
      <EntityDependsOnComponentsCard variant="gridItem" />
    </Grid>
    <Grid item md={6}>
      <EntityDependsOnResourcesCard variant="gridItem" />
    </Grid>
    <Grid item md={6}>
      <EntityHasComponentsCard variant="gridItem" />
    </Grid>
    <Grid item md={6}>
      <EntityHasResourcesCard variant="gridItem" />
    </Grid>
  </Grid>
);

const docsContentProps: EntityTechdocsContentProps = {
  path: '/docs',
};

export const entityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>
    <EntityLayout.Route path="/docs" title="Docs">
      <EntityTechdocsContent {...docsContentProps} />
    </EntityLayout.Route>
    <EntitySwitch>
      <EntitySwitch.Case if={isKind('component')}>
        <EntityLayout.Route path="/dependencies" title="Dependencies">
          <Grid container spacing={3}>
            <Grid item md={6}>
              <EntityDependsOnComponentsCard variant="gridItem" />
            </Grid>
            <Grid item md={6}>
              <EntityDependsOnResourcesCard variant="gridItem" />
            </Grid>
          </Grid>
        </EntityLayout.Route>
      </EntitySwitch.Case>
      <EntitySwitch.Case if={isComponentType('service')}>
        <EntityLayout.Route path="/subcomponents" title="Subcomponents">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <EntityHasSubcomponentsCard variant="gridItem" />
            </Grid>
          </Grid>
        </EntityLayout.Route>
      </EntitySwitch.Case>
      <EntitySwitch.Case if={isKind('system')}>
        <EntityLayout.Route path="/owned" title="Owned Components">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <EntityHasComponentsCard variant="gridItem" />
            </Grid>
          </Grid>
        </EntityLayout.Route>
      </EntitySwitch.Case>
      <EntitySwitch.Case if={isKind('api')}>
        <EntityLayout.Route path="/consumers" title="Consumers">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <EntityHasComponentsCard variant="gridItem" />
            </Grid>
          </Grid>
        </EntityLayout.Route>
      </EntitySwitch.Case>
    </EntitySwitch>
    <EntityLayout.Route path="/relations" title="Relations">
      <Grid container spacing={3}>
        <Grid item md={6}>
          <EntityHasComponentsCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <EntityHasResourcesCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <EntityDependsOnComponentsCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <EntityDependsOnResourcesCard variant="gridItem" />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
