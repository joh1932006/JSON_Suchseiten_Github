import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface IColumnConfig {
  id: number;
  name: string;        // z.B. "confirmationPending"
  alias: string;       // z.B. "confirmationPending"
  orderNumber?: number;
  hidden?: boolean;
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
    // Lese den kompakt formatierten JSON-String und den Dateinamen aus dem Router-State
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state) {
      if (nav.extras.state['compactJson']) {
        this.compactJson = nav.extras.state['compactJson'];
      }
      if (nav.extras.state['fileName']) {
        this.configFileName = nav.extras.state['fileName'];
      }
    } else {
      // Fallback bei Reloads
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
   * - this.searchColumns (z.B. ["SID", "confirmationPending"])
   * - this.resultColumns (z.B. ["SID", "confirmationPending", "createDate"])
   */
  parseJsonConfig(): void {
    try {
      // Es wird erwartet, dass compactJson so aufgebaut ist: { "jsonString": "..." }
      const outer = JSON.parse(this.compactJson);
      const data = JSON.parse(outer.jsonString);

      // Falls kein Dateiname (configFileName) gesetzt wurde, verwende data.name als Basis
      if (!this.configFileName && data.name) {
        this.configFileName = data.name + '.json';
      }

      // 1) Erzeuge eine Map: columnId -> IColumnConfig
      let columnMap: Record<number, IColumnConfig> = {};
      for (const group of data.columnGroups || []) {
        for (const col of group.columns || []) {
          columnMap[col.id] = {
            id: col.id,
            name: col.name,
            alias: col.alias,
          };
        }
      }

      // 2) Erzeuge das Array der Suchspalten (searchColumns)
      this.searchColumns = [];
      for (const sCol of data.searchColumns || []) {
        // Hier wird nur der erste Eintrag in columnId berücksichtigt
        const colId = sCol.columnId?.[0];
        if (colId && columnMap[colId]) {
          const colCfg = columnMap[colId];
          this.searchColumns.push({
            id: colCfg.id,
            alias: colCfg.alias,
            label: colCfg.name, // Alternativ könnte auch colCfg.alias verwendet werden
            value: ''
          });
        }
      }

      // 3) Erzeuge das Array der Ergebnis-Spalten (resultColumns) in der richtigen Reihenfolge
      this.resultColumns = [];
      const sortedResultCols = (data.resultColumns || []).sort(
        (a: any, b: any) => a.orderNumber - b.orderNumber
      );
      for (const rCol of sortedResultCols) {
        const colId = rCol.columnId;
        if (colId && columnMap[colId]) {
          const colCfg = columnMap[colId];
          // Falls rCol.hidden == true, kann man die Spalte auch auslassen
          if (!rCol.hidden) {
            this.resultColumns.push({
              id: colCfg.id,
              alias: colCfg.alias,
              name: colCfg.name,
              orderNumber: rCol.orderNumber
            });
          }
        }
      }
    } catch (err) {
      console.error('Fehler beim Parsen der JSON-Konfiguration:', err);
      this.errorMessage = 'Fehler beim Parsen der JSON-Konfiguration.';
    }
  }

  /**
   * Sendet den kompakt formatierten JSON-String an den Endpoint "convert-json-to-sql"
   * und leitet anschließend die SQL-Ausführung ein.
   */
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
          // Führe die SQL-Abfrage aus
          this.executeSqlQuery();
        },
        error: (err) => {
          console.error('Fehler bei der API-Anfrage (convert-json-to-sql):', err);
          this.errorMessage = 'Fehler bei der API-Anfrage. Bitte überprüfe den Server und die Verbindung.';
        }
      });
  }

  /**
   * Führt das SQL-Statement aus und befüllt das Array sqlResults.
   */
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

  /**
   * Navigiert zurück zum JSON-Konfiguration Editor und öffnet genau die Konfiguration,
   * von der die SQL-Ergebnisse stammen.
   */
  goBack(): void {
    // Falls kein Dateiname vorhanden ist, wird 'new' als Default verwendet
    const targetFile = this.configFileName || 'new';
    this.router.navigate(['config', targetFile]);
  }

  /**
   * Hilfsmethode, um die Schlüssel eines Objekts zu erhalten – nützlich, wenn SQL-Ergebnisse raw ausgegeben werden.
   */
  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  /**
   * Clientseitiges Filtern der SQL-Ergebnisse anhand der searchColumns[].value.
   */
  get filteredResults(): any[] {
    if (!this.sqlResults || this.sqlResults.length === 0) {
      return [];
    }
    // Jede Suchspalte muss den eingegebenen Wert enthalten
    return this.sqlResults.filter((row) => {
      return this.searchColumns.every((sc) => {
        if (!sc.value) {
          return true; // Kein Filter, wenn nichts eingegeben wurde
        }
        const cellValue = String(row[sc.alias] ?? '');
        return cellValue.includes(sc.value);
      });
    });
  }

  /**
   * Wird aufgerufen, wenn sich die Eingaben in den Suchfeldern ändern.
   * Hier wird nur ein Re-Rendering ausgelöst.
   */
  onSearchChange(): void {
    // Bei Bedarf kann hier serverseitiges Filtern implementiert werden.
  }
}
