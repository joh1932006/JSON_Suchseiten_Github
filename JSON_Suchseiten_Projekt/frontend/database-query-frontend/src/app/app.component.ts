import { Component } from '@angular/core';
import { APIRequestsComponent } from './apirequests/apirequests.component'; // Pfad zur apirequests-Komponente
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [APIRequestsComponent, HttpClientModule], // Komponente importieren
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'mein-projekt';
}
