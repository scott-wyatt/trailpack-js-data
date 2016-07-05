/* eslint no-console: [0, { allow: ["log","warn", "error"] }] */
'use strict'

const Kenx = require('knex')
// const _ = require('lodash')
const migrate = require('./migrate')

module.exports = {
  loadConnection (config) {
    const connection = {}
    const migration = {}
    if (config.dialect.match(/^(sqlite|sqlite3|mysql|pg)$/)) {

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

      return new Kenx({
        client: config.dialect, // "mysql" or "pg" or "sqlite3"
        connection: connection,
        migration: migration
      })
    }
    else if (config.dialect.match(/^(mongo|mongodb)$/)) {
      const connection = {}

      if (config.host) {
        connection.host = config.host
      }
      if (config.port) {
        connection.port = ':' + config.port
      }
      if (config.username) {
        connection.user = config.username
      }
      if (config.password) {
        connection.password = ':' + config.password + '@'
      }
      if (config.database) {
        connection.database = '/' + config.database
      }
      if (config.storage) {
        connection.filename = config.storage
      }

      return {
        uri: 'mongodb://' + connection.username + connection.password + connection.host + connection.port + connection.database
      }
    }
  },

  /**
   * Load Adapter for Store type
   * @param {Object} store JSData store
   * @param {object} connection
   * returns JSData store with loaded adapter
   */
  loadAdapter (store, connection) {
    if (store.dialect.match(/^(sqlite|sqlite3|mysql|pg)$/)) {
      let DSSqlAdapter
      try {
        DSSqlAdapter = require('js-data-sql')
      }
      catch (e) {
        e.message = 'js-data-sql is not found, run $ npm install js-data-sql --save'
        console.error(e)
        process.exit(e.code)
      }
      const adapter = new DSSqlAdapter(connection)
      store.registerAdapter('sql', adapter, { default: true })

      //
      store.close = () => {
        connection.destroy()
      }
      store.sync = (force) => {
        migrate.Knex.sync(store, connection, force)
      }
    }
    else if (store.dialect.match(/^(mongo|mongodb)$/)) {
      let DSMongoDBAdapter
      try {
        DSMongoDBAdapter = require('js-data-mongodb')
      }
      catch (e) {
        e.message = 'js-data-mongodb is not found, run $ npm install js-data-mongodb --save'
        console.error(e)
        process.exit(e.code)
      }
      const adapter = new DSMongoDBAdapter(connection)
      store.registerAdapter('mongo', adapter, { default: true })

      store.close = () => {

      }
      store.sync = (force) => {
        migrate.Mongo.sync(store, connection, force)
      }
    }

    return store
  }
}
