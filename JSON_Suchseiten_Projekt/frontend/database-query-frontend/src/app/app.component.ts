import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  // Database management variables
  databases: { name: string; config: any }[] = [];
  selectedDatabase: string = '';
  showDbConfigModal: boolean = false;
  showEditDbConfigModal: boolean = false;
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

  username: string = '';
  loggedInUser: string | null = null;

  // Dynamic join management variables
  joinRows: { table: string; joinType: string; condition: string }[] = [];

  constructor(private http: HttpClient) {}

  // Login-Funktion
  login() {
    if (this.username.trim()) {
      this.loggedInUser = this.username;
    }
  }

  // Database management methods
  openDbConfigModal() {
    this.resetNewDatabaseForm();
    this.showDbConfigModal = true;
  }

  closeDbConfigModal() {
    this.showDbConfigModal = false;
  }

  addDatabase() {
    if (this.newDatabase.name) {
      this.databases.push({
        name: this.newDatabase.name,
        config: { ...this.newDatabase }
      });

      this.selectedDatabase = this.newDatabase.name;

      this.http.post('http://localhost:3000/set-database', this.newDatabase).subscribe(
        () => console.log('Database configuration sent to backend successfully'),
        error => console.error('Error updating database configuration on the backend:', error)
      );

      this.closeDbConfigModal();
      this.resetNewDatabaseForm();
    } else {
      console.error('Database name is required');
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
  }

  closeEditDbConfigModal() {
    this.showEditDbConfigModal = false;
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

  updateDatabaseConfig() {
    const selectedDbConfig = this.databases.find(db => db.name === this.selectedDatabase)?.config;
    if (selectedDbConfig) {
      this.http.post('http://localhost:3000/set-database', selectedDbConfig).subscribe(
        () => console.log('Database configuration updated on the server'),
        error => console.error('Error updating database configuration:', error)
      );
    }
  }

  // Dynamic join management methods
  addJoinRow() {
    const newRow = {
      table: '', // Default table name
      joinType: 'INNER JOIN', // Default join type
      condition: '' // Default condition
    };

    this.joinRows.push(newRow); // Add the new row to the array
  }

  removeJoinRow(index: number) {
    this.joinRows.splice(index, 1); // Remove the row at the specified index
  }
}
