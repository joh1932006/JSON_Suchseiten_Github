import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { APIRequestsComponent } from './apirequests/apirequests.component';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [APIRequestsComponent, HttpClientModule, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'mein-projekt';

  // Liste der Datenbanken
  databases: { name: string; config: any }[] = [
    { name: 'Database1', config: { user: '', password: '', server: '', database: '', port: 1433, options: { encrypt: false, trustServerCertificate: true } } },
    { name: 'Database2', config: { user: '', password: '', server: '', database: '', port: 1433, options: { encrypt: false, trustServerCertificate: true } } }
  ];

  selectedDatabase: string = '';
  showDbConfigModal: boolean = false;

  newDatabase = {
    name: '',
    user: '',
    password: '',
    server: '',
    database: '',
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  constructor(private http: HttpClient) {}

  // Öffnet das Modal für die Datenbankkonfiguration
  openDbConfigModal() {
    this.showDbConfigModal = true;
  }

  // Schließt das Modal
  closeDbConfigModal() {
    this.showDbConfigModal = false;
  }

  // Fügt eine neue Datenbank zur Liste hinzu
  addDatabase() {
    
      this.closeDbConfigModal();
      this.resetNewDatabaseForm();
    
  }

  // Setzt das Formular für die neue Datenbank zurück
  resetNewDatabaseForm() {
    this.newDatabase = {
      name: '',
      user: '',
      password: '',
      server: '',
      database: '',
      port: 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    };
  }

  // Sendet die ausgewählte Datenbankkonfiguration an das Backend
  updateDatabaseConfig() {
    const selectedDbConfig = this.databases.find(db => db.name === this.selectedDatabase)?.config;
    if (selectedDbConfig) {
      this.http.post('http://localhost:3000/set-database', selectedDbConfig).subscribe(
        () => console.log('Database configuration updated on the server'),
        error => console.error('Error updating database configuration:', error)
      );
    }
  }
}
