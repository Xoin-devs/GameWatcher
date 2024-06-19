const fs = require('fs');

// Read the JSON file
let rawdata = fs.readFileSync('config.prod.json');
let data = JSON.parse(rawdata);

// Iterate over each game
data.games.forEach(game => {
  // Create a new array to hold the updated sources
  let updatedSources = [];

  // Iterate over each source in the game
  game.sources.forEach(source => {
    // Check if the source has a steam property
    if (source.steam) {
      // Duplicate the entire source object for steam_internal and steam_external
      let internalSource = { ...source };
      let externalSource = { ...source };

      // Rename the steam property to steam_internal and steam_external
      internalSource.steam_internal = internalSource.steam;
      externalSource.steam_external = externalSource.steam;

      // Delete the original steam property
      delete internalSource.steam;
      delete externalSource.steam;

      // Add the updated sources to the new array
      updatedSources.push(internalSource);
      updatedSources.push(externalSource);
    } else {
      // If the source doesn't have a steam property, just add it to the new array
      updatedSources.push(source);
    }
  });

  // Replace the game's sources with the updated sources
  game.sources = updatedSources;
});

// Write the updated JSON back to the file
fs.writeFileSync('config.prod.json', JSON.stringify(data, null, 2));