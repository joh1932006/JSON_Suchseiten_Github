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

  constructor(private http: HttpClient) {}

  // Opens the modal for adding a new database
  openDbConfigModal() {
    this.resetNewDatabaseForm(); // Reset the form when opening the modal
    this.showDbConfigModal = true;
  }

  // Closes the modal
  closeDbConfigModal() {
    this.showDbConfigModal = false;
  }

  // Adds a new database to the list and sends it to the backend
  addDatabase() {
    if (this.newDatabase.name) {
      this.databases.push({
        name: this.newDatabase.name,
        config: { ...this.newDatabase }
      });

      // Automatically select the newly added database
      this.selectedDatabase = this.newDatabase.name;

      // Send the new configuration to the backend
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

  // Opens the modal to edit the selected database configuration
  editDatabase() {
    const selectedDbConfig = this.databases.find(db => db.name === this.selectedDatabase);
    if (selectedDbConfig) {
      this.newDatabase = { ...selectedDbConfig.config, name: selectedDbConfig.name };
      this.showEditDbConfigModal = true;
    }
  }

  // Saves changes to the selected database configuration
  saveDatabaseConfig() {
    const selectedDb = this.databases.find(db => db.name === this.newDatabase.name);
    if (selectedDb) {
      selectedDb.config = { ...this.newDatabase };
      this.updateDatabaseConfig();
      this.closeEditDbConfigModal();
    }
  }

  // Deletes the selected database from the list
  deleteDatabase() {
    this.databases = this.databases.filter(db => db.name !== this.selectedDatabase);
    this.selectedDatabase = '';
  }

  // Closes the edit modal
  closeEditDbConfigModal() {
    this.showEditDbConfigModal = false;
  }

  // Resets the form for a new database
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

  // Sends the selected database configuration to the backend
  updateDatabaseConfig() {
    const selectedDbConfig = this.databases.find(db => db.name === this.selectedDatabase)?.config;
    if (selectedDbConfig) {
      this.http.post('http://localhost:3000/set-database', selectedDbConfig).subscribe(
        () => console.log('Database configuration updated on the server'),
        error => console.error('Error updating database configuration:', error)
      );
    }
  }
}
