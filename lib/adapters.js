/* eslint no-console: [0, { allow: ["log","warn", "error"] }] */
'use strict'

const Kenx = require('knex')
const _ = require('lodash')

const convert = {
  string: 'string',
  number: 'integer',
  integer: 'integer',
  bigInteger: 'bigInteger',
  array: 'array',
  text: 'text',
  float: 'float',
  decimal: 'decimal',
  boolean: 'boolean',
  date: 'date',
  dateTime: 'dateTime',
  datetime: 'dateTime',
  time: 'time',
  timeStamp: 'timestamp',
  timestamp: 'timestamp',
  binary: 'binary',
  enum: 'enum',
  json: 'json',
  jsonb: 'josnb',
  uuid: 'uuid'
}
const chainable = {
  index: 'index',
  primary: 'primary',
  unique: 'unique',
  references: 'references',
  inTable: 'inTable',
  onDelete: 'onDelete',
  onUpdate: 'onUpdate',
  defaultTo: 'defaultTo',
  unsigned: 'unsigned',
  notNullable: 'notNullable',
  nullable: 'nullable',
  allowNull: 'nullable',
  first: 'first',
  after: 'after',
  comment: 'comment',
  collate: 'collate'
}

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
   * build Knex Table for model
   * @param {Function} table
   * @param {Object} model
   */
  buildKnexTable(table, model){
    const schema = model.schema.schema
    const idAttribute = model.idAttribute

    if (!schema[idAttribute]) {
      table.increments(idAttribute).primary()
    }
    _.each(schema, (value, attribute) => {
      let column
      try {
        column = table[convert[value.type]](attribute)
      }
      catch (e) {
        console.error(e)
      }
      if (column) {
        _.each(value, (v, a) => {
          if (a !== 'type') {
            try {
              column[chainable[a]](v)
            }
            catch (e) {
              console.error(e)
            }
          }
        })
      }
    })
    if (!schema.createdAt) {
      table.timestamp('createdAt')
    }
    if (!schema.updatedAt) {
      table.timestamp('updatedAt')
    }
  },
  /**
   * sync Knex Model
   * @param {Object} connection
   * @param {Object} model
   * @param {Boolean} force
   */
  syncKnexModel (connection, model, force) {
    if (force) {
      connection.schema.dropTableIfExists(model.tableName)
    }
    _.each(model.schema.schema, (columnName) => {
      if (connection.schema.hasColumn(model.tableName, columnName)) {
        this.alterKnexColumn(connection, model, columnName)
      }
      else {
        this.addKnexColumn(connection, model, columnName)
      }
    })
  },
  /**
   * alter Knex Model column
   * @param {Object} connection
   * @param {Object} model
   * @param {String} columnName
   */
  alterKnexColumn (connection, model, columnName) {
    // if (connection.schema.hasColumn(model.tableName, columnName)) {

    // }
  },
  /**
   * add Knex Model column
   * @param {Object} connection
   * @param {Object} model
   * @param {String} columnName
   */
  addKnexColumn (connection, model, columnName) {
    if (!connection.schema.hasColumn(model.tableName, columnName)) {
      connection.schema.table(model.tableName, (table) => {
        const schema = model.schema.schema[columnName]

        let column
        try {
          column = table[convert[schema.type]](columnName)
        }
        catch (e) {
          console.log(e)
        }
        if (column) {
          _.each(schema, (v, a) => {
            if (a !== 'type') {
              try {
                column[chainable[a]](v)
              }
              catch (e) {
                console.error(e)
              }
            }
          })
        }
      })
    }
  },
  /**
   * remove Knex Model column
   * @param {Object} connection
   * @param {Object} model
   * @param {String} columnName
   */
  removeKnexColumn (connection, model, columnName) {
    if (connection.schema.hasColumn(model.tableName, columnName)) {
      connection.schema.table(model.tableName, (table) => {
        table.dropColumn(columnName)
      })
    }
  },

  /**
   * sync Knex Models for connection
   * @param {Object} store JSData store
   * @param {Object} connection
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
        this.buildKnexTable(t, model)
      })
      .catch(err =>{
        console.error(err)
      })
    })
  },

  /**
   * sync Mongo Models for connection
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
    if (store.dialect.match(/^(sqlite|sqlite3|mysql|pg)$/)) {
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
    else if (store.dialect.match(/^(mongo|mongodb)$/)) {
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
