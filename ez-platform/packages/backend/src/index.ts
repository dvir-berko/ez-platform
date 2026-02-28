/**
 * EZ Platform — Backstage Backend
 *
 * Uses the new backend system (@backstage/backend-defaults).
 * Add plugins here as needed.
 */
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// Core plugins
backend.add(import('@backstage/plugin-app-backend/alpha'));
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));

// Catalog
backend.add(import('@backstage/plugin-catalog-backend/alpha'));
backend.add(import('@backstage/plugin-catalog-backend-module-github/alpha'));

// Scaffolder (templates)
backend.add(import('@backstage/plugin-scaffolder-backend/alpha'));

// TechDocs
backend.add(import('@backstage/plugin-techdocs-backend/alpha'));

// Search
backend.add(import('@backstage/plugin-search-backend/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-catalog/alpha'));

backend.start();
