module.exports = async function (interaction) {
    const selectedGame = interaction.values[0];
    interaction.reply(`Selected game: ${selectedGame}`);
};