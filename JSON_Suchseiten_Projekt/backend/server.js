/****************************************************
 * server.js (oder index.js) – final korrigierte Version
 ****************************************************/

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const sql = require('mssql'); // Microsoft SQL Server Client
const fs = require('fs');    // <--- Wichtig zum Lesen des Ordners
const path = require('path'); 
const saveJSONRoute = require("./saveJsonRoute");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Binde deine Route zum Speichern von JSON ein (falls vorhanden)
app.use(saveJSONRoute);

/** 
 * Variable, um die aktuelle DB-Konfiguration zu speichern, 
 * sobald /set-database aufgerufen wird
 */
let currentDbConfig = null;

/****************************************************
 * 1) DB-Konfiguration setzen und Verbindung testen
 ****************************************************/
app.post('/set-database', async (req, res) => {
    const { user, password, server, database, port, options } = req.body;
    if (!user || !password || !server || !database) {
        return res.status(400).json({ error: 'Missing database configuration fields' });
    }
    
    // DB-Config in Memory speichern
    currentDbConfig = { 
      user, 
      password, 
      server, 
      database, 
      port: port || 1433, 
      options 
    };

    // Testverbindung
    try {
        await sql.connect(currentDbConfig);
        sql.close();
        res.json({ message: 'Database configuration updated and connection successful' });
    } catch (error) {
        console.error("Database connection error:", error);
        res.status(500).json({ error: 'Failed to connect to the database. Please check your configuration.' });
    }
});

/****************************************************
 * 2) Tabellen aus aktueller DB holen
 ****************************************************/
app.get('/get-tables', async (req, res) => {
    if (!currentDbConfig) {
        return res.status(400).json({ error: 'No database configuration set' });
    }
    try {
        const pool = await sql.connect(currentDbConfig);
        const result = await pool.request().query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
        );
        res.json({ tables: result.recordset.map(row => row.TABLE_NAME) });
    } catch (error) {
        console.error("Error fetching tables:", error);
        res.status(500).json({ error: 'Failed to fetch tables.' });
    } finally {
        sql.close();
    }
});

/****************************************************
 * 3) SQL-Abfrage mit dynamischer Config ausführen
 ****************************************************/
app.post('/execute-sql', async (req, res) => {
    if (!currentDbConfig) {
        return res.status(400).json({ error: 'No database configuration set' });
    }
    const { sqlQuery } = req.body;
    try {
        const pool = await sql.connect(currentDbConfig);
        const result = await pool.request().query(sqlQuery);
        res.json({ result: result.recordset });
    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: 'Error executing SQL query.' });
    } finally {
        sql.close();
    }
});

/****************************************************
 * 4) JSON -> SQL (via externem Service)
 ****************************************************/
