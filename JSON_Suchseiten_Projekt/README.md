
# Database Query Frontend & JSON-Konfiguration Editor

Dieses Projekt besteht aus zwei Hauptkomponenten:

1. **Backend (Express/Node.js):**  
   Das Backend stellt verschiedene API-Endpunkte zur Verfügung, um:
   - Eine Verbindung zur Microsoft SQL Server-Datenbank herzustellen und zu testen.
   - Tabellen, Spalten, Fremdschlüssel, joinbare Tabellen und weitere Metadaten aus der Datenbank abzufragen.
   - Dynamisch generierte SQL-Abfragen basierend auf einer JSON-Konfiguration auszuführen.
   - JSON-Konfigurationen und zugehörige Meta-Daten (UI-Meta-Daten) zu speichern, zu laden und zu löschen.
   - Gespeicherte Datenbankverbindungen dauerhaft zu verwalten.

2. **Frontend (Angular):**  
   Die Angular-Anwendung stellt ein benutzerfreundliches Interface zur Verfügung, um:
   - Vorhandene JSON-Konfigurationen anzuzeigen, zu bearbeiten oder neue Konfigurationen zu erstellen.
   - Eine visuelle Bearbeitung von Join-Bedingungen, Spaltenkonfigurationen und anderen Einstellungen vorzunehmen.
   - Ergebnisse der SQL-Abfragen anzuzeigen, die auf den JSON-Konfigurationen basieren.
   - Eine Datenbankverwaltung (Hinzufügen, Bearbeiten, Löschen von Datenbankverbindungen) durchzuführen.

---

## Inhaltsverzeichnis

