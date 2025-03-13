const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const sql = require('mssql'); // Microsoft SQL Server Client
const fs = require('fs');    // Zum Lesen/Schreiben von Dateien
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Konfigurationsordner
const configsFolder = path.join(__dirname, '../JsonKonfigurationen');

// Stelle sicher, dass der Ordner existiert:
if (!fs.existsSync(configsFolder)) {
  fs.mkdirSync(configsFolder, { recursive: true });
}

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
    const query = `
      SELECT DISTINCT fk.TABLE_NAME AS JoinableTable
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
      JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
      JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS fk ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
      WHERE pk.TABLE_NAME = '${baseTable}'
      UNION
      SELECT DISTINCT pk.TABLE_NAME AS JoinableTable
      FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
      JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS pk ON rc.UNIQUE_CONSTRAINT_NAME = pk.CONSTRAINT_NAME
      JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS fk ON rc.CONSTRAINT_NAME = fk.CONSTRAINT_NAME
      WHERE fk.TABLE_NAME = '${baseTable}'
    `;
    const result = await pool.request().query(query);
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
        WHERE tp.name = @tableName OR tr.name = @tableName
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

/****************************************************
 * 9) API-konforme Konfiguration laden
 ****************************************************/
app.get('/api/read-config', (req, res) => {
  const fileName = req.query.fileName;
  if (!fileName) {
    return res.status(400).json({ error: 'Kein Dateiname angegeben.' });
  }
  
  const filePath = path.join(configsFolder, fileName);
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Laden der Datei:', err);
      return res.status(500).json({ error: 'Fehler beim Laden der Konfiguration.' });
    }
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (parseError) {
      console.error('Fehler beim Parsen der JSON-Datei:', parseError);
      res.status(500).json({ error: 'Fehler beim Parsen der Konfiguration.' });
    }
  });
});

/****************************************************
 * 10) API-konforme Konfiguration speichern
 ****************************************************/
app.post('/api/save-json', (req, res) => {
  const configData = req.body;
  let fileName = configData.name || 'unbenannt';
  if (!fileName.endsWith('.json')) {
    fileName += '.json';
  }
  const filePath = path.join(configsFolder, fileName);
  
  fs.writeFile(filePath, JSON.stringify(configData, null, 2), (err) => {
    if (err) {
      console.error('Fehler beim Schreiben der Config-Datei:', err);
      return res.status(500).json({ error: 'Fehler beim Speichern der Datei' });
    }
    res.json({ message: 'Datei erfolgreich gespeichert', fileName });
  });
});


const metaJsonFolder = path.join(__dirname, '../MetaDataJson');

/****************************************************
 * 11) UI‑Meta-Daten speichern (separat, z. B. config-meta.json)
 ****************************************************/
app.post('/api/save-meta', (req, res) => {
  const metaData = req.body;
  
  // wenn vorhanden, dann die DB-Konfiguration in der Meta-Datei speichern
  if (currentDbConfig) {
    metaData.dbConfig = currentDbConfig;
  }
  
  let fileName = metaData.configName || 'default-config';
  // Verwende das Schema: <configName>-meta.json
  if (!fileName.endsWith('-meta.json')) {
    fileName += '-meta.json';
  }
  const filePath = path.join(metaJsonFolder, fileName);
  
  fs.writeFile(filePath, JSON.stringify(metaData, null, 2), (err) => {
    if (err) {
      console.error('Fehler beim Schreiben der Meta-Datei:', err);
      return res.status(500).json({ error: 'Fehler beim Speichern der Meta-Datei' });
    }
    res.json({ message: 'Meta-Datei erfolgreich gespeichert', fileName });
  });
});


/****************************************************
 * 12) UI‑Meta-Daten laden (z. B. config-meta.json)
 ****************************************************/
app.get('/api/read-meta', (req, res) => {
  const fileName = req.query.fileName;
  if (!fileName) {
    return res.status(400).json({ error: 'Kein Dateiname angegeben.' });
  }
  // Meta-Dateinamen erzeugen, z. B. "myConfig-meta.json"
  const baseName = fileName.replace('.json', '');
  const metaFileName = `${baseName}-meta.json`;
  const filePath = path.join(metaJsonFolder, metaFileName);
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Laden der Meta-Datei:', err);
      return res.status(500).json({ error: 'Fehler beim Laden der Meta-Datei' });
    }
    try {
      const jsonData = JSON.parse(data);
      // Falls in den Meta-Daten eine DB-Konfiguration vorhanden ist, setze currentDbConfig
      if (jsonData.dbConfig) {
        currentDbConfig = jsonData.dbConfig;
        console.log('DB-Konfiguration aus Meta-Datei wiederhergestellt.');
      }
      res.json(jsonData);
    } catch (parseError) {
      console.error('Fehler beim Parsen der Meta-Datei:', parseError);
      res.status(500).json({ error: 'Fehler beim Parsen der Meta-Datei' });
    }
  });
});


