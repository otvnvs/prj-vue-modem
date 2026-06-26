// utils/modem/registry.js

// A clean, shared map that holds active protocol classes
export const globalModemRegistry = new Map();

/**
 * Self-registration helper executed natively by sub-modules during evaluation
 */
export function registerModem(id, protocolClass) {
  if (typeof protocolClass.getMetaInfo !== 'function') {
    console.error(`Rejected registration for "${id}": Missing static getMetaInfo() method.`);
    return;
  }
  globalModemRegistry.set(id.toLowerCase(), protocolClass);
}
