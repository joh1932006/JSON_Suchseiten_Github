// app.routes.ts
import { Routes } from '@angular/router';
import { ConfigListComponent } from './config-list/config-list.component';
import { JsonConfigEditorComponent } from './json-config-editor/json-config-editor.component';

export const routes: Routes = [
  // Startseite: Liste aller Konfigurationen
  { path: '', component: ConfigListComponent },
  
  // Neuerstellen einer Konfiguration -> Editor im "Neuerstellen"-Modus
  { path: 'config/new', component: JsonConfigEditorComponent },
  
  // Bearbeiten einer bestehenden Konfiguration -> Editor im "Bearbeiten"-Modus
  { path: 'config/:filename', component: JsonConfigEditorComponent },

  // SQL-Ergebnisse anzeigen (standalone Komponente)
  { 
    path: 'sql-results', 
    loadComponent: () => import('./sql-results/sql-results.component').then(m => m.SqlResultsComponent)
  }
];
