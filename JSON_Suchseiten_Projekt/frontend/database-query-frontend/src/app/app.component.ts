import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { APIRequestsComponent } from './apirequests/apirequests.component';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [APIRequestsComponent, HttpClientModule, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'mein-projekt';


  configName: string = ''; // Beispielwert


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

  activeTable: string = '';
  tableColumns: string[] = [];

  // Funktion zum Abrufen und Anzeigen der Spalten
  loadColumns(tableName: string) {
    if (!tableName) {
      console.error('Keine Tabelle ausgewählt');
      return;
    }
  
    // Setze aktuelle Tabelle und leere die Spaltenanzeige vor dem Laden
    this.activeTable = tableName;
    this.tableColumns = []; // Leere die Spalten
  
    // Abrufen der Spalten vom Server
    this.http.get<{ columns: string[] }>(`http://localhost:3000/get-columns?table=${tableName}`).subscribe(
      response => {
        this.tableColumns = response.columns;
      },
      error => console.error('Fehler beim Abrufen der Spalten:', error)
    );
  }
  selectedColumns: string[] = [];

  toggleColumnSelection(column: string, tableName: string, event: any) {
    const columnIdentifier = `${tableName}.${column}`;
    if (event.target.checked) {
      this.selectedColumns.push(columnIdentifier);
    } else {
      this.selectedColumns = this.selectedColumns.filter(c => c !== columnIdentifier);
    }
    console.log('Selected Columns:', this.selectedColumns);
  }
  

  generateColumnGroups() {
    let groupId = 0; // Fortlaufende ID für Gruppen
  
    const columnGroups = this.tables
      .filter(table => table === this.activeTable || this.selectedColumns.length > 0)
      .map(table => {
        const tableColumns = this.selectedColumns.filter(column => column.startsWith(`${table}.`));
        let columnId = 0; // Reset der Spalten-ID für jede Gruppe
  
        const groupColumns = tableColumns.map(column => {
          columnId += 1; // Erhöhe die Spalten-ID lokal für die Gruppe
          return {
            id: columnId, // Fortlaufende ID für die Spalten innerhalb der Gruppe
            name: column.replace(`${table}.`, ''), // Entfernt den Tabellennamen
            multiLinugal: false,
            enqPropDataTypeSid: 1,
            selectClause: `${table}.${column.replace(`${table}.`, '')}`,
            alias: column.replace(`${table}.`, ''),
          };
        });
  
        // Erzeuge die Gruppe nur, wenn sie Spalten enthält
        if (groupColumns.length > 0) {
          groupId += 1; // Erhöhe die Gruppen-ID
          return {
            id: groupId, // Fortlaufende ID für die Gruppe
            name: `Group for ${table}`,
            columns: groupColumns,
          };
        }
        return null;
      })
      .filter(group => group !== null) as { id: number; name: string; columns: any[] }[]; // Entferne leere Gruppen
  
    return columnGroups;
  }
  
  
  // Daten zusammenstellen und speichern
  saveJsonConfig() {
    const columnGroups = this.generateColumnGroups();

    const jsonData = {
      name: this.configName || 'default-config', 
      itemsPerPage: 100,
      tableWidth: 1200,
      preventSearchWithoutRestriction: false,
      showInStartMenu: false,
      selectSingleEntity: true,
      searchOnType: true,
      hideHeadersOnNoRestriction: false,
      automaticRun: true,
      implementationId: 1,
      querySid: null,
      filterXDJoinGroupId: null,
      filterChooseRoleSid: null,
      filterRoleSid: null,
      roleSid: null,
      interfaceSid: null,
      table: this.selectedBaseTable,
      whereClause: this.selectedColumns,
      joinGroups: this.joinRows.map((row, index) => ({
        id: index + 1, 
        joinClause: row.condition
      })),
      columnGroups: columnGroups, // hier stimmt selectedColumns
      searchColumns: this.selectedColumns,
      resultColumns: this.selectedColumns,
      orderByColumns: this.selectedColumns      
    };

    // Daten an den Server senden
    this.http.post('http://localhost:3000/save-json', jsonData).subscribe(
      response => {
        console.log('JSON-Konfiguration erfolgreich gespeichert:', response);
        alert('JSON-Konfiguration erfolgreich gespeichert!');
      },
      error => {
        console.error('Fehler beim Speichern der JSON-Konfiguration:', error);
        alert('Fehler beim Speichern der JSON-Konfiguration.');
      }
    );
}
}





