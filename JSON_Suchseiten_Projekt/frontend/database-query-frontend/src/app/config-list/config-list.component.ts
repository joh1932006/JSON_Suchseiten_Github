import { Component, OnInit } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';  // <--- FormsModule importieren

@Component({
  selector: 'app-config-list',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],  // <--- Hier FormsModule hinzufügen
  templateUrl: './config-list.component.html',
  styleUrls: ['./config-list.component.css']
})
export class ConfigListComponent implements OnInit {
  jsonConfigs: string[] = [];
  username: string = '';
  loggedInUser: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login() {
    if (this.username.trim()) {
      this.loggedInUser = this.username;
    }
  }

  ngOnInit(): void {
    this.http.get<string[]>('http://localhost:3000/api/config-files').subscribe({
      next: (files) => {
        this.jsonConfigs = files;
        console.log('Gefundene JSON-Konfigurationen:', this.jsonConfigs);
      },
      error: (err) => {
        console.error('Fehler beim Laden der Konfigurationsdateien:', err);
      }
    });
  }

  onConfigClick(fileName: string) {
    this.router.navigate(['config', fileName]);
  }

  onNewConfig() {
    this.router.navigate(['config', 'new']);
  }
}
