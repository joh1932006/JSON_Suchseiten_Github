const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

// SQL Server Konfiguration
const dbConfig = {
    user: 'f4mbsappl',
    password: 'bTemrHU6Tn3pnkPRBuKc',
    server: '192.168.44.20',
    database: 'F4MBS',
    port: 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/convert-json-to-sql', async (req, res) => {
    let { jsonString } = req.body;
    
    // Falls jsonString ein Objekt ist, wird es in einen String umgewandelt
    if (typeof jsonString !== 'string') {
        try {
            jsonString = JSON.stringify(jsonString);
        } catch (error) {
            console.error("Ungültiges JSON-Format:", error);
            return res.status(400).json({ error: 'Ungültiges JSON-Format. Bitte überprüfen Sie den eingegebenen Text.' });
        }
    }

    try {
        // Sende den JSON-Inhalt direkt an die API, ohne ihn in ein weiteres Objekt zu packen
        const response = await axios.post(
            'https://servicefabby.fab4minds.com/ACM/api/search/getsqlstatementforjsonobject',
            JSON.parse(jsonString) // JSON-String parsen, damit axios ihn als Objekt sendet
        );

        res.json({ sqlStatement: response.data });
    } catch (error) {
        console.error("Fehler bei der API-Anfrage:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Fehler beim Abrufen des SQL-Statements.' });
    }
});


app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
