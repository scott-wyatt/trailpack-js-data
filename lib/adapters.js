'use strict'

module.exports = {
  /**
   * Load Adapter for Store type
   * @param {Object} store JSData store
   * @param {object} config instance of app.config.stores
   * returns JSData store with loaded adapter
   */
  loadAdapter (store, config) {
    const connection = {}
    const migration = {}
    if (config.dialect.match(/^(sqlite|mysql|pg)$/)) {
      let DSSqlAdapter
      try {
        DSSqlAdapter = require('js-data-sql')
      }
      catch (e) {
        e.message = 'js-data-sql is not found, run $ npm install js-data-sql --save'
        process.exit(e.code)
      }
      // connection
      if (config.host) {
        connection.host = config.host
      }
      if (config.port) {
        connection.port = config.port
      }
      if (config.username) {
        connection.user = config.username
      }
      if (config.password) {
        connection.password = config.password
      }
      if (config.database) {
        connection.database = config.database
      }
      if (config.storage) {
        connection.filename = config.storage
      }

      // migration
      // if (config.migrate) {
      //   migration.table = config.migrate
      // }
      const adapter = new DSSqlAdapter({
        client: config.dialect, // "mysql" or "pg" or "sqlite3"
        connection: connection,
        migration: migration
      })
      store.registerAdapter('sql', adapter, { default: true })
    }

    return store
  }
}
