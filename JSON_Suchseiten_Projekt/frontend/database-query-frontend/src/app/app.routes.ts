// app.routes.ts
import { Routes } from '@angular/router';
import { ConfigListComponent } from './config-list/config-list.component';
import { JsonConfigEditorComponent } from './json-config-editor/json-config-editor.component';

export const routes: Routes = [
  // Startseite zeigt die Liste aller vorhandenen Konfigurationena
  { path: '', component: ConfigListComponent },

  // Neue Konfiguration -> Editor im "Neuerstellen"-Modus
  { path: 'config/new', component: JsonConfigEditorComponent },

  // Bestehende Konfiguration -> Editor im "Bearbeiten"-Modus
  { path: 'config/:filename', component: JsonConfigEditorComponent }
];
