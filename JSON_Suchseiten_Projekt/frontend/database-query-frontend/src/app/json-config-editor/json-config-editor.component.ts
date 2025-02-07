import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';           // Wichtig für Param-Auswertung
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Neues Interface für die Spaltenkonfiguration
interface ColumnConfig {
  fullColumn: string;            // z. B. "BankCon.IBAN"
  search: boolean;               // Gibt an, ob die Checkbox "Suchfeld" aktiviert wurde
  groupBy: boolean;              // (optional)
  orderBy: 'none' | 'ASC' | 'DESC'; // Drei Zustände: keine Sortierung, ASC oder DESC
  // Weitere optionale Felder (z. B. Nachkommastellen, Breite, Bedingung) können ergänzt werden
}

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

  // ---------------------------
  // Hilfsmethoden
  // ---------------------------
  
  /**
   * Gibt den Tabellennamen zurück (alles vor dem ersten Punkt).
   * Beispiel: "BankCon.IBAN" → "BankCon"
   */
  getTableName(fullColumn: string): string {
    const parts = fullColumn.split('.');
    return parts[0] || fullColumn;
  }

  /**
   * Gibt den Spaltennamen zurück (alles nach dem ersten Punkt).
   * Beispiel: "BankCon.IBAN" → "IBAN"
   */
  getColumnName(fullColumn: string): string {
    const parts = fullColumn.split('.');
    return parts[1] || fullColumn;
  }

  /**
   * Navigiert zurück zur Startseite.
   */
  goHome() {
    this.router.navigate(['']);
  }

  /**
   * Prüft, ob die übergebene Spalte bereits in den ausgewählten ColumnConfigs enthalten ist.
   */
  isColumnSelected(column: string): boolean {
    const fullCol = this.activeTable + '.' + column;
    return this.selectedColumnConfigs.some(c => c.fullColumn === fullCol);
  }

  fileName: string | null = null;
  title = 'mein-projekt';

  foreignKeys: {
    foreign_key_name: string; 
    parent_table: string; 
    parent_column: string; 
    referenced_table: string; 
    referenced_column: string;
  }[] = [];

  configName: string = '';

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

  // Statt eines einfachen string-Arrays führen wir jetzt ein Array von ColumnConfig-Objekten
  selectedColumnConfigs: ColumnConfig[] = [];

  // ---------------------------
  // Initialisierung
  // ---------------------------
  ngOnInit() {
    this.fileName = this.route.snapshot.paramMap.get('filename');
    console.log('JsonConfigEditorComponent initialized. fileName:', this.fileName);

    if (this.fileName === 'new') {
      console.log('-> Neue Konfiguration: Formular leer lassen.');
    } else if (this.fileName) {
      this.loadExistingConfig(this.fileName);
    }
  }

  loadExistingConfig(fileName: string) {
    this.http.get<any>(`http://localhost:3000/api/read-config?fileName=${fileName}`)
      .subscribe({
        next: (data) => {
          console.log('Geladene Config:', data);
          this.configName = data.name || '';
          // Weitere Eigenschaften (z. B. Tabellen, Spalten) können hier übernommen werden.
        },
        error: (err) => {
          console.error('Fehler beim Laden der JSON-Konfiguration:', err);
        }
      });
  }

  // ---------------------------
  // DB-Management, etc.
  // ---------------------------
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

  // ---------------------------
  // Spalten und Tabellen
  // ---------------------------
  activeTable: string = '';
  tableColumns: string[] = [];

  loadColumns(tableName: string) {
    if (!tableName) {
      console.error('Keine Tabelle ausgewählt');
      return;
    }
    this.activeTable = tableName;
    this.tableColumns = [];
    this.http.get<{ columns: string[] }>(`http://localhost:3000/get-columns?table=${tableName}`).subscribe(
      response => {
        this.tableColumns = response.columns.sort((a, b) => {
          const lowerA = a.toLowerCase();
          const lowerB = b.toLowerCase();
          // Wenn a "sid" ist und b nicht, soll a vor b
          if (lowerA === 'sid' && lowerB !== 'sid') {
            return -1;
          }
          // Wenn b "sid" ist und a nicht, soll b vor a
          if (lowerB === 'sid' && lowerA !== 'sid') {
            return 1;
          }
          // Andernfalls alphabetisch sortieren
          return a.localeCompare(b);
        });
      },
      error => console.error('Fehler beim Abrufen der Spalten:', error)
    );
  }
  

  /**
   * Wird aufgerufen, wenn eine Spalte in der Liste ausgewählt oder abgewählt wird.
   * Es wird ein Objekt (ColumnConfig) angelegt oder entfernt.
   */
  toggleColumnSelection(column: string, tableName: string, event: any) {
    const fullColumn = `${tableName}.${column}`;
    if (event.target.checked) {
      if (!this.selectedColumnConfigs.find(c => c.fullColumn === fullColumn)) {
        this.selectedColumnConfigs.push({
          fullColumn,
          search: false,    // Standardmäßig nicht als Suchspalte markiert
          groupBy: false,
          orderBy: 'none'   // Standardmäßig: keine OrderBy-Konfiguration
        });
      }
    } else {
      this.selectedColumnConfigs = this.selectedColumnConfigs.filter(c => c.fullColumn !== fullColumn);
    }
    console.log('Selected Column Configs:', this.selectedColumnConfigs);
  }

  /**
   * Zyklischer Wechsel des OrderBy-Zustands:
   * 'none' -> 'ASC' -> 'DESC' -> 'none'
   */
  cycleOrderBy(config: ColumnConfig): void {
    if (config.orderBy === 'none') {
      config.orderBy = 'ASC';
    } else if (config.orderBy === 'ASC') {
      config.orderBy = 'DESC';
    } else {
      config.orderBy = 'none';
    }
  }

  /**
   * Gruppiert die ausgewählten Spalten nach Tabelle und erzeugt ein Mapping von fullColumn → globale Spalten-ID.
   * Diese IDs werden dann in columnGroups sowie in den searchColumns verwendet.
   */
  generateColumnGroups() {
    let groupId = 0;
    let globalColumnId = 0;
    const fullColumnToId: { [key: string]: number } = {};

    // Gruppieren nach Tabellenname
    const grouped = this.selectedColumnConfigs.reduce((acc, curr) => {
      const table = this.getTableName(curr.fullColumn);
      if (!acc[table]) {
        acc[table] = [];
      }
      acc[table].push(curr);
      return acc;
    }, {} as { [table: string]: ColumnConfig[] });

    const columnGroups = Object.keys(grouped).map(tableName => {
      groupId++;
      const groupColumns = grouped[tableName].map(config => {
        globalColumnId++;
        fullColumnToId[config.fullColumn] = globalColumnId;
        return {
          id: globalColumnId,
          name: this.getColumnName(config.fullColumn),
          multiLinugal: false,
          enqPropDataTypeSid: 1,
          selectClause: config.fullColumn,
          alias: this.getColumnName(config.fullColumn)
        };
      });
      return {
        id: groupId,
        name: `Group for ${tableName}`,
        columns: groupColumns
      };
    });
    return { columnGroups, fullColumnToId };
  }
  
  /**
   * Speichert die aktuelle Konfiguration als JSON.
   * Dabei werden u. a. die searchColumns (für Spalten mit gesetzter Suchfeld-Checkbox) generiert.
   */
  saveJsonConfig() {
    const { columnGroups, fullColumnToId } = this.generateColumnGroups();
  
    // Erzeugen des searchColumns-Arrays: Nur Spalten, bei denen search === true
    let searchColumns: any[] = [];
    let searchId = 0;
    this.selectedColumnConfigs.forEach(config => {
      if (config.search) {
        searchId++;
        const colId = fullColumnToId[config.fullColumn];
        searchColumns.push({
          id: searchId,
          columnId: [colId],
          orderNumber: searchId,
          operatorSid: 15
        });
      }
    });
  
    // Beispielhafte Erzeugung von resultColumns:
    let resultColumns: any[] = [];
    columnGroups.forEach(group => {
      group.columns.forEach(col => {
        resultColumns.push({
          columnId: col.id,
          hidden: false,
          identity: false,
          orderNumber: col.id
        });
      });
    });
  
    // Erzeugen der orderByColumns anhand des neuen orderBy-Zustands
    let orderByColumns: any[] = [];
    this.selectedColumnConfigs.forEach(config => {
      if (config.orderBy !== 'none') {
        const colId = fullColumnToId[config.fullColumn];
        orderByColumns.push({
          columnId: colId,
          ascending: config.orderBy === 'ASC'
        });
      }
    });
  
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
      whereClause: '', // Hier ggf. anpassen
      joinGroups: this.joinRows.map((row, index) => ({
        id: index + 1,
        joinClause: row.condition
      })),
      columnGroups: columnGroups,
      searchColumns: searchColumns,
      resultColumns: resultColumns,
      orderByColumns: orderByColumns
    };
  
    const fileNameToSave = (this.fileName === 'new' || !this.fileName)
      ? `${jsonData.name}.json`
      : this.fileName;
  
    this.http.post('http://localhost:3000/save-json', {
      ...jsonData
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
