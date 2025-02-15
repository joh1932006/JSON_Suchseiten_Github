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

  // Dynamisch ermittelte Suchspalten
  searchColumns: Array<{
    id: number;
    alias: string; // z.B. "SID"
    label: string; // Was im Input-Label angezeigt wird
    value: string; // Eingabewert
  }> = [];

  // Dynamisch ermittelte Ergebnis-Spalten
  resultColumns: IColumnConfig[] = [];

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    // Lese den kompakt formatierten JSON-String aus dem Router-State
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras?.state && nav.extras.state['compactJson']) {
      this.compactJson = nav.extras.state['compactJson'];
    } else {
      // Fallback: Bei Reloads
      this.compactJson = history.state['compactJson'] || '';
    }

    if (this.compactJson) {
      // 1) Parse das JSON → extrahiere Search-Spalten / Result-Spalten
      this.parseJsonConfig();

      // 2) Ruf den Endpoint "convert-json-to-sql" auf
      this.sendJsonToApi();
    } else {
      this.errorMessage = 'Kein JSON-String vorhanden.';
    }
  }

  /**
   * Parst den JSON-String und befüllt die Arrays:
   *  - this.searchColumns  (z.B. ["SID", "confirmationPending"])
   *  - this.resultColumns  (z.B. ["SID", "confirmationPending", "createDate"])
   */
  parseJsonConfig(): void {
    try {
      // In deinem Beispiel hast du: { "jsonString": "..." }
      // Deshalb erst JSON.parse(this.compactJson), dann nochmal JSON.parse(...) 
      const outer = JSON.parse(this.compactJson); 
      const data = JSON.parse(outer.jsonString);

      /*
        data.columnGroups -> z.B.:
          [
            {
              id: 1,
              name: 'Group for ActionGrp (ac)',
              columns: [
                { id:1, name:'SID', alias:'SID', ...}
              ]
            },
            {
              id: 2,
              name: 'Group for aUser (au)',
              columns: [
                { id:2, name:'confirmationPending', alias:'confirmationPending', ...},
                { id:3, name:'createDate', alias:'createDate', ...}
              ]
            }
          ]

        data.searchColumns -> z.B.:
          [
            {id:1, columnId:[1], orderNumber:1, operatorSid:15},
            {id:2, columnId:[2], orderNumber:2, operatorSid:15}
          ]

        data.resultColumns -> z.B.:
          [
            { columnId:1, hidden:false, identity:true, orderNumber:1 },
            { columnId:2, hidden:false, identity:true, orderNumber:2 },
            { columnId:3, hidden:false, identity:true, orderNumber:3 }
          ]
      */

      // 1) Baue eine Map: columnId -> {id,alias,name,...}
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

      // 2) Search-Spalten: z.B. data.searchColumns -> columnId:[1], [2]
      //    Also hol dir die columns aus columnMap und speichere sie in searchColumns
      this.searchColumns = [];
      for (const sCol of data.searchColumns || []) {
        // Jede searchColumn kann mehrere columnId-Einträge haben, 
        // in deinem JSON-Beispiel z.B. "columnId": [1] etc.
        // Wir nehmen nur den ersten Eintrag
        const colId = sCol.columnId?.[0];
        if (colId && columnMap[colId]) {
          const colCfg = columnMap[colId];
          this.searchColumns.push({
            id: colCfg.id,
            alias: colCfg.alias,
            label: colCfg.name, // Alternativ könnte hier auch colCfg.alias verwendet werden
            value: ''
          });
        }
      }

      // 3) Result-Spalten: Anordnung per orderNumber
      //    data.resultColumns -> z.B. {columnId:1, orderNumber:1}, ...
      //    Hol dir die columnMap-Einträge in der angegebenen Reihenfolge
      this.resultColumns = [];
      const sortedResultCols = (data.resultColumns || []).sort(
        (a: any, b: any) => a.orderNumber - b.orderNumber
      );

      for (const rCol of sortedResultCols) {
        const colId = rCol.columnId;
        if (colId && columnMap[colId]) {
          const colCfg = columnMap[colId];
          // Falls rCol.hidden == true, könnte man die Spalte auslassen
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

      // Jetzt haben wir in this.searchColumns die Suchspalten
      // und in this.resultColumns die zu rendernden Ergebnis-Spalten.

    } catch (err) {
      console.error('Fehler beim Parsen der JSON-Konfiguration:', err);
      this.errorMessage = 'Fehler beim Parsen der JSON-Konfiguration.';
    }
  }

  sendJsonToApi(): void {
    // Sende direkt den kompakt formatierten JSON-String an den Endpoint
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
          // Führe das SQL-Statement aus
          this.executeSqlQuery();
        },
        error: (err) => {
          console.error('Fehler bei der API-Anfrage (convert-json-to-sql):', err);
          this.errorMessage = 'Fehler bei der API-Anfrage. Bitte überprüfe den Server und die Verbindung.';
        }
      });
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
    this.router.navigate(['']);
  }

  // Hilfsmethode zum Erhalten der Schlüssel eines Objekts – 
  // nur noch ggf. relevant, wenn du "sqlResults" raw ausgibst.
  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  /**
   * Clientseitiges Filtern der SQL-Ergebnisse
   * auf Basis der searchColumns[].value
   */
  get filteredResults(): any[] {
    if (!this.sqlResults || this.sqlResults.length === 0) {
      return [];
    }

    // Filter-Logik: Jede searchColumn muss matchen
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
   * Falls wir nach jedem Tastendruck filtern wollen
   * (searchOnType = true), rufen wir diese Methode bei (input) auf.
   */
  onSearchChange(): void {
    // Hier passiert nur das Re-Rendering von `filteredResults`.
    // Möchte man serverseitig filtern, müsste hier eine entsprechende Logik implementiert werden.
  }
}
