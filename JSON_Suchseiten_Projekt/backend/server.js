const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const sql = require('mssql'); // Microsoft SQL Server Client
const saveJSONRoute = require("./saveJsonRoute");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use(saveJSONRoute);

// Variable to store the current database configuration
let currentDbConfig = null;

// Route to update the database configuration
app.post('/set-database', async (req, res) => {
    const { user, password, server, database, port, options } = req.body;
    if (!user || !password || !server || !database) {
        return res.status(400).json({ error: 'Missing database configuration fields' });
    }
    
    // Save the selected database configuration
    currentDbConfig = { user, password, server, database, port: port || 1433, options };

    // Test the database connection
    try {
        await sql.connect(currentDbConfig);
        sql.close();
        res.json({ message: 'Database configuration updated and connection successful' });
    } catch (error) {
        console.error("Database connection error:", error);
        res.status(500).json({ error: 'Failed to connect to the database. Please check your configuration.' });
    }
});

// Route to fetch tables from the current database
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
        sql.close();
    } catch (error) {
        console.error("Error fetching tables:", error);
        res.status(500).json({ error: 'Failed to fetch tables.' });
    }
});

// Example route to execute a SQL query with dynamic configuration
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
    }
});

// Example route for JSON-to-SQL conversion (this is separate from the SQL connection logic)
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});



// Route to fetch columns for a specific table
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

  