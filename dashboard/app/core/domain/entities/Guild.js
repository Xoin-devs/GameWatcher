/**
 * Represents a Discord Guild (server) entity in the domain
 */
class Guild {
    constructor(id, name, icon, permissions, webhookUrl = null, channelId = null) {
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.permissions = permissions;
        this.webhookUrl = webhookUrl;
        this.channelId = channelId;
    }

    hasAdminPermission() {
        // Check for ADMINISTRATOR permission (0x8)
        return (this.permissions & 0x8) === 0x8;
    }

    getIconUrl() {
        if (!this.icon) return null;
        return `https://cdn.discordapp.com/icons/${this.id}/${this.icon}.png`;
    }
}

module.exports = Guild;