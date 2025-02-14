import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';          
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { APIRequestsComponent } from '../apirequests/apirequests.component';

// Neues Interface für die Spaltenkonfiguration
interface ColumnConfig {
  fullColumn: string;            
  search: boolean;               
  groupBy: boolean;            
  orderBy: 'none' | 'ASC' | 'DESC'; 
}

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

  joinRows: JoinRow[] = [];
  baseAlias: string = '';
  activeAlias: string = '';
  userWhereClause: string = '';

  
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
    const fullCol = `${this.activeTable}.${this.activeAlias}.${column}`;
    return this.selectedColumnConfigs.some(c => c.fullColumn === fullCol);
  }


  /**
 * Extrahiert den Tabellen-Namen aus einem fullColumn-String im Format "Tabelle.Alias.Spaltname".
 */
getTableNameFromFullColumn(fullColumn: string): string {
  const parts = fullColumn.split('.');
  return parts[0] || fullColumn;
}

/**
 * Extrahiert den Alias aus einem fullColumn-String im Format "Tabelle.Alias.Spaltname".
 */
getAliasFromFullColumn(fullColumn: string): string {
  const parts = fullColumn.split('.');
  return parts[1] || '';
}

/**
 * Extrahiert den Spaltentitel aus einem fullColumn-String im Format "Tabelle.Alias.Spaltname".
 */
getColumnNameFromFullColumn(fullColumn: string): string {
  const parts = fullColumn.split('.');
  return parts[2] || fullColumn;
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
    this.fetchForeignKeys(selectedBaseTable); // Methode: Foreign Keys laden
    this.updateAliases();
  }
  
  fetchForeignKeys(table: string) {
    this.http.get<{ foreignKeys: any[] }>(`http://localhost:3000/get-foreign-keys?table=${table}`)
      .subscribe(
        response => {
          this.foreignKeys = response.foreignKeys;
          // Hier loggen wir die gesamten FK-Daten:
          console.log("FK Response:", response);
          console.log("Foreign keys fetched:", this.foreignKeys);
        },
        error => {
          console.error("Fehler beim Laden der FK-Daten:", error);
        }
      );
  }

  /**
 * Liefert einen Standard-Alias für einen Tabellennamen.
 * Hier kann ein vordefiniertes Mapping hinterlegt werden.
 */
getAbbreviationForTable(table: string): string {
  const mapping: { [key: string]: string } = {
    'trans': 't',
    'crmadress': 'ca',
    'action': 'act'
    // Hier ggf. weitere Einträge
  };
  const lowerTable = table.toLowerCase();
  if (mapping[lowerTable]) {
    return mapping[lowerTable];
  }
  // Falls keine vordefinierte Abkürzung existiert, nimm die ersten zwei Buchstaben
  return table.substring(0, 2).toLowerCase();
}

/**
 * Aktualisiert den Alias der Ausgangstabelle (baseAlias) und der joinRows.
 * Falls eine Tabelle mehrfach vorkommt, wird für die zweite (usw.) Alias eine Nummer angehängt.
 */
updateAliases(): void {
  // Ausgangstabelle alias
  if (this.selectedBaseTable) {
    this.baseAlias = this.getAbbreviationForTable(this.selectedBaseTable);
  } else {
    this.baseAlias = '';
  }

  // Zähler für Join-Tabellen
  const tableCount: { [table: string]: number } = {};
  this.joinRows.forEach(row => {
    if (row.table) {
      if (!tableCount[row.table]) {
        tableCount[row.table] = 1;
      } else {
        tableCount[row.table]++;
      }
      const baseAbbr = this.getAbbreviationForTable(row.table);
      // Falls Tabelle mehrfach, hänge Zahl an
      row.alias = tableCount[row.table] === 1 ? baseAbbr : baseAbbr + tableCount[row.table];
    } else {
      row.alias = '';
    }
  });
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
      condition: '',
      alias: ''
    });
    this.updateAliases();
  }
  
  removeJoinRow(index: number) {
    this.joinRows.splice(index, 1);
    this.updateAliases();
  }
  
  foreignKeyExists(tableName: string) {
    return this.foreignKeys.find(fk => fk.referenced_table === tableName);
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
  // Spalten und Tabellen
  // ---------------------------
  activeTable: string = '';
  tableColumns: string[] = [];

  loadColumns(tableName: string, alias?: string): void {
    this.activeTable = tableName;
    // Falls ein Alias übergeben wird, verwende ihn – sonst den Basis-Alias
    this.activeAlias = alias ? alias : this.baseAlias;
  
    this.tableColumns = [];
    this.http.get<{ columns: string[] }>(`http://localhost:3000/get-columns?table=${tableName}`)
      .subscribe(
        response => {
          let columns = response.columns;
          // Beispielhafte Sortierung: 'sid' immer zuerst, danach alphabetisch
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
  
  

  /*
   Wird aufgerufen, wenn eine Spalte in der Liste ausgewählt oder abgewählt wird.
   Es wird ein Objekt (ColumnConfig) angelegt oder entfernt.
   */
  toggleColumnSelection(column: string, tableName: string, event: any): void {
    const fullColumn = `${tableName}.${this.activeAlias}.${column}`;
    if (event.target.checked) {
      if (!this.selectedColumnConfigs.find(c => c.fullColumn === fullColumn)) {
        this.selectedColumnConfigs.push({
          fullColumn,
          search: false,
          groupBy: false,
          orderBy: 'none'
        });
      }
    } else {
      this.selectedColumnConfigs = this.selectedColumnConfigs.filter(c => c.fullColumn !== fullColumn);
    }
  }
  

  /**
   * Zyklischer Wechsel des OrderBy-Zustands:
   * '---' -> 'ASC' -> 'DESC' -> '---'
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

  generateColumnGroups(): { columnGroups: any[]; fullColumnToId: { [key: string]: number } } {
    let groupId = 0;
    let globalColumnId = 0;
    const fullColumnToId: { [key: string]: number } = {};
  
    // Gruppierung nach "Tabelle.Alias"
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
        // Erzeuge das Spaltenobjekt
        const columnObj: any = {
          id: globalColumnId,
          name: colName,
          multiLinugal: false,
          enqPropDataTypeSid: 1,
          selectClause: `${tableAlias}.${colName}`,
          alias: colName
        };
        // Falls der Alias nicht der Basis-Tabelle entspricht, handelt es sich um eine Join-Spalte
        if (tableAlias !== this.baseAlias) {
          // Index finden in joinRows, bei dem der Alias übereinstimmt
          const joinIndex = this.joinRows.findIndex(row => row.alias === tableAlias);
          if (joinIndex !== -1) {
            columnObj.joinGroupId = joinIndex + 1; // joinGroupId bei den Spalten der Tabellen auf die gejoint wird
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
  
  // save JSON-Konfiguration
  saveJsonConfig(): void {
    const { columnGroups, fullColumnToId } = this.generateColumnGroups();
  
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
  
    // Erzeugen von resultColumns
    let resultColumns: any[] = [];
    columnGroups.forEach((group: any) => {
      group.columns.forEach((col: any) => {
        resultColumns.push({
          columnId: col.id,
          hidden: false,
          identity: true,
          orderNumber: col.id
        });
      });
    });
  
    // Erzeugen der orderByColumns anhand des OrderBy-Zustands
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
      orderByColumns: orderByColumns
    };
  
    const fileNameToSave = (this.fileName === 'new' || !this.fileName)
      ? `${jsonData.name}.json`
      : this.fileName;
  
    this.http.post('http://localhost:3000/save-json', jsonData).subscribe(
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
