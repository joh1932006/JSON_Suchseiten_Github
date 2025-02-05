import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';           // <--- Wichtig für Param-Auswertung
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-json-config-editor',
  standalone: true,
  imports: [HttpClientModule, CommonModule, FormsModule],
  templateUrl: './json-config-editor.component.html',
  styleUrls: ['./json-config-editor.component.css']
})
export class JsonConfigEditorComponent implements OnInit {
  
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router 
  ) {}

  // Neue Methode
  goHome() {
    // Navigiert zur Startseite (Route path: '')
    this.router.navigate(['']);
  }

  fileName: string | null = null;

  // ----------------------------------
  // Vorhandene Variablen
  // ----------------------------------
  title = 'mein-projekt';

  foreignKeys: {
    foreign_key_name: string; 
    parent_table: string; 
    parent_column: string; 
    referenced_table: string; 
    referenced_column: string; 
  }[] = [];

  configName: string = ''; // Beispielwert

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

  selectedDatabase: string = '';
  selectedBaseTable: string = '';
  showDbConfigModal: boolean = false;
  showEditDbConfigModal: boolean = false;
  joinableTables: string[] = [];

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

  tables: string[] = [];
  

  joinRows: { table: string; joinType: string; condition: string }[] = [];

  // ----------------------------------
  // LEBENSZYKLUS: OnInit
  // ----------------------------------
  ngOnInit() {
    // 1) Prüfen, ob Route param "filename" = 'new' oder ein echter Dateiname
    this.fileName = this.route.snapshot.paramMap.get('filename');
    console.log('JsonConfigEditorComponent initialized. fileName:', this.fileName);

    // 2) Unterscheiden, ob "new" oder "datei.json"
    if (this.fileName === 'new') {
      // Neue Konfiguration
      console.log('-> Neue Konfiguration: Formular leer lassen.');
      // Optional: Du könntest hier default-Werte setzen.
      // this.configName = 'neueConfig';
    } else if (this.fileName) {
      // Existierende Konfiguration laden
      this.loadExistingConfig(this.fileName);
    }
  }

  /**
   * Liest eine bestehende JSON-Konfiguration vom Server (Datei).
   * @param fileName z.B. "myConfig.json"
   */
  loadExistingConfig(fileName: string) {
    // Hier solltest du im Backend einen passenden Endpoint haben,
    // z. B. /api/read-config?fileName=xxx
    this.http.get<any>(`http://localhost:3000/api/read-config?fileName=${fileName}`)
      .subscribe({
        next: (data) => {
          console.log('Geladene Config:', data);
          // Formular mit geladener Config befüllen:
          // z. B. "name" in configName
          this.configName = data.name || '';
          // Falls du mehr Eigenschaften speicherst, hier übernehmen.
          // ...
          // z. B.:
          // this.tables = data.tables || [];
          // this.selectedDatabase = data.selectedDatabase || '';
          // ...
        },
        error: (err) => {
          console.error('Fehler beim Laden der JSON-Konfiguration:', err);
        }
      });
  }

  // ----------------------------------
  // LOGIN, DB-Verwaltung, usw.
  // (dein bestehender Code)
  // ----------------------------------
  
  openDbConfigModal() {
    this.resetNewDatabaseForm();
    this.showDbConfigModal = true;
  }
  closeDbConfigModal() {
    this.showDbConfigModal = false;
  }
  closeEditDbConfigModal() {
    this.showEditDbConfigModal = false;
  }
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
  fetchTables() {
    if (!this.selectedDatabase) {
      console.error('No database selected');
      return;
    }
    this.http.get<{ tables: string[] }>('http://localhost:3000/get-tables').subscribe(
      response => {
        this.tables = response.tables.sort((a, b) => a.localeCompare(b));
        console.log('Tables fetched and sorted:', this.tables);
      },
      error => console.error('Error fetching tables:', error)
    );
  }
  fetchJoinableTables(baseTable: string) {
    if (!baseTable) {
      console.error('No base table provided');
      return;
    }
    this.http.get<{ joinableTables: string[] }>(`http://localhost:3000/get-joinable-tables?baseTable=${baseTable}`)
      .subscribe(
        response => {
          this.joinableTables = response.joinableTables;
          console.log('Joinable tables fetched:', this.joinableTables);
        },
        error => console.error('Error fetching joinable tables:', error)
      );
  }
  updateDatabaseConfig() {
    const selectedDbConfig = this.databases.find(db => db.name === this.selectedDatabase)?.config;
    if (selectedDbConfig) {
      this.http.post('http://localhost:3000/set-database', selectedDbConfig).subscribe(
        () => {
          console.log('Database configuration updated on the server');
          this.fetchTables();
        },
        error => console.error('Error updating database configuration:', error)
      );
    }
  }
  updateBaseTable(selectedBaseTable: string) {
    this.selectedBaseTable = selectedBaseTable;
    this.fetchJoinableTables(selectedBaseTable);
  }
  editDatabase() {
    const selectedDbConfig = this.databases.find(db => db.name === this.selectedDatabase);
    if (selectedDbConfig) {
      this.newDatabase = { ...selectedDbConfig.config, name: selectedDbConfig.name };
      this.showEditDbConfigModal = true;
    }
  }
  saveDatabaseConfig() {
    const selectedDb = this.databases.find(db => db.name === this.newDatabase.name);
    if (selectedDb) {
      selectedDb.config = { ...this.newDatabase };
      this.updateDatabaseConfig();
      this.closeEditDbConfigModal();
    }
  }
  deleteDatabase() {
    this.databases = this.databases.filter(db => db.name !== this.selectedDatabase);
    this.selectedDatabase = '';
    this.tables = [];
  }
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
  foreignKeyExists(tableName: string) {
    return this.foreignKeys.find(fk => fk.referenced_table === tableName);
  }
  generateJoinCondition(index: number) {
    const joinRow = this.joinRows[index];
    const foreignKey = this.foreignKeys.find(
      fk => fk.referenced_table === joinRow.table
    );
    if (foreignKey) {
      joinRow.condition = `${joinRow.joinType} ${joinRow.table} ON ${joinRow.table}.${foreignKey.referenced_column} = ${this.selectedBaseTable}.${foreignKey.parent_column}`;
    } else {
      console.error('No foreign key found for the selected table');
    }
  }
  
  // ----------------------------------
  // SPALTEN & AUSWAHL
  // ----------------------------------
  activeTable: string = '';
  tableColumns: string[] = [];
  selectedColumns: string[] = [];

  loadColumns(tableName: string) {
    if (!tableName) {
      console.error('Keine Tabelle ausgewählt');
      return;
    }
    this.activeTable = tableName;
    this.tableColumns = [];
    this.http.get<{ columns: string[] }>(`http://localhost:3000/get-columns?table=${tableName}`).subscribe(
      response => {
        this.tableColumns = response.columns;
      },
      error => console.error('Fehler beim Abrufen der Spalten:', error)
    );
  }

  toggleColumnSelection(column: string, tableName: string, event: any) {
    const columnIdentifier = `${tableName}.${column}`;
    if (event.target.checked) {
      this.selectedColumns.push(columnIdentifier);
    } else {
      this.selectedColumns = this.selectedColumns.filter(c => c !== columnIdentifier);
    }
    console.log('Selected Columns:', this.selectedColumns);
  }

  // ----------------------------------
  // SPEZIELLE LOGIK FÜR JSON-KONFIG
  // ----------------------------------
  generateColumnGroups() {
    let groupId = 0;
    const columnGroups = this.tables
      .filter(table => table === this.activeTable || this.selectedColumns.length > 0)
      .map(table => {
        const tableColumns = this.selectedColumns.filter(column => column.startsWith(`${table}.`));
        let columnId = 0;
        const groupColumns = tableColumns.map(column => {
          columnId += 1;
          return {
            id: columnId,
            name: column.replace(`${table}.`, ''),
            multiLinugal: false,
            enqPropDataTypeSid: 1,
            selectClause: `${table}.${column.replace(`${table}.`, '')}`,
            alias: column.replace(`${table}.`, '')
          };
        });
        if (groupColumns.length > 0) {
          groupId += 1;
          return {
            id: groupId,
            name: `Group for ${table}`,
            columns: groupColumns
          };
        }
        return null;
      })
      .filter(group => group !== null) as { id: number; name: string; columns: any[] }[];

    return columnGroups;
  }

  /**
   * Speichert die aktuelle Konfiguration.
   * Unterscheidet ggf. zwischen "new" und "bestehendem" Dateinamen.
   */
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
      columnGroups: columnGroups,
      searchColumns: this.selectedColumns,
      resultColumns: this.selectedColumns,
      orderByColumns: this.selectedColumns
    };

    // Falls du den Dateinamen im Backend brauchst:
    const fileNameToSave = (this.fileName === 'new' || !this.fileName)
      ? `${jsonData.name}.json`                // z. B. "default-config.json"
      : this.fileName;                         // z. B. "myExistingConfig.json"

    // An dein Speichern-Endpunkt:
    this.http.post('http://localhost:3000/save-json', {
      ...jsonData,
      fileName: fileNameToSave
    }).subscribe(
      response => {
        console.log('JSON-Konfiguration erfolgreich gespeichert:', response);
        alert(`JSON-Konfiguration unter '${fileNameToSave}' gespeichert!`);
      },
      error => {
        console.error('Fehler beim Speichern der JSON-Konfiguration:', error);
        alert('Fehler beim Speichern der JSON-Konfiguration.');
      }
    );
  }
}
