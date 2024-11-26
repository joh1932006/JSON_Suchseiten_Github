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

  // Liste der Datenbanken mit Fab4Minds als Option im Dropdown
  databases: { name: string; config: any }[] = [
    {
      name: 'Fab4Minds',
      config: {
        user: 'f4mbsappl',
        password: 'bTemrHU6Tn3pnkPRBuKc',
        server: '192.168.44.137',
        database: 'f4mbs',
        port: 1433,
        options: {
          encrypt: false,
          trustServerCertificate: true
        }
      }
    }
  ];

  selectedDatabase: string = ''; // Keine Standardauswahl
  selectedBaseTable: string = '';
  showDbConfigModal: boolean = false;
  showEditDbConfigModal: boolean = false;

  // Daten für eine neue Datenbank
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

  tables: string[] = []; // Tabellen in der ausgewählten Datenbank
  username: string = '';
  loggedInUser: string | null = null;

  // Dynamische Join-Verwaltung
  joinRows: { table: string; joinType: string; condition: string }[] = [];

  constructor(private http: HttpClient) {}

  // Beim Start keine Aktion für die Datenbankauswahl
  ngOnInit() {
    // Keine automatische Auswahl oder Konfiguration
    console.log('App initialized, no database selected.');
  }

  // Login-Funktion
  login() {
    if (this.username.trim()) {
      this.loggedInUser = this.username;
    }
  }

  // Öffne Modal zum Hinzufügen einer neuen Datenbank
  openDbConfigModal() {
    this.resetNewDatabaseForm();
    this.showDbConfigModal = true;
  }

  // Schließe Modals
  closeDbConfigModal() {
    this.showDbConfigModal = false;
  }

  closeEditDbConfigModal() {
    this.showEditDbConfigModal = false;
  }

  // Datenbank hinzufügen
  addDatabase() {
    if (this.newDatabase.name) {
      this.databases.push({
        name: this.newDatabase.name,
        config: { ...this.newDatabase }
      });

      this.closeDbConfigModal();
      this.resetNewDatabaseForm();
    } else {
      console.error('Database name is required');
    }
  }

  // Tabellen in der ausgewählten Datenbank abrufen
  fetchTables() {
    if (!this.selectedDatabase) {
      console.error('No database selected');
      return;
    }

    this.http.get<{ tables: string[] }>('http://localhost:3000/get-tables').subscribe(
      response => {
        this.tables = response.tables;
        console.log('Tables fetched:', this.tables);
      },
      error => console.error('Error fetching tables:', error)
    );
  }

  // Konfiguration der ausgewählten Datenbank aktualisieren
  updateDatabaseConfig() {
    const selectedDbConfig = this.databases.find(db => db.name === this.selectedDatabase)?.config;
    if (selectedDbConfig) {
      this.http.post('http://localhost:3000/set-database', selectedDbConfig).subscribe(
        () => {
          console.log('Database configuration updated on the server');
          this.fetchTables(); // Tabellen abrufen
        },
        error => console.error('Error updating database configuration:', error)
      );
    }
  }

  // Datenbank bearbeiten
  editDatabase() {
    const selectedDbConfig = this.databases.find(db => db.name === this.selectedDatabase);
    if (selectedDbConfig) {
      this.newDatabase = { ...selectedDbConfig.config, name: selectedDbConfig.name };
      this.showEditDbConfigModal = true;
    }
  }

  // Änderungen speichern
  saveDatabaseConfig() {
    const selectedDb = this.databases.find(db => db.name === this.newDatabase.name);
    if (selectedDb) {
      selectedDb.config = { ...this.newDatabase };
      this.updateDatabaseConfig();
      this.closeEditDbConfigModal();
    }
  }

  // Datenbank löschen
  deleteDatabase() {
    this.databases = this.databases.filter(db => db.name !== this.selectedDatabase);
    this.selectedDatabase = '';
    this.tables = []; // Tabellen löschen, wenn keine Datenbank ausgewählt ist
  }

  // Formular zurücksetzen
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

  // Dynamische Join-Methoden
  addJoinRow() {
    this.joinRows.push({
      table: '',
      joinType: 'INNER JOIN',
      condition: ''
    });
  }

  removeJoinRow(index: number) {
    this.joinRows.splice(index, 1);
  }

  generateJoinCondition(index: number) {
    const joinRow = this.joinRows[index];
    if (this.selectedBaseTable && joinRow.table && joinRow.joinType) {
      joinRow.condition = `${joinRow.joinType} ${joinRow.table} ON ${this.selectedBaseTable}.SID = ${joinRow.table}.SID`;
    }
  }
}
