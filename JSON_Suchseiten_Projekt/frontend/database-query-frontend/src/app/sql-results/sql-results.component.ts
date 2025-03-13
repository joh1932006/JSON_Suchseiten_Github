import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface IColumnConfig {
  id: number;
  name: string;
  alias: string;
  tableName?: string;
  orderNumber?: number;
  hidden?: boolean;
  decimals?: number;
  width?: number;  // Diese Eigenschaft aufnehmen
}

@Component({
  selector: 'app-sql-results',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './sql-results.component.html',
  styleUrls: ['./sql-results.component.css']
})
export class SqlResultsComponent implements OnInit {
  sqlStatement: string = '';
  sqlResults: any[] = [];
  errorMessage: string = '';
  compactJson: string = '';
  configFileName: string = '';

  // Dynamisch ermittelte Suchspalten
  searchColumns: Array<{
    id: number;
    alias: string;
    label: string;
    value: string;
  }> = [];

  // Dynamisch ermittelte Ergebnis-Spalten
  resultColumns: IColumnConfig[] = [];

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      if (nav.extras.state['compactJson']) {
        this.compactJson = nav.extras.state['compactJson'];
      }
      if (nav.extras.state['fileName']) {
        this.configFileName = nav.extras.state['fileName'];
      }
    } else {
      this.compactJson = history.state['compactJson'] || '';
      this.configFileName = history.state['fileName'] || '';
    }
    if (this.compactJson) {
      this.parseJsonConfig();
      this.sendJsonToApi();
    } else {
      this.errorMessage = 'Kein JSON-String vorhanden.';
    }
  }

  /**
   * Parst den JSON-String und befüllt die Arrays:
   * - this.searchColumns
   * - this.resultColumns
   */
  parseJsonConfig(): void {
    try {
      const outer = JSON.parse(this.compactJson);
      const data = JSON.parse(outer.jsonString);
      if (!this.configFileName && data.name) {
        this.configFileName = data.name + '.json';
      }
      // Erzeuge eine Map: columnId -> IColumnConfig, inkl. width
      let columnMap: Record<number, IColumnConfig> = {};
      for (const group of data.columnGroups || []) {
        let tableName = "";
        if (group.name && group.name.startsWith("Group for ")) {
          const start = "Group for ".length;
          const end = group.name.indexOf(" (");
          tableName = group.name.substring(start, end !== -1 ? end : group.name.length);
        }
        for (const col of group.columns || []) {
          const fullName = tableName ? `${tableName}.${col.name}` : col.name;
          columnMap[col.id] = {
            id: col.id,
            name: fullName,
            alias: col.alias,
            tableName: tableName,
            decimals: col.decimals,
            width: col.width   // Hier wird die Breite übernommen
          };
        }
      }
      
      // Suchspalten
      this.searchColumns = [];
      const sortedSearchCols = (data.searchColumns || []).sort(
        (a: any, b: any) => a.orderNumber - b.orderNumber
      );
      for (const sCol of sortedSearchCols) {
        const colId = sCol.columnId?.[0];
        if (colId && columnMap[colId]) {
          const colCfg = columnMap[colId];
          this.searchColumns.push({
            id: colCfg.id,
            alias: colCfg.alias,
            label: colCfg.name,
            value: ''
          });
        }
      }
      
      // Ergebnis-Spalten
      this.resultColumns = [];
      const sortedResultCols = (data.resultColumns || []).sort(
        (a: any, b: any) => a.orderNumber - b.orderNumber
      );
      for (const rCol of sortedResultCols) {
        const colId = rCol.columnId;
        if (colId && columnMap[colId]) {
          const colCfg = columnMap[colId];
          if (!rCol.hidden) {
            this.resultColumns.push({
              id: colCfg.id,
              alias: colCfg.alias,
              name: colCfg.name,
              orderNumber: rCol.orderNumber,
              decimals: colCfg.decimals,
              width: colCfg.width   // Hier ebenfalls
            });
          }
        }
      }
    } catch (err) {
      console.error('Fehler beim Parsen der JSON-Konfiguration:', err);
      this.errorMessage = 'Fehler beim Parsen der JSON-Konfiguration.';
    }
  }

  sendJsonToApi(): void {
    const payload = { jsonString: this.compactJson };
    this.http.post<any>('http://localhost:3000/convert-json-to-sql', payload)
      .subscribe({
        next: (response) => {
          console.log("API-Antwort (convert-json-to-sql):", response);
          if (response && typeof response.sqlStatement === 'string') {
            this.sqlStatement = response.sqlStatement;
          } else if (response && response.sqlStatement && response.sqlStatement.sqlStatement && response.sqlStatement.sqlStatement.value) {
            this.sqlStatement = response.sqlStatement.sqlStatement.value;
          } else if (response && response.sqlStatement) {
            this.sqlStatement = JSON.stringify(response.sqlStatement);
          } else {
            this.errorMessage = 'Kein SQL-Statement in der Antwort enthalten.';
            return;
          }
          this.executeSqlQuery();
        },
        error: (err) => {
          console.error('Fehler bei der API-Anfrage (convert-json-to-sql):', err);
          this.errorMessage = 'Fehler bei der API-Anfrage. Bitte überprüfe den Server und die Verbindung.';
        }
      });
  }

  goHome(): void {
    this.router.navigate(['']);
  }
  
  executeSqlQuery(): void {
    const payload = { sqlQuery: this.sqlStatement };
    this.http.post<any>('http://localhost:3000/execute-sql', payload)
      .subscribe({
        next: (response) => {
          console.log("API-Antwort (execute-sql):", response);
          if (response && response.result) {
            this.sqlResults = response.result;
          } else {
            this.errorMessage = 'Keine Ergebnisse von der SQL-Abfrage erhalten.';
          }
        },
        error: (err) => {
          console.error('Fehler bei der SQL-Ausführung:', err);
          this.errorMessage = 'Fehler bei der SQL-Ausführung. Bitte überprüfe den Server und die Verbindung.';
        }
      });
  }

  goBack(): void {
    const targetFile = this.configFileName || 'new';
    this.router.navigate(['config', targetFile]);
  }
  
  get filteredResults(): any[] {
    if (!this.sqlResults || this.sqlResults.length === 0) {
      return [];
    }
    return this.sqlResults.filter((row) => {
      return this.searchColumns.every((sc) => {
        if (!sc.value) {
          return true;
        }
        const cellValue = String(row[sc.alias] ?? '');
        return cellValue.includes(sc.value);
      });
    });
  }
  
  onSearchChange(): void {
    // Optional: serverseitiges Filtern
  }
}
