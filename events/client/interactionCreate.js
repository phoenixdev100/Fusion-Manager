import { handleInteraction } from '../../handlers/interactionHandler.js';

export default {
  once: false,
  async execute(client, interaction) {
    await handleInteraction(client, interaction);
  }
};
