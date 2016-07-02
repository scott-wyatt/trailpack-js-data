/* eslint no-console: ["error", { allow: ["log","warn", "error"] }] */
'use strict'

const Kenx = require('knex')
const _ = require('lodash')

module.exports = {
  loadConnection (config) {
    const connection = {}
    const migration = {}
    if (config.dialect.match(/^(sqlite|mysql|pg)$/)) {

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
      return {
        uri: 'mongodb://localhost:27017'
      }
    }
  },

  mapKnex(table, schema){
    const convert = {
      string: 'string',
      number: 'integer',
      integer: 'integer',
      bigInteger: 'bigInteger',
      text: 'text',
      float: 'float',
      decimal: 'decimal',
      boolean: 'boolean',
      date: 'date',
      dateTime: 'dateTime',
      time: 'time',
      timestamp: 'timestamp',
      binary: 'binary',
      enum: 'enum',
      json: 'json',
      jsonb: 'josnb',
      uuid: 'uuid'
    }
    if (!schema.id) {
      table.increments()
    }
    _.each(schema, (value, attribute) => {
      if (convert[value.type] !== 'undefined') {
        table[convert[value.type]](attribute)
      }
      // else {

      // }
    })

    table.timestamps()
  },

  /**
   * sync Knex Models for connection
   * @param {Object} store JSData store
   * @param {object} connection
   * @param {Boolean} force
   */
  syncKnex (store, connection, force){
    _.each(store.definitions, (model, modelName) => {
      // console.log(model.schema)
      if (force) {
        connection.schema.dropTableIfExists(model.tableName)
      }
      //connection.schema.createTableIfNotExists(model.tableName, (t) => {
      connection.schema.createTableIfNotExists(model.tableName, (t) => {
        this.mapKnex(t, model.schema.schema)
        // t.string('name')
        // t.string('id')
      })
      .catch(err =>{
        console.error(err)
      })
    })
  },

  /**
   * sync Knex Models for connection
   * @param {Object} store JSData store
   * @param {object} connection
   * @param {Boolean} force
   */
  syncMongo (definitions, connection, force){

  },
  /**
   * Load Adapter for Store type
   * @param {Object} store JSData store
   * @param {object} connection
   * returns JSData store with loaded adapter
   */
  loadAdapter (store, connection) {
    if (store.dialect.match(/^(sqlite|mysql|pg)$/)) {
      let DSSqlAdapter
      try {
        DSSqlAdapter = require('js-data-sql')
      }
      catch (e) {
        e.message = 'js-data-sql is not found, run $ npm install js-data-sql --save'
        process.exit(e.code)
      }
      const adapter = new DSSqlAdapter(connection)
      store.registerAdapter('sql', adapter, { default: true })

      //
      store.close = () => {
        connection.destroy()
      }
      store.sync = (force) => {
        this.syncKnex(store, connection, force)
      }
    }
    else if (store.dialect.match(/^(mongodb)$/)) {
      let DSMongoDBAdapter
      try {
        DSMongoDBAdapter = require('js-data-mongodb')
      }
      catch (e) {
        e.message = 'js-data-mongodb is not found, run $ npm install js-data-mongodb --save'
        process.exit(e.code)
      }
      const adapter = new DSMongoDBAdapter(connection)
      store.registerAdapter('mongo', adapter, { default: true })

      store.close = () => {

      }
      store.sync = (force) => {

      }
    }

    return store
  }
}