app.post('/convert-json-to-sql', async (req, res) => {
    let { jsonString } = req.body;

    if (typeof jsonString !== 'string') {
        try {
            jsonString = JSON.stringify(jsonString);
        } catch (error) {
            console.error("Invalid JSON format:", error);
            return res.status(400).json({ error: 'Invalid JSON format. Please check the input.' });
        }
    }

    try {
        const response = await axios.post(
            'https://servicefabby.fab4minds.com/ACM/api/search/getsqlstatementforjsonobject',
            JSON.parse(jsonString)
        );
        res.json({ sqlStatement: response.data });
    } catch (error) {
        console.error("API request error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error retrieving SQL statement.' });
    }
});

/****************************************************
 * 5) Spalten einer Tabelle erfragen
 ****************************************************/
app.get('/get-columns', async (req, res) => {
    if (!currentDbConfig) {
        return res.status(400).json({ error: 'No database configuration set' });
    }
    const { table } = req.query;
    if (!table) {
        return res.status(400).json({ error: 'Table name is required' });
    }
    try {
        const pool = await sql.connect(currentDbConfig);
        const result = await pool.request().query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '${table}'
        `);
        res.json({ columns: result.recordset.map(row => row.COLUMN_NAME) });
    } catch (error) {
        console.error("Error fetching columns:", error);
        res.status(500).json({ error: 'Failed to fetch columns.' });
    } finally {
        sql.close();
    }
});

/****************************************************
 * 6) Joinable Tables anhand Referenzschlüssel
 ****************************************************/
app.get('/get-joinable-tables', async (req, res) => {
    const { baseTable } = req.query;
    if (!baseTable || !currentDbConfig) {
        return res.status(400).json({ error: 'Base table or database configuration missing' });
    }
    try {
        const pool = await sql.connect(currentDbConfig);
        const result = await pool.request().query(`
            SELECT DISTINCT fk.TABLE_NAME AS JoinableTable
            FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
            JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
            JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS fk ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
            WHERE pk.TABLE_NAME = '${baseTable}'
        `);
        res.json({ joinableTables: result.recordset.map(row => row.JoinableTable) });
    } catch (error) {
        console.error("Error fetching joinable tables:", error);
        res.status(500).json({ error: 'Failed to fetch joinable tables.' });
    } finally {
        sql.close();
    }
});

/****************************************************
 * 7) Fremdschlüssel erfragen
 ****************************************************/
app.get('/get-foreign-keys', async (req, res) => {
  if (!currentDbConfig) {
    return res.status(400).send({ error: 'No database configuration set' });
  }
  const tableName = req.query.table;
  if (!tableName) {
    return res.status(400).send({ error: 'Table name is required' });
  }
  try {
    const pool = await sql.connect(currentDbConfig);
    const result = await pool.request()
      .input('tableName', sql.VarChar, tableName)
      .query(`
        SELECT 
            fk.name AS foreign_key_name,
            tp.name AS parent_table,
            cp.name AS parent_column,
            tr.name AS referenced_table,
            cr.name AS referenced_column
        FROM sys.foreign_keys AS fk
        INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
        INNER JOIN sys.tables AS tp ON fkc.parent_object_id = tp.object_id
        INNER JOIN sys.columns AS cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
        INNER JOIN sys.tables AS tr ON fkc.referenced_object_id = tr.object_id
        INNER JOIN sys.columns AS cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
        WHERE tp.name = @tableName
      `);
    res.send({ foreignKeys: result.recordset });
  } catch (error) {
    console.error('Error fetching foreign keys:', error);
    res.status(500).send({ error: 'Error fetching foreign keys' });
  } finally {
    sql.close();
  }
});

/****************************************************
 * 8) JSON-Dateien im angegebenen Ordner auslesen
 ****************************************************/
// Pfad zum Ordner mit JSON-Dateien (Windows-Pfad mit doppelten Backslashes)
const configsFolder = "C:\\Users\\Johannes\\Documents\\Schule\\5.Klasse\\Diplomarbeit\\JSON_Suchseiten_Github\\JSON_Suchseiten_Projekt\\JsonKonfigurationen";

app.get('/api/config-files', (req, res) => {
  fs.readdir(configsFolder, (err, files) => {
    if (err) {
      console.error('Fehler beim Lesen des Ordners:', err);
      return res.status(500).json({ error: 'Fehler beim Lesen des Ordners' });
    }
    // Optional: nur .json-Dateien auflisten
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    res.json(jsonFiles);
  });
});


// Beispiel in server.js:
app.get('/api/read-config', (req, res) => {
    const fileName = req.query.fileName;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }
  
    const filePath = path.join(configsFolder, fileName);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Fehler beim Lesen der Datei:', err);
        return res.status(500).json({ error: 'Fehler beim Lesen der Datei' });
      }
      // Parsen und zurückgeben
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (parseErr) {
        console.error('Fehler beim Parsen:', parseErr);
        res.status(500).json({ error: 'Fehler beim Parsen der JSON-Datei' });
      }
    });
  });

  
app.post('/api/save-config', (req, res) => {
    // Du bekommst das JSON-Objekt in req.body
    const configData = req.body;
    const fileName = configData.name || 'unbenannt.json'; 
    // oder evtl. Parameter in req.query
  
    const filePath = path.join(configsFolder, fileName);
  
    fs.writeFile(filePath, JSON.stringify(configData, null, 2), (err) => {
      if (err) {
        console.error('Fehler beim Schreiben:', err);
        return res.status(500).json({ error: 'Fehler beim Speichern der Datei' });
      }
      res.json({ message: 'Datei erfolgreich gespeichert', fileName });
    });
  });

  app.delete('/api/delete-config', (req, res) => {
    const fileName = req.query.fileName;
    if (!fileName) {
      return res.status(400).send('Dateiname nicht gefunden');
    }
  
    const filePath = path.join(configsFolder, fileName);
  
    // In app.delete('/api/delete-config', ...)
fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Fehler beim Löschen der Datei "${fileName}":`, err);
      return res.status(500).send('Fehler beim Löschen der Datei');
    }
    console.log(`Datei "${fileName}" erfolgreich gelöscht.`);
  
    // Sende eine JSON-Antwort statt eines reinen Strings:
    res.status(200).json({ message: `Datei "${fileName}" erfolgreich gelöscht.` });
  });
  
  });
  
  

/****************************************************
 * Server starten
 ****************************************************/
app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
