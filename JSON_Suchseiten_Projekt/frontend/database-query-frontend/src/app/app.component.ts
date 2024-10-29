import { Component } from '@angular/core';
import { APIRequestsComponent } from './apirequests/apirequests.component';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [APIRequestsComponent, HttpClientModule, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'mein-projekt';
  databases: string[] = ['Datenbank1', 'Datenbank2', 'Datenbank3'];
  selectedDatabase: string = '';
}
