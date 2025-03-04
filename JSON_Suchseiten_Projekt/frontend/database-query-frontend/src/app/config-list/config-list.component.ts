import { Component, OnInit } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { APIRequestsComponent } from '../apirequests/apirequests.component';

@Component({
  selector: 'app-config-list',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule, APIRequestsComponent],
  templateUrl: './config-list.component.html',
  styleUrls: ['./config-list.component.css'],
})
export class ConfigListComponent implements OnInit {
  jsonConfigs: string[] = [];
  username: string = '';
  loggedInUser: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.loadConfigs();
  }

  loadConfigs(): void {
    this.http.get<string[]>('http://localhost:3000/api/config-files').subscribe({
      next: (files) => {
        this.jsonConfigs = files;
        console.log('Gefundene JSON-Konfigurationen:', this.jsonConfigs);
      },
      error: (err) => {
        console.error('Fehler beim Laden der Konfigurationsdateien:', err);
      },
    });
  }

  onConfigClick(fileName: string) {
    this.router.navigate(['config', fileName]);
  }

  onNewConfig() {
    this.router.navigate(['config', 'new']);
  }

  onDeleteConfig(fileName: string) {
    this.http
      .delete(`http://localhost:3000/api/delete-config?fileName=${fileName}`, { responseType: 'text' })
      .subscribe({
        next: (responseText) => {
          console.log(`Konfiguration "${fileName}" gelöscht.`);
          this.jsonConfigs = this.jsonConfigs.filter((config) => config !== fileName);
          console.log('Server-Antwort:', responseText);
        },
        error: (err) => {
          console.error(`Fehler beim Löschen der Konfiguration "${fileName}":`, err);
          alert(`Fehler beim Löschen der Konfiguration "${fileName}".`);
        },
      });
  }

  /**
   * Neuer Button: Lädt die JSON-Konfiguration und wechselt direkt zur sql-results-Seite.
   */
  onResultsClick(fileName: string) {
    // 1) Hole die JSON-Konfiguration vom Server
    this.http.get<any>(`http://localhost:3000/api/read-config?fileName=${fileName}`).subscribe({
      next: (configData) => {
        // 2) Kompakten JSON-String bauen, den die sql-results-Seite erwartet
        const compactJson = JSON.stringify({ jsonString: JSON.stringify(configData) });

        // 3) Navigation zur sql-results-Seite, Übergabe des compactJson und des Dateinamens
        this.router.navigate(['sql-results'], { 
          state: { 
            compactJson,
            fileName 
          } 
        });
      },
      error: (err) => {
        console.error('Fehler beim Laden der Konfiguration:', err);
        alert(`Fehler beim Laden der Konfiguration "${fileName}".`);
      },
    });
  }
}