/****************************************************
 * 13) Konfiguration löschen
 ****************************************************/
app.delete('/api/delete-config', (req, res) => {
  const fileName = req.query.fileName;
  if (!fileName) {
    return res.status(400).send('Dateiname nicht gefunden');
  }
  
  const filePath = path.join(configsFolder, fileName);
  // die Endung ".json" entfernen und hänge "-meta.json" an, um den korrekten Meta-Dateinamen zu erhalten
  const baseName = fileName.replace('.json', '');
  const metaFileName = `${baseName}-meta.json`;
  const filePathMeta = path.join(metaJsonFolder, metaFileName);

  // Zuerst die Konfigurationsdatei löschen
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Fehler beim Löschen der Konfigurationsdatei "${fileName}":`, err);
      return res.status(500).send('Fehler beim Löschen der Konfigurationsdatei');
    }
    // Anschließend die zugehörige Meta-Datei löschen
    fs.unlink(filePathMeta, (errMeta) => {
      // Falls die Meta-Datei nicht existiert (ENOENT), ignorieren wir den Fehler
      if (errMeta && errMeta.code !== 'ENOENT') {
        console.error(`Fehler beim Löschen der Meta-Datei für "${fileName}":`, errMeta);
        return res.status(500).send('Fehler beim Löschen der Meta-Datei');
      }
      console.log(`Datei "${fileName}" und zugehörige Meta-Datei erfolgreich gelöscht.`);
      res.status(200).send(`Datei "${fileName}" und zugehörige Meta-Datei erfolgreich gelöscht.`);
    });
  });
});


/****************************************************
 * 14) Beispiel: Eine Zeile aus einer Tabelle abrufen
 ****************************************************/
app.get('/get-sample-row', async (req, res) => {
  if (!currentDbConfig) {
    return res.status(400).json({ error: 'No database configuration set' });
  }
  
  const table = req.query.table;
  if (!table) {
    return res.status(400).json({ error: 'Table parameter is required' });
  }

  try {
    const pool = await sql.connect(currentDbConfig);
    // TOP 1 verwenden, um eine einzelne Zeile abzurufen.
    const query = `SELECT TOP 1 * FROM [${table}]`;
    const result = await pool.request().query(query);
    
    const sampleRow = (result.recordset && result.recordset.length > 0) 
                        ? result.recordset[0] 
                        : {};
    res.json(sampleRow);
  } catch (error) {
    console.error("Error fetching sample row:", error);
    res.status(500).json({ error: 'Failed to fetch sample row' });
  } finally {
    sql.close();
  }
});

/****************************************************
 * 15) Beispiel: Eine Zeile aus einem dynamisch erstellten Join abrufen
 ****************************************************/
app.get('/get-sample-join', async (req, res) => {
  if (!currentDbConfig) {
    return res.status(400).json({ error: 'No database configuration set' });
  }
  
  const joinQuery = req.query.joinQuery;
  if (!joinQuery) {
    return res.status(400).json({ error: 'joinQuery parameter is required' });
  }
  
  const sampleQuery = `SELECT TOP 1 * FROM (${joinQuery}) AS SampleTable`;
  
  try {
    const pool = await sql.connect(currentDbConfig);
    const result = await pool.request().query(sampleQuery);
    const sampleRow = (result.recordset && result.recordset.length > 0) ? result.recordset[0] : {};
    res.json(sampleRow);
  } catch (error) {
    console.error("Error fetching sample join row:", error);
    res.status(500).json({ error: 'Failed to fetch sample join row' });
  } finally {
    sql.close();
  }
});


/****************************************************
 * 16) Operator-Tabelle abrufen
 ****************************************************/
app.get('/get-operators', async (req, res) => {
  if (!currentDbConfig) {
    return res.status(400).json({ error: 'No database configuration set' });
  }
  try {
    const pool = await sql.connect(currentDbConfig);
    const result = await pool.request().query('SELECT sid, aName FROM Operator');
    res.json({ operators: result.recordset });
  } catch (error) {
    console.error("Error fetching operators:", error);
    res.status(500).json({ error: 'Failed to fetch operators.' });
  } finally {
    sql.close();
  }
});


const dbConnectionsFile = path.join(__dirname, 'dbConnections.json');

/****************************************************
 * 17) Speichert eine neue DB-Verbindung dauerhaft
 ****************************************************/
app.post('/api/save-database-connection', (req, res) => {
  const newConnection = req.body;
  
  // Lies vorhandene Verbindungen ein
  fs.readFile(dbConnectionsFile, 'utf8', (err, data) => {
    let connections = [];
    if (!err) {
      try {
        connections = JSON.parse(data);
      } catch (parseError) {
        console.error('Fehler beim Parsen der DB-Verbindungen:', parseError);
      }
    }
    // Neue Verbindung anhängen
    connections.push(newConnection);
    fs.writeFile(dbConnectionsFile, JSON.stringify(connections, null, 2), (errWrite) => {
      if (errWrite) {
        console.error('Fehler beim Speichern der DB-Verbindung:', errWrite);
        return res.status(500).json({ error: 'Fehler beim Speichern der DB-Verbindung' });
      }
      res.json({ message: 'DB-Verbindung erfolgreich gespeichert' });
    });
  });
});

/****************************************************
 * 18) Ruft alle gespeicherten DB-Verbindungen ab
 ****************************************************/
app.get('/api/get-database-connections', (req, res) => {
  fs.readFile(dbConnectionsFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Lesen der DB-Verbindungen:', err);
      return res.status(500).json({ error: 'Fehler beim Lesen der DB-Verbindungen' });
    }
    try {
      const connections = JSON.parse(data);
      res.json({ connections });
    } catch (parseError) {
      console.error('Fehler beim Parsen der DB-Verbindungen:', parseError);
      res.status(500).json({ error: 'Fehler beim Parsen der DB-Verbindungen' });
    }
  });
});


/****************************************************
 * 18) Löscht eine gespeicherte DB-Verbindung anhand des Namens
 ****************************************************/
app.delete('/api/delete-database-connection', (req, res) => {
  const connectionName = req.query.name;
  if (!connectionName) {
    return res.status(400).json({ error: 'Kein Verbindungsname angegeben.' });
  }
  
  // Lies vorhandene Verbindungen
  fs.readFile(dbConnectionsFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Fehler beim Lesen der DB-Verbindungen:', err);
      return res.status(500).json({ error: 'Fehler beim Lesen der DB-Verbindungen.' });
    }
    
    let connections = [];
    try {
      connections = JSON.parse(data);
    } catch (parseError) {
      console.error('Fehler beim Parsen der DB-Verbindungen:', parseError);
      return res.status(500).json({ error: 'Fehler beim Parsen der DB-Verbindungen.' });
    }
    
    // Verbindung filtern, die gelöscht werden soll
    const updatedConnections = connections.filter(conn => conn.name !== connectionName);
    
    // aktualisierte Liste speichern
    fs.writeFile(dbConnectionsFile, JSON.stringify(updatedConnections, null, 2), (errWrite) => {
      if (errWrite) {
        console.error('Fehler beim Schreiben der DB-Verbindungen:', errWrite);
        return res.status(500).json({ error: 'Fehler beim Speichern der DB-Verbindungen.' });
      }
      res.json({ message: `DB-Verbindung "${connectionName}" erfolgreich gelöscht.` });
    });
  });
});


/****************************************************
 * 19) Datentyp von einer Spalte herausfinden
 ****************************************************/
app.get('/api/get-column-type', async (req, res) => {
  if (!currentDbConfig) {
    return res.status(400).json({ error: 'No database configuration set' });
  }

  // Parameter auslesen (Schema optional, Standard: dbo)
  const { schema, table, column } = req.query;
  if (!table || !column) {
    return res.status(400).json({ error: 'Missing table or column parameter' });
  }
  const effectiveSchema = schema || 'dbo';

  try {
    const pool = await sql.connect(currentDbConfig);
    const query = `
      SELECT DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @schema
        AND TABLE_NAME = @table
        AND COLUMN_NAME = @column
    `;
    const result = await pool.request()
      .input('schema', sql.VarChar, effectiveSchema)
      .input('table', sql.VarChar, table)
      .input('column', sql.VarChar, column)
      .query(query);

    if (result.recordset && result.recordset.length > 0) {
      return res.json({ dataType: result.recordset[0].DATA_TYPE });
    } else {
      return res.status(404).json({ error: `Spalte '${column}' in Tabelle '${effectiveSchema}.${table}' nicht gefunden.` });
    }
  } catch (error) {
    console.error('Error fetching column type:', error);
    return res.status(500).json({ error: 'Fehler beim Abrufen des Datentyps' });
  } finally {
    sql.close();
  }
});



/****************************************************
 * Server starten
 ****************************************************/
app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
