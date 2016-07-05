/* eslint no-console: [0, { allow: ["log","warn", "error"] }] */
'use strict'

const _ = require('lodash')

const checkSourceTable = (source, tableName, viaName) => {
  let check = false
  if (source.definitions[tableName]) {
    if (source.definitions[tableName].schema.schema[viaName]) {
      check = source.definitions[tableName].schema.schema[viaName]
    }
  }
  return check
}

const convert = (table, source, attr, columnName) => {

  const convert = {
    string: 'string',
    number: 'integer',
    integer: 'integer',
    bigInteger: 'bigInteger',
    array: 'json',
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
    collection: 'json',
    datetime: 'dateTime',
    objectid: 'uuid',
    mediumtext: 'text',
    longtext: 'text',
    alphanumeric: 'string',
    alphanumericdashed: 'string',
    email: 'string'
  }
  const rules = () => {
    // model waterline shim
    if (attr.model) {
      console.log('converting', attr.model, '->', convert['model'])
      attr.type = 'model'
      // columnName = null
      // return
    }
    // collection waterline shim
    else if (attr.collection) {

      // const manyToMany = source.definitions[attr.collection.type].schema.schema[attr.via.type]
      const manyToMany = checkSourceTable(source, attr.collection.type, attr.via.type)

      if (manyToMany) {
        if (attr.dominant) {
          console.log('converting', columnName, '->', 'dominant jointable ', manyToMany.collection.type + columnName + '_' + attr.collection.type + attr.via.type)
        }
        else {
          console.log('ignoring', columnName, '->', 'recessive jointable ', '_' + attr.collection.type + attr.via.type)
        }
        return
      }

      console.log('converting', columnName, '->', convert['collection'])
      attr.type = 'collection'
      if (_.isPlainObject(columnName)) {
        console.log(columnName)
        // convert columnName to possible join table

        //Remove the columnName for knex
      }
      columnName = null
      // return
    }
    else {
      console.log('converted:', attr.type, '->', convert[attr.type])
    }

    return table[convert[attr.type]](columnName)
  }
  return rules()
}
const chain = (table, source, attr, value) => {
  const chain = {
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
    first: 'first',
    after: 'after',
    comment: 'comment',
    collate: 'collate',

    // waterline shim
    allowNullTrue: 'nullable',
    allowNullFalse: 'notNullable',
    requiredTrue: 'notNullable',
    requiredFalse: 'nullable',
    primaryKey: 'primary'
  }
  const rules = () => {
    // join table waterline shim
    if (['model','collection','via','dominant'].indexOf(attr) > -1) {
      return
    }
    // allowNull waterline shim
    if (attr == 'allowNull') {
      if (value) {
        attr = 'allowNullTrue'
      }
      else {
        attr = 'allowNullFalse'
      }
    }
    // required waterline shim
    if (attr == 'required') {
      if (value) {
        attr = 'requiredTrue'
      }
      else {
        attr = 'requiredFalse'
      }
    }
    console.log('chain:', attr, '->', chain[attr])
    return table[chain[attr]](value)
  }
  return rules()

}
module.exports = {
  /**
   * build Knex Table for model
   * @param {Function} table
   * @param {Object} model
   */
  buildTable(store, table, model){
    const schema = model.schema.schema
    const idAttribute = model.idAttribute

    if (!schema[idAttribute]) {
      table.increments(idAttribute).primary()
    }
    _.each(schema, (thisschema, columnName) => {
      let column
      try {
        // column = table[convert[value.type]](attribute)
        column = convert(table, store, thisschema, columnName)
      }
      catch (e) {
        console.error(e,thisschema,columnName)
      }
      if (column) {
        _.each(thisschema, (v, a) => {
          if (a !== 'type') {
            try {
              // column[chainable[a]](v)
              chain(column, schema, a, v)
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
  syncModel (store, connection, model, force) {
    if (force) {
      connection.schema.dropTableIfExists(model.tableName)
    }
    _.each(model.schema.schema, (columnName) => {
      if (connection.schema.hasColumn(model.tableName, columnName)) {
        this.alterColumn(connection, model, columnName)
      }
      else {
        this.addColumn(store, connection, model, columnName)
      }
    })
  },
  /**
   * alter Knex Model column
   * @param {Object} connection
   * @param {Object} model
   * @param {String} columnName
   */
  alterColumn (store, connection, model, columnName) {
    if (connection.schema.hasColumn(model.tableName, columnName)) {
      connection.schema.table(model.tableName, (table) => {
        table.dropColumn(columnName)

        const schema = model.schema.schema
        const thisschema = schema[columnName]

        let column
        try {
          // column = table[convert[schema.type]](columnName)
          column = convert(table, store, thisschema, columnName)
        }
        catch (e) {
          console.log(e,thisschema.type,columnName)
        }
        if (column) {
          _.each(thisschema, (v, a) => {
            if (a !== 'type') {
              try {
                // column[chainable[a]](v)
                chain(column, schema, a, v)
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
  addColumn (store, connection, model, columnName) {
    if (!connection.schema.hasColumn(model.tableName, columnName)) {
      connection.schema.table(model.tableName, (table) => {
        const schema = model.schema.schema
        const thisschema = schema[columnName]

        let column
        try {
          // column = table[convert[schema.type]](columnName)
          column = convert(table, store, thisschema, columnName)
        }
        catch (e) {
          console.log(e,columnName)
        }
        if (column) {
          _.each(thisschema, (v, a) => {
            if (a !== 'type') {
              try {
                // column[chainable[a]](v)
                chain(column, schema, a, v)
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
  removeColumn (store, connection, model, columnName) {
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
          this.buildTable(store, t, model)
        })
      })
    )
  }
}
