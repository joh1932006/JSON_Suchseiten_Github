const express = require('express');
const axios = require('axios'); // Für den HTTP-Request zur API
const sql = require('mssql');
const cors = require('cors'); // CORS aktivieren für Angular-Anfragen
const app = express();
const port = 3000;

// CORS aktivieren
app.use(cors());

// SQL Server Konfiguration
const dbConfig = {
    user: 'f4mbsappl',
    password: 'bTemrHU6Tn3pnkPRBuKc', // Passwort
    server: '192.168.44.20',          // Server-IP
    database: 'F4MBS',                // Name der Datenbank
    port: 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true, // Für lokale Entwicklung aktivieren
    },
};

// Test-Endpoint, um die Verbindung zum SQL Server zu prüfen
app.get('/api/test-connection', async (req, res) => {
    try {
        // Verbindung herstellen
        let pool = await sql.connect(dbConfig);

        // Einfache Testabfrage
        let result = await pool.request().query('SELECT 1 AS test');

        // Erfolgsnachricht zurücksenden
        res.json({ message: 'Verbindung erfolgreich', result: result.recordset });
    } catch (err) {
        console.error('Verbindungsfehler:', err);
        res.status(500).json({ message: 'Verbindung fehlgeschlagen', error: err.message });
    }
});

// Haupt-Endpoint zum Abrufen und Ausführen des SQL-Statements
app.get('/api/daten', async (req, res) => {
    try {
        // JSON-Objekt, das an die API gesendet wird
        const jsonString = {
            "jsonString": "{ \"name\": \"Kontrakte\", \"itemsPerPage\": 30, \"tableWidth\": null, \"preventSearchWithoutRestriction\": false, \"showInStartMenu\": false, \"selectSingleEntity\": true, \"searchOnType\": true, \"hideHeadersOnNoRestriction\": false, \"automaticRun\": true, \"implementationId\": 1, \"querySid\": null, \"filterXDSid\": 3, \"filterXDJoinGroupId\": null, \"filterChooseRoleSid\": null, \"filterRoleSid\": null, \"filterAdditionalColumnIds\": null, \"defaultValuesInterfaceSid\": 5083, \"roleSid\": null, \"interfaceSid\": null, \"table\": \"F4MBS.dbo.CoPos cp\", \"whereClause\": \"cp.FK_RecordState_SID IN (0,10)\" }"
        };

        // JSON-Request an die externe API senden
        const apiResponse = await axios.post(
            'https://servicefabby.fab4minds.com/ACM/api/search/getsqlstatementforjsonobject',
            jsonString,
            { headers: { 'Content-Type': 'application/json' } }
        );

        // SQL-Statement aus der API-Antwort
        const sqlStatement = apiResponse.data;

        // Verbindung zum SQL Server herstellen und SQL-Statement ausführen
        let pool = await sql.connect(dbConfig);
        let result = await pool.request().query(sqlStatement);

        // Ergebnisse an den Client senden
        res.json(result.recordset);
    } catch (err) {
        console.error('Fehler:', err);
        res.status(500).send('Fehler beim Abrufen der Daten');
    }
});

// Server starten
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
