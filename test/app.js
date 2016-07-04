'use strict'

const _ = require('lodash')
const smokesignals = require('smokesignals')
const Model = require('trails-model')

module.exports = _.defaultsDeep({
  pkg: {
    name: 'jsdata-trailpack-test'
  },
  api: {
    models: {
      Page: class Page extends Model {
        static config() {
          return {
            options: {

            }
          }
        }

        static schema(app) {
          return {
            name: {
              type: 'string',
              allowNull: false
            }
          }
        }
      },
      Project: class Project extends Model {
        static config() {
          return {
            options: {

            }
          }
        }
        static schema(app, Sequelize) {
          return {
            name: 'string'
          }
        }
      },
      UserProject: class UserProject extends Model {
        static schema(app) {
          return {
            status: 'string'
          }
        }
      },
      User: class User extends Model {
        static config() {
          return {
            options: {
              relations: {
                hasMany: {
                  roles: {
                    // localField is for linking relations
                    // user.roles -> array of comments of the user
                    localField: 'roles',
                    // foreignKey is the "join" field
                    // the name of the field on a role that points to its parent user
                    foreignKey: 'userId'
                  }
                }
              }
            }
          }
        }

        static schema(app) {
          return {
            name: {
              type: 'string',
              allowNull: false
            },
            password: 'string',
            displayName: 'string'
          }
        }
      },
      Role: class Role extends Model {
        static config() {
          return {
            store: 'storeoverride',
            options: {
              relations: {
                belongsTo: {
                  user: {
                    localField: 'user',
                    localKey: 'userId'
                  }
                }
              }
            }
          }
        }

        static schema(app) {
          return {
            name: 'string',
            userId: 'string'
          }
        }
      },
      ModelCallbacks: class ModelCallbacks extends Model {
        static config() {
          return {
            options: {
              beforeCreate: (values, options) => {
                if (values.dataValues.beforeCreate === 0)
                  values.beforeCreate += 1
              },
              afterCreate: (values, options) => {
                if (values.dataValues.afterCreate === 0)
                  values.afterCreate += 1
              },
              beforeUpdate: (values, options) => {
                if (values.dataValues.beforeUpdate === 0)
                  values.beforeUpdate += 1
              },
              afterUpdate: (values, options) => {
                if (values.dataValues.afterUpdate === 0)
                  values.afterUpdate += 1
              },
              beforeValidate: (values, options) => {
                if (values.dataValues.beforeValidate === 0)
                  values.beforeValidate += 1
              },
              afterValidate: (values, options) => {
                if (values.dataValues.afterValidate === 0)
                  values.afterValidate += 1
              },
              beforeDestroy: (values, options) => {

              },
              afterDestroy: (values, options) => {

              }
            }
          }
        }

        static schema(app) {
          return {
            name: 'string',
            beforeCreate: 'number',
            afterCreate: 'number',
            beforeUpdate: 'number',
            afterUpdate: 'number',
            beforeValidate: 'number',
            afterValidate: 'number'
          }
        }
      }
    }
  },
  config: {
    main: {
      packs: [
        smokesignals.Trailpack,
        require('trailpack-core'),
        require('../') // trailpack-js-data
      ]
    },
    database: {
      stores: {
        teststore: {
          host: 'localhost',
          dialect: 'sqlite',
          storage: './test/test.sqlite',
          database: 'test'
        },
        storeoverride: {
          host: 'localhost',
          dialect: 'sqlite',
          storage: './test/test.sqlite',
          database: 'test'
        }
      },
      models: {
        defaultStore: 'teststore',
        migrate: 'drop'
      }
    }
  }
}, smokesignals.FailsafeConfig)
