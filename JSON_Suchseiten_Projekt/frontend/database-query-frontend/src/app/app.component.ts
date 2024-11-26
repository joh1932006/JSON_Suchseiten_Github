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
  selectedBaseTable: string = ''; // Selected Ausgangstabelle
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

  tables: string[] = []; // Stores fetched table names
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

  closeEditDbConfigModal() {
    this.showEditDbConfigModal = false;
  }

  addDatabase() {
    if (this.newDatabase.name) {
      this.databases.push({
        name: this.newDatabase.name,
        config: { ...this.newDatabase }
      });

      this.selectedDatabase = this.newDatabase.name;

      this.http.post('http://localhost:3000/set-database', this.newDatabase).subscribe(
        () => {
          console.log('Database configuration sent to backend successfully');
          this.fetchTables(); // Fetch tables after adding database
        },
        error => console.error('Error updating database configuration on the backend:', error)
      );

      this.closeDbConfigModal();
      this.resetNewDatabaseForm();
    } else {
      console.error('Database name is required');
    }
  }

  fetchTables() {
    if (!this.selectedDatabase) {
      console.error("No database selected");
      return;
    }

    this.http.get<{ tables: string[] }>('http://localhost:3000/get-tables').subscribe(
      response => {
        this.tables = response.tables;
        console.log("Tables fetched:", this.tables);
      },
      error => console.error('Error fetching tables:', error)
    );
  }

  updateDatabaseConfig() {
    const selectedDbConfig = this.databases.find(db => db.name === this.selectedDatabase)?.config;
    if (selectedDbConfig) {
      this.http.post('http://localhost:3000/set-database', selectedDbConfig).subscribe(
        () => {
          console.log('Database configuration updated on the server');
          this.fetchTables(); // Fetch tables after database selection
        },
        error => console.error('Error updating database configuration:', error)
      );
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
    this.tables = []; // Clear tables when database is deleted
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
