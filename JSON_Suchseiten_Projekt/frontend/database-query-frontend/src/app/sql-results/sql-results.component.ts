import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
      this.sendJsonToApi();
    } else {
      this.errorMessage = 'Kein JSON-String vorhanden.';
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

  // Hilfsmethode zum Erhalten der Schlüssel eines Objekts
  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
