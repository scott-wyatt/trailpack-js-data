/* eslint no-console: [0, { allow: ["log","warn", "error"] }] */
'use strict'

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
  time: 'time',
  timeStamp: 'timestamp',
  timestamp: 'timestamp',
  binary: 'binary',
  enum: 'enum',
  enu: 'enu',
  json: 'json',
  jsonb: 'josnb',
  uuid: 'uuid',

  // waterline shim
  model: 'string',
  collection: 'array',
  datetime: 'dateTime',
  objectid: 'uuid',
  mediumtext: 'text',
  longtext: 'text',
  alphanumeric: 'string',
  alphanumericdashed: 'string',
  email: 'string'
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
  collate: 'collate',

  // waterline shim
  required: 'notNullable',
  primaryKey: 'primary'

}
module.exports = {
  /**
   * build Knex Table for model
   * @param {Function} table
   * @param {Object} model
   */
  buildTable(table, model){
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
        console.error(e,value.type,attribute)
      }
      if (column) {
        _.each(value, (v, a) => {
          if (a !== 'type') {
            try {
              column[chainable[a]](v)
            }
            catch (e) {
              console.error(e,a,v)
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
   * build Knex Table for model
   * @param {Function} table
   * @param {Object} model
   */
  buildJoinTable(targetModel, joinModel){

  },
  /**
   * sync Knex Model
   * @param {Object} connection
   * @param {Object} model
   * @param {Boolean} force
   */
  syncModel (connection, model, force) {
    if (force) {
      connection.schema.dropTableIfExists(model.tableName)
    }
    _.each(model.schema.schema, (columnName) => {
      if (connection.schema.hasColumn(model.tableName, columnName)) {
        this.alterColumn(connection, model, columnName)
      }
      else {
        this.addColumn(connection, model, columnName)
      }
    })
  },
  /**
   * alter Knex Model column
   * @param {Object} connection
   * @param {Object} model
   * @param {String} columnName
   */
  alterColumn (connection, model, columnName) {
    if (connection.schema.hasColumn(model.tableName, columnName)) {
      connection.schema.table(model.tableName, (table) => {
        table.dropColumn(columnName)

        const schema = model.schema.schema[columnName]

        let column
        try {
          column = table[convert[schema.type]](columnName)
        }
        catch (e) {
          console.log(e,schema.type,columnName)
        }
        if (column) {
          _.each(schema, (v, a) => {
            if (a !== 'type') {
              try {
                column[chainable[a]](v)
              }
              catch (e) {
                console.error(e,a,v)
              }
            }
          })
        }
      })
    }
  },
  /**
   * add Knex Model column
   * @param {Object} connection
   * @param {Object} model
   * @param {String} columnName
   */
  addColumn (connection, model, columnName) {
    if (!connection.schema.hasColumn(model.tableName, columnName)) {
      connection.schema.table(model.tableName, (table) => {
        const schema = model.schema.schema[columnName]

        let column
        try {
          column = table[convert[schema.type]](columnName)
        }
        catch (e) {
          console.log(e,columnName)
        }
        if (column) {
          _.each(schema, (v, a) => {
            if (a !== 'type') {
              try {
                column[chainable[a]](v)
              }
              catch (e) {
                console.error(e,a,v)
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
  removeColumn (connection, model, columnName) {
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
   * @return {Promise}
   */
  sync (store, connection, force){
    Promise.all(
      _.map(store.definitions, (model, modelName) => {
        // console.log(model.schema)
        if (force) {
          connection.schema.dropTableIfExists(model.tableName)
        }
        //connection.schema.createTableIfNotExists(model.tableName, (t) => {
        return connection.schema.createTableIfNotExists(model.tableName, (t) => {
          this.buildTable(t, model)
        })
      })
    )
  }
}
