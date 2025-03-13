import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-apirequests',
  standalone: true,
  imports: [FormsModule,CommonModule],
  templateUrl: './apirequests.component.html',
  styleUrls: ['./apirequests.component.css']
})
export class APIRequestsComponent {
  inputText: string = ''; 
  sqlStatement: string = ''; 
  errorMessage: string = ''; 

  constructor(private http: HttpClient) {}

  sendText() {
    const jsonString = this.inputText;

    try {
        JSON.parse(jsonString);
    } catch (error) {
        this.errorMessage = 'Ungültiges JSON-Format. Bitte überprüfen Sie den eingegebenen Text.';
        return;
    }

    this.http.post<any>('http://localhost:3000/convert-json-to-sql', { jsonString })
        .subscribe({
            next: (response) => {
                console.log("API-Antwort:", response); // Ausgabe in der Konsole zur Überprüfung
                this.sqlStatement = response.sqlStatement.sqlStatement.value; // SQL-Statement aus der Antwort extrahieren
                this.errorMessage = ''; // Fehlernachricht zurücksetzen
            },
            error: (error) => {
                this.errorMessage = 'Fehler bei der API-Anfrage. Bitte überprüfen Sie den Server und die Verbindung.';
                console.error('Fehler beim Senden der Anfrage:', error);
            }
        });
}



}


