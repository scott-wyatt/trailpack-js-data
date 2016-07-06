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
module.exports = {

  convert (connection, table, source, attr, columnName, idAttribute){

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
      }
      // collection waterline shim
      else if (attr.collection) {

        const manyToMany = checkSourceTable(source, attr.collection.type, attr.via.type)

        if (manyToMany) {
          if (attr.dominant) {
            const joinAttribute = (manyToMany.collection.type + '_' + columnName).toLowerCase()
            const joinTableName = joinAttribute + '__' + (attr.collection.type + '_' + attr.via.type).toLowerCase()

            console.log('converting', columnName, '->', 'dominant jointable ', joinTableName)

            this.buildJoinTable(connection, joinTableName, idAttribute, joinAttribute)
          }
          else {
            console.log('ignoring', columnName, '->', 'recessive jointable or assuming is one-to-many ', '__' + (attr.collection.type + '_' + attr.via.type).toLowerCase())
          }
          return
        }

        console.log('converting', columnName, '->', convert['collection'])
        attr.type = 'collection'
        // if (_.isPlainObject(columnName)) {
        //   console.log(columnName)
        // }
        // columnName = null
        //return
      }
      else {
        console.log('converted:', attr.type, '->', convert[attr.type])
      }

      return table[convert[attr.type]](columnName)
    }
    return rules()
  },

  chain (table, schema, source, attr, value){
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
      const ignoreWaterline = ['type','model','collection','via','dominant','minLength']
      if (ignoreWaterline.indexOf(attr) > -1) {
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
      // primary waterline shim
      if (attr == 'primary' || attr == 'primaryKey') {
        return table[chain[attr]]()
      }
      // unique waterline shim
      if (attr == 'unique') {
        if (source.primary || source.primaryKey) {
          console.log('chain: ignorning unique since primary is already provided')
          return
        }
        const unique = []
        _.map(schema, (v,k) => {
          _.map(v, (val, key) =>{
            if (key == 'unique' && val) {
              unique.push(k)
              delete v[key]
            }
          })
        })
        console.log('OTHER UNIQUE VALUES', unique)
        return table.unique(unique)
      }

      console.log('chain:', attr, '->', chain[attr])

      return table[chain[attr]](value)
    }
    return rules()

  },

  /**
   * build Knex Table for model
   * @param {Function} table
   * @param {Object} model
   * @return Promise
   */
  buildTable(store, connection, table, model){
    return new Promise((resolve, reject) => {
      const schema = model.schema.schema
      const idAttribute = model.idAttribute

      if (!schema[idAttribute]) {
        table.increments(idAttribute).primary()
      }
      _.each(schema, (thisschema, columnName) => {
        let column
        try {
          // column = table[convert[value.type]](attribute)
          column = this.convert(connection, table, store, thisschema, columnName, idAttribute)
        }
        catch (e) {
          console.error(e,thisschema,columnName)
        }
        if (column) {
          _.each(thisschema, (v, a) => {
            try {
              // column[chainable[a]](v)
              this.chain(column, schema, thisschema, a, v)
            }
            catch (e) {
              console.error(e,a,v)
              reject(e)
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
      resolve(table)
    })
  },
  /**
   * build Knex Table for model
   * @param {String} tableName
   */
  buildJoinTable(connection, tableName, idAttribute, joinAttribute){
    connection.schema.createTableIfNotExists(tableName, (table) => {
      table.increments(idAttribute).primary()
      table.string(joinAttribute)
    })
  },
  /**
   * sync Knex Model
   * @param {Object} connection
   * @param {Object} model
   * @param {Boolean} force
   */
  syncModel (store, connection, model, force) {
    return new Promise((resolve, reject) => {
      if (force) {
        connection.schema.dropTableIfExists(model.tableName)
      }
      connection.schema.createTableIfNotExists('users', (table) => {
        _.each(model.schema.schema, (columnName) => {
          if (connection.schema.hasColumn(model.tableName, columnName)) {
            this.alterColumn(store, connection, model, columnName)
          }
          else {
            this.addColumn(store, connection, model, columnName)
          }
        })
        resolve(table)
      })
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

        const idAttribute = model.idAttribute
        const schema = model.schema.schema
        const thisschema = schema[columnName]

        let column
        try {
          // column = table[convert[schema.type]](columnName)
          column = this.convert(connection, table, store, thisschema, columnName, idAttribute)
        }
        catch (e) {
          console.log(e,thisschema.type,columnName)
        }
        if (column) {
          _.each(thisschema, (v, a) => {
            if (a !== 'type') {
              try {
                // column[chainable[a]](v)
                this.chain(column, schema, thisschema, a, v)
              }
              catch (e) {
                console.error(e,a,v)
              }
            }
          })
        }
      })
    }
    else {
      this.addColumn(store, connection, model, columnName)
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
        const idAttribute = model.idAttribute
        const schema = model.schema.schema
        const thisschema = schema[columnName]

        let column
        try {
          // column = table[convert[schema.type]](columnName)
          column = this.convert(connection, table, store, thisschema, columnName, idAttribute)
        }
        catch (e) {
          console.log(e,columnName)
        }
        if (column) {
          _.each(thisschema, (v, a) => {
            if (a !== 'type') {
              try {
                // column[chainable[a]](v)
                this.chain(column, schema, thisschema, a, v)
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
    return Promise.all(
      _.map(store.definitions, (model, modelName) => {
        // console.log(model.schema)
        if (force) {
          connection.schema.dropTableIfExists(model.tableName)
        }
        //connection.schema.createTableIfNotExists(model.tableName, (t) => {
        return connection.schema.createTableIfNotExists(model.tableName, (table) => {
          return this.buildTable(store, connection, table, model)
        })
      })
    )
  }
}
