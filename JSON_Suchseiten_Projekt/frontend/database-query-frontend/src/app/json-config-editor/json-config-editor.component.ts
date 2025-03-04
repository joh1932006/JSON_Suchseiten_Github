import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';          
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { APIRequestsComponent } from '../apirequests/apirequests.component';

// Interface für die Spaltenkonfiguration (kombiniert beide Versionen)
interface ColumnConfig {
  fullColumn: string;            
  search: boolean;               
  groupBy: boolean;            
  orderBy: 'none' | 'ASC' | 'DESC';
  identifier?: boolean;   
  versteckt?: boolean;
  resultOrderNumber?: number;
  searchOrderNumber?: number;
  operatorSid?: number;
}

// Interface für eine Join-Zeile
interface JoinRow {
  table: string;
  joinType: string;
  condition: string;
  alias?: string; 
  optionalCondition?: string; 
}

@Component({
  selector: 'app-json-config-editor',
  standalone: true,
  imports: [HttpClientModule, CommonModule, FormsModule, APIRequestsComponent],
  templateUrl: './json-config-editor.component.html',
  styleUrls: ['./json-config-editor.component.css']
})
export class JsonConfigEditorComponent implements OnInit {
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router 
  ) {}

  // Zusätzliche Operatoren aus Version 2
  operators: Array<{ sid: number; aName: string }> = [];
  autoResultOrderIndex = 1;
  autoSearchOrderIndex = 1;

  // JOIN-Daten
  joinRows: JoinRow[] = [];
  baseAlias: string = '';
  activeAlias: string = '';
  userWhereClause: string = '';

  public saveMessage: string = '';

  // Allgemeine Felder
  fileName: string | null = null;
  title = 'mein-projekt';
  configName: string = '';

  // Fremdschlüssel-Daten
  foreignKeys: {
    foreign_key_name: string; 
    parent_table: string; 
    parent_column: string; 
    referenced_table: string; 
    referenced_column: string;
  }[] = [];

  // Datenbank-/Tabellen-Daten
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

  // Spalten-Konfiguration
  selectedColumnConfigs: ColumnConfig[] = [];
  activeTable: string = '';
  tableColumns: string[] = [];

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
    this.fetchOperators();
  }

  // Laden der Konfiguration (API-konformer JSON)
  loadExistingConfig(fileName: string) {
    this.http.get<any>(`http://localhost:3000/api/read-config?fileName=${fileName}`)
      .subscribe({
        next: (configData) => {
          console.log('Config geladen:', configData);
          this.configName = configData.name || '';
          if (configData.table) {
            const parts = configData.table.split(' ');
            this.selectedBaseTable = parts[0];
            this.baseAlias = parts[1] || '';
          }
          this.userWhereClause = configData.whereClause || '';
          this.loadMetaData(fileName);
        },
        error: (err) => {
          console.error('Fehler beim Laden der Config:', err);
        }
      });
  }

  // Laden der UI-Meta-Daten
  loadMetaData(fileName: string) {
    this.http.get<any>(`http://localhost:3000/api/read-meta?fileName=${fileName}`)
      .subscribe({
        next: (metaData) => {
          console.log('Meta geladen:', metaData);
          this.selectedDatabase = metaData.selectedDatabase || this.selectedDatabase;
          this.selectedBaseTable = metaData.selectedBaseTable || this.selectedBaseTable;
          this.joinRows = metaData.joinRows || [];
          this.selectedColumnConfigs = metaData.selectedColumnConfigs || [];
          this.baseAlias = metaData.baseAlias || this.baseAlias;
          this.userWhereClause = metaData.userWhereClause || this.userWhereClause;
          this.updateAliases();
          if (this.selectedDatabase) {
            this.fetchTables();
          }
          if (this.selectedBaseTable) {
            this.fetchJoinableTables(this.selectedBaseTable);
          }
        },
        error: (err) => {
          console.error('Fehler beim Laden der Meta-Daten:', err);
        }
      });
  }

  // ---------------------------
  // DB-Management
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
  fetchOperators(): void {
    console.log('fetchOperators() wurde aufgerufen');
    this.http.get<{ operators: Array<{ sid: number; aName: string }> }>('http://localhost:3000/get-operators')
      .subscribe({
        next: response => {
          console.log('Operatoren geladen:', response);
          this.operators = response.operators;
        },
        error: err => console.error('Fehler beim Abruf der Operatoren:', err)
      });
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

  // ---------------------------
  // Basistabelle ändern & Join-Konfiguration
  // ---------------------------
  onBaseTableChange(newTable: string) {
    const oldTable = this.selectedBaseTable;
    const oldAlias = this.baseAlias;
    // Entferne Spalten, die zur alten Basis-Tabelle gehören
    if (oldTable && oldTable !== newTable) {
      this.selectedColumnConfigs = this.selectedColumnConfigs.filter(config => {
        const [cfgTable, cfgAlias] = config.fullColumn.split('.');
        return !(cfgTable === oldTable && cfgAlias === oldAlias);
      });
    }
    this.selectedBaseTable = newTable;
    this.updateAliases();
    this.fetchJoinableTables(newTable);
    this.http.get<{ foreignKeys: any[] }>(`http://localhost:3000/get-foreign-keys?table=${newTable}`)
      .subscribe(response => {
        this.foreignKeys = response.foreignKeys;
        // Generiere alle Join-Bedingungen neu
        this.joinRows.forEach((_, i) => this.generateJoinCondition(i));
        this.activeTable = '';
        this.activeAlias = '';
      });
  }
  fetchForeignKeys(table: string) {
    this.http.get<{ foreignKeys: any[] }>(`http://localhost:3000/get-foreign-keys?table=${table}`)
      .subscribe(
        response => {
          this.foreignKeys = response.foreignKeys;
          console.log("Foreign keys fetched:", this.foreignKeys);
        },
        error => {
          console.error("Fehler beim Laden der FK-Daten:", error);
        }
      );
  }
  // ---------------------------
  // JOIN-Methoden
  // ---------------------------
  addJoinRow() {
    this.joinRows.push({
      table: '',
      joinType: 'INNER JOIN',
      condition: '',
      alias: ''
    });
    this.updateAliases();
  }
  removeJoinRow(index: number) {
    // Entferne zugehörige Spalten
    const row = this.joinRows[index];
    const tableToRemove = row.table;
    const aliasToRemove = row.alias;
    this.selectedColumnConfigs = this.selectedColumnConfigs.filter(config => {
      const [cfgTable, cfgAlias] = config.fullColumn.split('.');
      return !(cfgTable === tableToRemove && cfgAlias === aliasToRemove);
    });
    this.joinRows.splice(index, 1);
    this.updateAliases();
    this.activeTable = '';
    this.activeAlias = '';
  }
  onJoinTableChange(index: number, newTable: string) {
    const oldTable = this.joinRows[index].table;
    const oldAlias = this.joinRows[index].alias;
    if (oldTable && oldTable !== newTable) {
      this.selectedColumnConfigs = this.selectedColumnConfigs.filter(config => {
        const [cfgTable, cfgAlias] = config.fullColumn.split('.');
        return !(cfgTable === oldTable && cfgAlias === oldAlias);
      });
    }
    this.joinRows[index].table = newTable;
    this.updateAliases();
    this.http.get<{ foreignKeys: any[] }>(`http://localhost:3000/get-foreign-keys?table=${newTable}`)
      .subscribe(response => {
        this.foreignKeys = [
          ...this.foreignKeys.filter(fk => fk.parent_table !== newTable && fk.referenced_table !== newTable),
          ...response.foreignKeys
        ];
        this.generateJoinCondition(index);
        this.activeTable = '';
        this.activeAlias = '';
      });
  }
  getAbbreviationForTable(table: string): string {
    const mapping: { [key: string]: string } = {
      trans: 't',
      crmadress: 'ca',
      action: 'act'
    };
    const lowerTable = table.toLowerCase();
    if (mapping[lowerTable]) {
      return mapping[lowerTable];
    }
    return table.substring(0, 2).toLowerCase();
  }
  public onOrderNumberChange(event: any, changedCol: ColumnConfig): void {
    const oldNumber = changedCol.resultOrderNumber;
    const newNumber = parseInt(event.target.value, 10);
    if (!newNumber || newNumber < 1) {
      event.target.value = oldNumber;
      return;
    }
    const conflictingCol = this.selectedColumnConfigs.find(c => c !== changedCol && c.resultOrderNumber === newNumber);
    if (conflictingCol) {
      conflictingCol.resultOrderNumber = oldNumber;
    } else {
      changedCol.resultOrderNumber = newNumber;
    }
  }
  updateAliases(): void {
    // Alias für die Ausgangstabelle setzen
    if (this.selectedBaseTable) {
      this.baseAlias = this.getAbbreviationForTable(this.selectedBaseTable);
    } else {
      this.baseAlias = '';
    }
    // Alias für die Join-Zeilen aktualisieren
    const tableCount: { [table: string]: number } = {};
    this.joinRows.forEach(row => {
      if (row.table) {
        tableCount[row.table] = (tableCount[row.table] || 0) + 1;
        const baseAbbr = this.getAbbreviationForTable(row.table);
        row.alias = tableCount[row.table] === 1 ? baseAbbr : baseAbbr + tableCount[row.table];
      } else {
        row.alias = '';
      }
    });
  }
  generateJoinCondition(index: number) {
    this.updateAliases();
    const joinRow = this.joinRows[index];
    const fk = this.foreignKeys.find(fk =>
      (this.selectedBaseTable === fk.parent_table && joinRow.table === fk.referenced_table) ||
      (this.selectedBaseTable === fk.referenced_table && joinRow.table === fk.parent_table)
    );
    if (fk) {
      if (this.selectedBaseTable === fk.parent_table && joinRow.table === fk.referenced_table) {
        joinRow.condition = `${joinRow.joinType} ${joinRow.table} ${joinRow.alias} ON ${joinRow.alias}.${fk.referenced_column} = ${this.baseAlias}.${fk.parent_column}`;
      } else if (this.selectedBaseTable === fk.referenced_table && joinRow.table === fk.parent_table) {
        joinRow.condition = `${joinRow.joinType} ${joinRow.table} ${joinRow.alias} ON ${joinRow.alias}.${fk.parent_column} = ${this.baseAlias}.${fk.referenced_column}`;
      }
    } else {
      console.error('Es wurde keine FK-Beziehung zwischen den ausgewählten Tabellen gefunden');
      joinRow.condition = '';
    }
  }

  // ---------------------------
  // SPALTEN-Methoden
  // ---------------------------
  loadColumns(tableName: string, alias?: string): void {
    this.activeTable = tableName;
    this.activeAlias = alias ? alias : this.baseAlias;
    this.tableColumns = [];
    this.http.get<{ columns: string[] }>(`http://localhost:3000/get-columns?table=${tableName}`)
      .subscribe(
        response => {
          let columns = response.columns;
          columns = columns.sort((a, b) => {
            const lcA = a.toLowerCase();
            const lcB = b.toLowerCase();
            if (lcA === 'sid' && lcB !== 'sid') return -1;
            if (lcB === 'sid' && lcA !== 'sid') return 1;
            return lcA.localeCompare(lcB);
          });
          this.tableColumns = columns;
        },
        error => console.error('Fehler beim Abrufen der Spalten:', error)
      );
  }
  isColumnSelected(column: string): boolean {
    const fullCol = `${this.activeTable}.${this.activeAlias}.${column}`;
    return this.selectedColumnConfigs.some(c => c.fullColumn === fullCol);
  }
  toggleColumnSelection(column: string, tableName: string, event: any): void {
    const fullColumn = `${tableName}.${this.activeAlias}.${column}`;
    if (event.target.checked) {
      if (!this.selectedColumnConfigs.find(c => c.fullColumn === fullColumn)) {
        this.selectedColumnConfigs.push({
          fullColumn,
          search: false,
          groupBy: false,
          orderBy: 'none',
          identifier: this.selectedColumnConfigs.length === 0, // erste Spalte automatisch als Identifier
          versteckt: false,
          operatorSid: 15, // Standardwert "enthält"
          resultOrderNumber: this.autoResultOrderIndex++ // Automatische fortlaufende Vergabe
        });
      }
    } else {
      this.selectedColumnConfigs = this.selectedColumnConfigs.filter(c => c.fullColumn !== fullColumn);
      // Sicherstellen, dass mindestens eine Spalte als Identifier gesetzt ist
      if (this.selectedColumnConfigs.length > 0 && !this.selectedColumnConfigs.some(c => c.identifier)) {
        this.selectedColumnConfigs[0].identifier = true;
      }
    }
  }
  
  onSearchToggle(config: ColumnConfig, event: any): void {
    if (event.target.checked && (!config.searchOrderNumber || config.searchOrderNumber < 1)) {
      config.searchOrderNumber = this.autoSearchOrderIndex++;
    }
  }
  
  
  
  setIdentifier(selectedConfig: ColumnConfig, event: any): void {
    if (event.target.checked) {
      // Setze alle anderen Identifier auf false, damit nur einer ausgewählt ist
      this.selectedColumnConfigs.forEach(c => c.identifier = false);
      selectedConfig.identifier = true;
    } else {
      // Wenn versucht wird, den einzigen Identifier abzuwählen, verhindere das:
      const currentIdentifiers = this.selectedColumnConfigs.filter(c => c.identifier);
      if (currentIdentifiers.length === 1) {
        // Keine Änderung zulassen – der Checkbox-Zustand bleibt checked
        event.target.checked = true;
        selectedConfig.identifier = true;
      }
    }
  }
  
  cycleOrderBy(config: ColumnConfig): void {
    if (config.orderBy === 'none') {
      config.orderBy = 'ASC';
    } else if (config.orderBy === 'ASC') {
      config.orderBy = 'DESC';
    } else {
      config.orderBy = 'none';
    }
  }
  generateColumnGroups(): { columnGroups: any[]; fullColumnToId: { [key: string]: number } } {
    let groupId = 0;
    let globalColumnId = 0;
    const fullColumnToId: { [key: string]: number } = {};
    const grouped = this.selectedColumnConfigs.reduce((acc: { [groupKey: string]: ColumnConfig[] }, curr: ColumnConfig) => {
      const parts = curr.fullColumn.split('.');
      const groupKey = parts[0] + '.' + parts[1];
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(curr);
      return acc;
    }, {});
    const columnGroups = Object.keys(grouped).map((groupKey: string) => {
      const [tableName, tableAlias] = groupKey.split('.');
      groupId++;
      const groupColumns = grouped[groupKey].map((config: ColumnConfig) => {
        globalColumnId++;
        fullColumnToId[config.fullColumn] = globalColumnId;
        const parts = config.fullColumn.split('.');
        const colName = parts[2] || config.fullColumn;
        const columnObj: any = {
          id: globalColumnId,
          name: colName,
          multiLinugal: false,
          enqPropDataTypeSid: 1,
          selectClause: `${tableAlias}.${colName}`,
          alias: colName
        };
        if (tableAlias !== this.baseAlias) {
          const joinIndex = this.joinRows.findIndex(row => row.alias === tableAlias);
          if (joinIndex !== -1) {
            columnObj.joinGroupId = joinIndex + 1;
          }
        }
        return columnObj;
      });
      return {
        id: groupId,
        name: `Group for ${tableName} (${tableAlias})`,
        columns: groupColumns
      };
    });
    return { columnGroups, fullColumnToId };
  }
  public saveJsonConfig(navigateAfterSave: boolean = false): void {
    // Erzeuge zunächst die columnGroups, die nur zur Strukturierung dienen
    const { columnGroups, fullColumnToId } = this.generateColumnGroups();
  
    // Suche-Spalten (bleiben unverändert)
    let searchColumns: any[] = [];
this.selectedColumnConfigs.forEach(config => {
  if (config.search) {
    const colId = fullColumnToId[config.fullColumn];
    searchColumns.push({
      id: searchColumns.length + 1,
      columnId: [colId],
      orderNumber: (config.searchOrderNumber && config.searchOrderNumber > 0)
        ? config.searchOrderNumber
        : searchColumns.length + 1,
      operatorSid: config.operatorSid && config.operatorSid > 0
        ? Number(config.operatorSid)
        : 15
    });
  }
});

  
    // ResultColumns werden jetzt direkt aus den selectedColumnConfigs generiert
    let resultColumns: any[] = this.selectedColumnConfigs.map(config => {
      const colId = fullColumnToId[config.fullColumn];
      return {
        columnId: colId,
        hidden: config.versteckt || false,
        identity: config.identifier || false,
        orderNumber: (typeof config.resultOrderNumber === 'number')
          ? config.resultOrderNumber
          : colId
      };
    });
  
    // OrderBy- und GroupBy-Spalten
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
    let groupByColumns: any[] = [];
    this.selectedColumnConfigs.forEach(config => {
      if (config.groupBy) {
        const colId = fullColumnToId[config.fullColumn];
        groupByColumns.push({ columnId: colId });
      }
    });
  
    // Aufbau des JSON-Objekts – beachte, dass columnGroups und resultColumns nun getrennt sind
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
      table: `${this.selectedBaseTable} ${this.baseAlias}`,
      whereClause: this.userWhereClause || '',
      joinGroups: this.joinRows.map((row, index) => ({
        id: index + 1,
        joinClause: row.optionalCondition 
          ? row.condition + ' AND ' + row.optionalCondition
          : row.condition
      })),
      columnGroups: columnGroups,
      searchColumns: searchColumns,
      resultColumns: resultColumns,
      orderByColumns: orderByColumns,
      groupByColumns: groupByColumns
    };
  
    const fileNameToSave = (this.fileName === 'new' || !this.fileName)
      ? `${jsonData.name}.json`
      : this.fileName;
  
    this.http.post('http://localhost:3000/api/save-json', jsonData).subscribe({
      next: response => {
        console.log('Config erfolgreich gespeichert:', response);
        this.saveMessage = `JSON-Konfiguration unter '${fileNameToSave}' gespeichert!`;
        const metaData = {
          configName: this.configName || 'default-config',
          selectedDatabase: this.selectedDatabase,
          selectedBaseTable: this.selectedBaseTable,
          joinRows: this.joinRows,
          selectedColumnConfigs: this.selectedColumnConfigs,
          baseAlias: this.baseAlias,
          userWhereClause: this.userWhereClause
        };
        this.http.post('http://localhost:3000/api/save-meta', metaData).subscribe({
          next: () => {
            if (navigateAfterSave) {
              const compactJsonString = JSON.stringify({ jsonString: JSON.stringify(jsonData) });
              this.router.navigate(['sql-results'], { state: { compactJson: compactJsonString, fileName: this.fileName } });
            }
          },
          error: err => {
            console.error('Fehler beim Speichern der Meta-Daten:', err);
          }
        });
      },
      error: err => {
        console.error('Fehler beim Speichern der Config:', err);
        this.saveMessage = 'Fehler beim Speichern der JSON-Konfiguration.';
      }
    });
  }

  getDisplayAlias(fullColumn: string): string {
    const parts = fullColumn.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}_${parts[2]}`;
    }
    return fullColumn;
  }
  
  getDataType(col: ColumnConfig): string {
    // Extrahiere den Spaltennamen aus fullColumn (angenommen, das Format ist "Tabelle.Alias.Spaltenname")
    const columnName = this.getColumnNameFromFullColumn(col.fullColumn).toLowerCase();
    
    // Beispielhafte Logik: Wenn der Spaltenname "sid" lautet, dann Ganzzahl, sonst Text
    if (columnName === 'sid') {
      return 'Ganzzahl';
    }
    // Hier können Sie weitere Bedingungen hinzufügen, z. B. für Datum oder andere Datentypen
    return 'Text - Zeile';
  }
  
  
  public showSqlResults(): void {
    this.saveJsonConfig(true);
  }
  // ---------------------------
  // Navigation
  // ---------------------------
  goHome(): void {
    this.router.navigate(['']);
  }
  // ---------------------------
  // Hilfsmethoden für Spalten-Konfiguration
  // ---------------------------
  getTableName(fullColumn: string): string {
    const parts = fullColumn.split('.');
    return parts[0] || fullColumn;
  }
  getColumnName(fullColumn: string): string {
    const parts = fullColumn.split('.');
    return parts[1] || fullColumn;
  }
  getTableNameFromFullColumn(fullColumn: string): string {
    const parts = fullColumn.split('.');
    return parts[0] || fullColumn;
  }
  getAliasFromFullColumn(fullColumn: string): string {
    const parts = fullColumn.split('.');
    return parts[1] || '';
  }
  getColumnNameFromFullColumn(fullColumn: string): string {
    const parts = fullColumn.split('.');
    return parts[2] || fullColumn;
  }
}
