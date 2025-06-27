# Fusion-Manager

A comprehensive Discord bot for managing bug reports, suggestions, staff applications, trades, and moderation tasks.

## Features

- Bug reporting system with status tracking
- Suggestion system with voting and moderation
- Staff application management
- Trade system for in-game or server trades
- Moderation tools (ban, kick, timeout, purge)
- User profiles with activity statistics
- Media account tracking and monitoring
- Sniper system for monitoring specific keywords
- Staff report system

## Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Configure your `config/config.json` file with your Discord token and role IDs
4. Start the bot with `node index.js`

## Commands

### Bug Management
- `/bug-system` - Set up a bug reporting channel
- `/bug-accept <msg_id>` - Accept a bug report
- `/bug-decline <msg_id> <reason>` - Decline a bug report with a reason
- `/bug-list <type>` - List all bugs with a specific status (open/accepted/declined)

### Suggestion Management
- `/suggestion-system` - Set up a suggestion channel
- `/suggestion-accept <msg_id>` - Accept a suggestion
- `/suggestion-decline <msg_id> <reason>` - Decline a suggestion with a reason
- `/suggestion-list <type>` - List all suggestions with a specific status

### Staff Applications
- `/staff-application` - Set up staff application system
- `/staff-application add-user <user>` - Add a user to the staff application whitelist
- `/staff-application remove-user <user>` - Remove a user from the staff application whitelist
- `/staff-application close <reason>` - Close the staff application system

### Trade System
- `/trade-system` - Set up the trade channel
- `/trade-list` - List all active trades

### Moderation
- `/ban <user> [reason]` - Ban a user from the server
- `/kick <user> [reason]` - Kick a user from the server
- `/timeout <user> <duration> [reason]` - Timeout a user for a specified duration
- `/purge <amount>` - Delete multiple messages at once
- `/sniper-add <keyword>` - Add a keyword to monitor in media posts
- `/ssreport <user> <reason>` - Report a user for suspicious activity

### Utility
- `/profile [user]` - View bug reporting and suggestion statistics for a user
- `/syncmedia` - List YouTube and TikTok accounts of users with the media role & check for a specific keyword in title.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

Created & maintained by [Deepak](https://github.com/phoenixdev100)