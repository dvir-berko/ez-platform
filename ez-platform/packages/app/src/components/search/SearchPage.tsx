import React from 'react';
import { CatalogSearchResultListItem } from '@backstage/plugin-catalog';
import { TechDocsSearchResultListItem } from '@backstage/plugin-techdocs';
import {
  SearchFilter,
  SearchPagination,
  SearchResult,
  SearchType,
} from '@backstage/plugin-search-react';
import { Grid, Paper } from '@material-ui/core';

export const searchPage = (
  <Grid container direction="row" spacing={2}>
    <Grid item xs={3}>
      <Paper>
        <SearchType.Accordion
          name="Result Type"
          defaultValue="software-catalog"
          types={[
            { value: 'software-catalog', name: 'Software Catalog' },
            { value: 'techdocs', name: 'TechDocs' },
          ]}
        />
        <SearchFilter.Select
          label="Kind"
          name="kind"
          values={['Component', 'Template', 'System', 'API', 'Resource']}
        />
      </Paper>
    </Grid>
    <Grid item xs={9}>
      <SearchPagination />
      <SearchResult>
        <CatalogSearchResultListItem />
        <TechDocsSearchResultListItem />
      </SearchResult>
    </Grid>
  </Grid>
);
