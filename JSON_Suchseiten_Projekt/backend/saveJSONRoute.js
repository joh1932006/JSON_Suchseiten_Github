const fs = require("fs");
const path = require("path");
const express = require("express");
const router = express.Router();


const folderPath = "C:\\Users\\Johannes\\Documents\\Schule\\5.Klasse\\Diplomarbeit\\JSON_Suchseiten_Github\\JSON_Suchseiten_Projekt\\JsonKonfigurationen";

// Route: JSON speichern
router.post("/save-json", (req, res) => {
  try {
    const jsonData = req.body; 

    // schutz vor fehlerhaften Eingaben (nur JSON-Daten)
    if (!jsonData || typeof jsonData !== "object") {
      return res.status(400).json({ message: "Ungültige JSON-Daten." });
    }


    const fileName = jsonData.name ? `${jsonData.name}.json` : "config.json";


    const filePath = path.join(folderPath, fileName);


    fs.writeFile(filePath, JSON.stringify(jsonData, null, 4), "utf-8", (err) => {
      if (err) {
        console.error("Fehler beim Speichern der Datei:", err);

        return res.status(500).json({ message: "Fehler beim Speichern der Datei." });
      }

      console.log(`JSON-Datei erfolgreich gespeichert: ${filePath}`);
      res.status(200).json({ message: "JSON erfolgreich gespeichert.", filePath });
    });
  } catch (error) {

    console.error("Ein unerwarteter Fehler ist aufgetreten:", error);
    res.status(500).json({ message: "Ein unerwarteter Fehler ist aufgetreten." });

  }
});

module.exports = router;