- [Funktionen](#funktionen)
- [Systemarchitektur](#systemarchitektur)
- [Voraussetzungen](#voraussetzungen)
- [Installation und Setup](#installation-und-setup)
- [Backend-Konfiguration](#backend-konfiguration)
- [Frontend-Konfiguration](#frontend-konfiguration)
- [API-Endpunkte](#api-endpunkte)
- [Entwicklungsworkflow](#entwicklungsworkflow)
- [Bekannte Probleme & Hinweise](#bekannte-probleme--hinweise)

---

## Funktionen

- **Datenbankverwaltung:**  
  - Testen und Setzen der Datenbankkonfiguration.
  - Abrufen von Tabellen, Spalten, Fremdschlüsseln und joinbaren Tabellen.

- **SQL-Generierung und Ausführung:**  
  - Umwandlung von JSON-Konfigurationen in SQL-Abfragen (über die externe API).
  - Dynamische Ausführung von SQL-Abfragen (einschließlich Joins) und Anzeige von Ergebnissen.

- **JSON-Konfiguration:**  
  - Erstellung, Speicherung, Laden und Löschung von API-konformen JSON-Konfigurationen.
  - Speichern von UI-Meta-Daten, um den Bearbeitungsstatus (wie Join-Konfiguration, Spaltenauswahl, Alias-Namen) zu erhalten.

- **Angular Frontend:**  
  - Übersicht aller gespeicherten JSON-Konfigurationen.
  - Editor für die Erstellung/Bearbeitung von Konfigurationen inklusive Join- und Spaltenkonfiguration.
  - Visualisierung der Ergebnisse der ausgeführten SQL-Abfragen.

---

## Systemarchitektur

- **Backend:**  
  - Programmiert in Node.js/Express.
  - Verwendet `mssql` zur Kommunikation mit Microsoft SQL Server.
  - Dateisystemzugriffe erfolgen über `fs` zum Speichern und Laden von JSON-Konfigurationen und Meta-Daten.
  - API-Endpunkte liegen sowohl im Root- als auch im `/api`-Pfad vor.

- **Frontend:**  
  - Angular (standalone Komponenten).
  - Komponenten:  
    - `ConfigListComponent`: Zeigt alle Konfigurationen an und bietet Funktionen zum Löschen, Bearbeiten und Anzeigen der SQL-Ergebnisse.
    - `JsonConfigEditorComponent`: Editor für die Bearbeitung bzw. Erstellung einer JSON-Konfiguration.
    - `SqlResultsComponent`: Zeigt die Ergebnisse der ausgeführten SQL-Abfragen an.

- **Routing:**  
  - Clientseitige Routen wie `/`, `/config/new`, `/config/:filename` und `/sql-results` werden von Angular über den HTML5-Router verwaltet.

---

## Voraussetzungen

- **Node.js** (Version 20.16.0 wurde benutzt)
- **npm** (Node Package Manager)
- Microsoft SQL Server (für Datenbankverbindung)

---

## Installation und Setup

### Backend

1. **Repository klonen und Abhängigkeiten installieren:**

   ```bash
   cd .
   npm install
   ```
- Node.js installieren über 'https://nodejs.org'

2. **Backend starten:**

   ```bash
   cd .\backend\
   node server.js
   ```

   Der Server läuft standardmäßig auf `http://localhost:3000`.

3. **Konfiguration der Datenbankverbindungen:**  
   Ihr könnt die API-Endpunkte `/set-database` und `/api/save-database-connection` verwenden, um eure DB-Konfiguration zu setzen und dauerhaft zu speichern.  

4. **Ordnerstruktur:**  
   - `../JsonKonfigurationen`: Hier werden die JSON-Konfigurationen gespeichert.
   - `../MetaDataJson`: Hier werden die Meta-Daten gespeichert.
   - `dbConnections.json`: Enthält die persistierten DB-Verbindungen.

### Frontend

1. **Angular-Projekt klonen und Abhängigkeiten installieren:**

   ```bash
   cd .
   npm install -g @angular/cli
   ```

2. **Entwicklungsserver starten:**

   ```bash
   cd .\frontend\database-query-frontend\
   ng serve
   ```

   Die Anwendung ist dann unter `http://localhost:4200` erreichbar.

---

## Backend-Konfiguration

- **Express-Server:**  
  Der Server stellt API-Endpunkte zur Verfügung, die unter anderem folgende Aufgaben erfüllen:
  - **Datenbankkonfiguration und Test:** `/set-database`
  - **Abruf von Tabellen/Spalten:** `/get-tables`, `/get-columns`
  - **Join-Funktionalitäten:** `/get-joinable-tables`, `/get-foreign-keys`
  - **JSON-Konfigurationen:** `/api/config-files`, `/api/read-config`, `/api/save-json`, `/api/delete-config`
  - **UI-Meta-Daten:** `/api/save-meta`, `/api/read-meta`
  - **DB-Verbindungen:** `/api/save-database-connection`, `/api/get-database-connections`, `/api/delete-database-connection`
  - **SQL-Abfrage ausführen:** `/execute-sql` und `/get-sample-row`, `/get-sample-join`
  - **Datentypabfrage:** `/api/get-column-type`

---

## Frontend-Konfiguration

- **Routing (app.routes.ts):**  
  Definiert die Routen:
  - `/`: Startseite (Konfigurationsliste)
  - `/config/new`: Neuerstellung einer Konfiguration
  - `/config/:filename`: Bearbeiten einer existierenden Konfiguration
  - `/sql-results`: Anzeige der SQL-Ergebnisse (lazy-loaded)

- **Konfiguration der API-URLs:**  
  Alle API-Aufrufe erfolgen aktuell über `http://localhost:3000/`.

- **Angular-Komponenten:**
  - **ConfigListComponent:**  
    Zeigt alle gespeicherten JSON-Konfigurationen an, ermöglicht das Löschen, Bearbeiten und Anzeigen von Ergebnissen.
  
  - **JsonConfigEditorComponent:**  
    Ermöglicht die Bearbeitung bzw. Erstellung von JSON-Konfigurationen. Hier können Joins, Spalten, Alias-Namen und weitere Einstellungen vorgenommen werden.
  
  - **APIRequestsComponent:**  
    (Optional) Zeigt eine Testumgebung der JSON-String in SQl-Statement-Umwandlung an.

- **Stil und Layout:**  
  Das Frontend verwendet u. a. externe Stylesheets und eigene CSS-Dateien, um das Layout ansprechend zu gestalten.

---

## API-Endpunkte

Hier eine kurze Übersicht der wichtigsten API-Endpunkte:

- **Datenbank-Operationen:**
  - `POST /set-database`  
    Setzt und testet die aktuelle DB-Konfiguration.
  - `GET /get-tables`  
    Liefert alle Tabellen aus der konfigurierten Datenbank.
  - `GET /get-columns?table=...`  
    Liefert die Spalten einer bestimmten Tabelle.
  - `GET /get-foreign-keys?table=...`  
    Liefert die Fremdschlüsselinformationen für eine Tabelle.
  - `GET /get-joinable-tables?baseTable=...`  
    Liefert joinbare Tabellen basierend auf Fremdschlüsseln.
  - `GET /api/get-column-type?table=...&column=...`  
    Bestimmt den Datentyp einer Spalte.

- **SQL-Abfragen:**
  - `POST /execute-sql`  
    Führt eine dynamisch generierte SQL-Abfrage aus.
  - `GET /get-sample-row?table=...`  
    Liefert eine Beispielzeile aus einer Tabelle.
  - `GET /get-sample-join?joinQuery=...`  
    Liefert eine Beispielzeile aus einem dynamisch erstellten Join.

- **JSON-Konfigurationen:**
  - `GET /api/config-files`  
    Listet alle gespeicherten JSON-Konfigurationen auf.
  - `GET /api/read-config?fileName=...`  
    Lädt eine spezifische Konfiguration.
  - `POST /api/save-json`  
    Speichert eine Konfiguration.
  - `DELETE /api/delete-config?fileName=...`  
    Löscht eine Konfiguration.

- **UI-Meta-Daten:**
  - `POST /api/save-meta`  
    Speichert Meta-Daten zur Benutzeroberfläche (z. B. Join-Konfiguration, Spaltenauswahl).
  - `GET /api/read-meta?fileName=...`  
    Lädt die gespeicherten Meta-Daten.

- **Datenbankverbindungen:**
  - `POST /api/save-database-connection`  
    Speichert eine neue DB-Verbindung dauerhaft.
  - `GET /api/get-database-connections`  
    Liefert alle gespeicherten DB-Verbindungen.
  - `DELETE /api/delete-database-connection?name=...`  
    Löscht eine gespeicherte DB-Verbindung.

- **Externer Service:**  
  - `POST /convert-json-to-sql`  
    Übersetzt eine JSON-Konfiguration in einen SQL-Befehl (via externer API).

---

## Entwicklungsworkflow

1. **Backend-Entwicklung:**  
   - Änderungen am Server-Code unter `/backend/server.js` oder unter `/backend/saveJSONRoute.js`.
   - Testen der API-Endpunkte via Postman oder im Browser.

2. **Frontend-Entwicklung:**  
   - Änderungen an den Angular-Komponenten (z. B. `ConfigListComponent`, `JsonConfigEditorComponent`).
   - Lokales Testen mit `ng serve`.

---

## Bekannte Probleme & Hinweise

- **Datenbankverbindungen:**  
  Testet die DB-Verbindung über den `/set-database`-Endpoint und stellt sicher, dass alle erforderlichen Felder (User, Passwort, Server, Database) korrekt übergeben werden.

- **Externer SQL-Übersetzungsservice:**  
  Die Übersetzung von JSON zu SQL erfolgt über einen externen Service. Sollte dieser nicht erreichbar sein, liefert der Endpoint einen Fehler zurück.
