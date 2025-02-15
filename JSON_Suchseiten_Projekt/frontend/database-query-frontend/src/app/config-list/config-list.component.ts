import { Component, OnInit } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms'; // FormsModule importieren

@Component({
  selector: 'app-config-list',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule], // FormsModule hinzufügen
  templateUrl: './config-list.component.html',
  styleUrls: ['./config-list.component.css'],
})
export class ConfigListComponent implements OnInit {
  jsonConfigs: string[] = []; // Liste der JSON-Konfigurationsdateien
  username: string = ''; // Benutzername für den Login
  loggedInUser: string | null = null; // Eingeloggter Benutzername

  constructor(
    private http: HttpClient, // HttpClient für API-Aufrufe
    private router: Router // Router für Navigation
  ) {}

  // Login-Funktion
  login() {
    if (this.username.trim()) {
      this.loggedInUser = this.username;
    }
  }

  // OnInit-Lebenszyklusmethode
  ngOnInit(): void {
    this.loadConfigs(); // Konfigurationsdateien laden
  }

  // Lädt die Liste der JSON-Konfigurationsdateien vom Server
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
  

  // Öffnet die Bearbeitungsseite für eine ausgewählte Konfiguration
  onConfigClick(fileName: string) {
    this.router.navigate(['config', fileName]);
  }

  // Öffnet die Seite zum Erstellen einer neuen Konfiguration
  onNewConfig() {
    this.router.navigate(['config', 'new']);
  }

  onDeleteConfig(fileName: string) {
    this.http
      .delete(`http://localhost:3000/api/delete-config?fileName=${fileName}`,
              { responseType: 'text' })   
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
  
}
