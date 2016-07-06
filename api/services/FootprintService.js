/* eslint no-console: [0, { allow: ["log","warn", "error"] }] */
'use strict'

const _ = require('lodash')
const Service = require('trails-service')
const ModelError = require('../../lib').ModelError

const manageError = err => {
  if (err.code === 'SQLITE_CONSTRAINT' || err.code === 'SQLITE_ERROR') {
    return Promise.reject(new ModelError('E_VALIDATION', err.message, err.errors || err))
  }
  else if (err.name === 'JSDATA_ERROR') {
    return Promise.reject(new ModelError('E_VALIDATION', err.message, err.errors || err))
  }
  return Promise.reject(err)
}

/**
 * Trails Service that maps abstract ORM methods to their respective Waterine
 * methods. This service can be thought of as an "adapter" between trails and
 * Sequelize. All methods return native ES6 Promises.
 */
module.exports = class FootprintService extends Service {

  /**
   * Internal method to retreive model object
   * @param modelName name of the model to retreive
   * @returns {*} jsData model object
   * @private
   */
  _getModel(modelName) {
    return this.app.orm[modelName] || this.app.packs['js-data'].orm[modelName]
  }

  _addRelations(model, populate) {
    if (populate === true || populate === 'all') {
      return model.loadRelations()
    }

    const fields = populate.split(',')

    return model.loadRelations(fields)
  }

  /**
   * Create a model, or models. Multiple models will be created if "values" is
   * an array.
   *
   * @param modelName The name of the model to create
   * @param values The model's values
   * @param options to pass to jsData
   * @return Promise
   */
  create(modelName, values, options) {
    const Model = this._getModel(modelName)
    const modelOptions = _.defaultsDeep({}, options, _.get(this.app.config, 'footprints.models.options'))
    if (!Model) {
      return Promise.reject(new ModelError('E_NOT_FOUND', `${modelName} can't be found`))
    }

    let query
    let populate = false

    if (modelOptions.populate) {
      populate = modelOptions.populate
      delete modelOptions.populate
    }

    query = Model.create(values, modelOptions)

    if (populate) {
      this._addRelations(Model, populate)
    }

    return query.catch(manageError)
  }

  /**
   * Find all models that satisfy the given criteria. If a primary key is given,
   * the return value will be a single Object instead of an Array.
   *
   * @param modelName The name of the model
   * @param criteria The criteria that filter the model resultset
   * @param options to pass to jsData
   * @return Promise
   */
  find(modelName, criteria, options) {
    const Model = this._getModel(modelName)
    const modelOptions = _.defaultsDeep({}, options, _.get(this.app.config, 'footprints.models.options'))

    if (!Model) {
      return Promise.reject(new ModelError('E_NOT_FOUND', `${modelName} can't be found`))
    }

    let query
    let populate = false

    if (modelOptions.populate) {
      populate = modelOptions.populate
      delete modelOptions.populate
    }

    if (!_.isPlainObject(criteria) || modelOptions.findOne === true) {
      if (modelOptions.findOne === true) {
        // this.app.log.error('FIND ONE BY ID', criteria)
        query = Model.find(criteria, modelOptions)
      }
      else {
        // this.app.log.error('FIND ONE BY CRITERIA', criteria)
        query = Model.find(criteria, modelOptions)
      }
    }
    else {
      // this.app.log.error('FIND ALL',criteria, modelOptions)
      // criteria = {where: criteria}
      query = Model.findAll(criteria, modelOptions)
    }

    if (populate) {
      this._addRelations(Model, populate)
    }

    return query.catch(manageError)
  }

  /**
   * Update an existing model, or models, matched by the given by criteria, with
   * the given values. If the criteria given is the primary key, then return
   * exactly the object that is updated; otherwise, return an array of objects.
   *
   * @param modelName The name of the model
   * @param criteria The criteria that determine which models are to be updated   *
   * @param [id] A optional model id; overrides "criteria" if both are specified.
   * @param values to update
   * @param options extends { where: criteria } then passed to jsData
   * @return Promise
   */
  update(modelName, criteria, values, options) {
    const Model = this._getModel(modelName)

    if (!Model) {
      return Promise.reject(new ModelError('E_NOT_FOUND', `${modelName} can't be found`))
    }

    let query
    if (!criteria) {
      criteria = {}
    }

    if (_.isPlainObject(criteria)) {
      // this.app.log.error('PLAIN',criteria, values, options)
      query = Model.updateAll(criteria, values, options)
      .then(results => {
        return Model.findAll(criteria, options)
      })
    }
    else {
      criteria = {
        [Model.idAttribute]: criteria
      }
      // this.app.log.error('NOT PLAIN',criteria, values, options)
      query = Model.update(criteria, values, options)
      .then(result => {
        return Model.find(criteria, options)
      })
    }

    return query.catch(manageError)
  }

  /**
   * Destroy (delete) the model, or models, that match the given criteria.
   *
   * @param modelName The name of the model
   * @param criteria The criteria that determine which models are to be updated
   * @return Promise
   */
  destroy(modelName, criteria, options) {
    const Model = this._getModel(modelName)

    if (!Model) {
      return Promise.reject(new ModelError('E_NOT_FOUND', `${modelName} can't be found`))
    }

    let query
    if (!criteria) {
      criteria = {}
    }

    if (_.isPlainObject(criteria)) {
      // this.app.log.error('DESTROY PLAIN', criteria)
      let results
      // Find the results we are destroying so they can be returned in a footprint's way
      Model.findAll(criteria)
      .then(fResults => {
        results = fResults
      })
      query = Model.destroyAll(criteria)
      .then(dResults => {
        return results
      })
    }
    else {
      criteria = {
        [Model.idAttribute]: criteria
      }
      // this.app.log.error('DESTROY NOT PLAIN', criteria)
      let result
      Model.find(criteria)
      .then(fResult => {
        result = fResult
      })
      query = Model.destroy(criteria)
      .then(dResult => {
        return result
      })
    }

    return query.catch(manageError)
  }

  /**
   * Create a model, and associate it with its parent model.
   *
   * @param parentModelName The name of the model's parent
   * @param childAttributeName The name of the model to create
   * @param parentId The id (required) of the parent model
   * @param values The model's values
   * @return Promise
   */
  createAssociation (parentModelName, parentId, childAttributeName, values, options) {
    const parentModel = this.app.orm[parentModelName] || this.app.packs['js-data'].orm.collections[parentModelName]
    const childAttribute = parentModel.attributes[childAttributeName]
    const childModelName = childAttribute.model || childAttribute.collection
    const mergedValues = _.extend({ [childAttribute.via]: parentId }, values)

    return this.create(childModelName, mergedValues, options)
  }

  /**
   * Find all models that satisfy the given criteria, and which is associated
   * with the given Parent Model.
   *
   * @param parentModelName The name of the model's parent
   * @param childAttributeName The name of the model to create
   * @param parentId The id (required) of the parent model
   * @param criteria The search criteria
   * @return Promise
   */
  findAssociation (parentModelName, parentId, childAttributeName, criteria, options) {
    const parentModel = this.app.orm[parentModelName] || this.app.packs['js-data'].orm.collections[parentModelName]
    const childAttribute = parentModel.attributes[childAttributeName]
    const childModelName = childAttribute.model || childAttribute.collection
    const childModel = this.app.orm[childModelName] || this.app.packs['js-data'].orm.collections[childModelName]

    if (!_.isPlainObject(criteria)) {
      criteria = {
        [childModel.primaryKey]: criteria
      }
      options = _.defaults({ findOne: true }, options)
    }

    // query within the "many" side of the association
    if (childAttribute.via) {
      const mergedCriteria = _.extend({ [childAttribute.via]: parentId }, criteria)
      return this.find(childModelName, mergedCriteria, options)
    }

    // query the "one" side of the association
    const mergedOptions = _.extend({
      populate: [{
        attribute: childAttributeName,
        criteria: criteria
      }]
    }, options)
    return this.find(parentModelName, parentId, mergedOptions)
      .then(parentRecord => parentRecord[childAttributeName])
  }

  /**
   * Update models by criteria, and which is associated with the given
   * Parent Model.
   *
   * @param parentModelName The name of the model's parent
   * @param parentId The id (required) of the parent model
   * @param childAttributeName The name of the model to create
   * @param criteria The search criteria
   * @return Promise
   */
  updateAssociation (parentModelName, parentId, childAttributeName, criteria, values, options) {
    const parentModel = this.app.orm[parentModelName] || this.app.packs['js-data'].orm.collections[parentModelName]
    const childAttribute = parentModel.attributes[childAttributeName]
    const childModelName = childAttribute.model || childAttribute.collection
    const childModel = this.app.orm[childModelName] || this.app.packs['js-data'].orm.collections[childModelName]

    if (!_.isPlainObject(criteria)) {
      criteria = {
        [childModel.primaryKey]: criteria
      }
      options = _.defaults({ findOne: true }, options)
    }

    if (childAttribute.via) {
      const mergedCriteria = _.extend({ [childAttribute.via]: parentId }, criteria)
      return this.update(childModelName, mergedCriteria, values, options)
    }

    const childValues = { [childAttributeName]: values }
    return this.update(parentModelName, parentId, childValues, options)
      .then(parentRecord => {
        const childId = parentRecord[childAttributeName]
        return this.find(childModelName, childId)
      })
  }

  /**
   * Destroy models by criteria, and which is associated with the
   * given Parent Model.
   *
   * @param parentModelName The name of the model's parent
   * @param parentId The id (required) of the parent model
   * @param childAttributeName The name of the model to create
   * @param criteria The search criteria
   * @return Promise
   */
  destroyAssociation (parentModelName, parentId, childAttributeName, criteria, options) {
    const parentModel = this.app.orm[parentModelName] || this.app.packs['js-data'].orm.collections[parentModelName]
    const childAttribute = parentModel.attributes[childAttributeName]
    const childModelName = childAttribute.model || childAttribute.collection
    const childModel = this.app.orm[childModelName] || this.app.packs['js-data'].orm.collections[childModelName]

    if (!_.isPlainObject(criteria)) {
      criteria = {
        [childModel.primaryKey]: criteria
      }
    }

    // query within the "many" side of the association
    if (childAttribute.via) {
      const mergedCriteria = _.extend({ [childAttribute.via]: parentId }, criteria)
      return this.destroy(childModelName, mergedCriteria, options)
        .then(records => {
          return _.map(records, record => {
            return {
              [childModel.primaryKey]: record[childModel.primaryKey]
            }
          })
        })
    }

    // query the "one" side of the association
    return this
      .findAssociation(parentModelName, parentId, childAttributeName, criteria, options)
      .then(record => {
        return this.destroy(childModelName, record[childModel.primaryKey])
      })
      .then(destroyedRecord => {
        return {
          [childModel.primaryKey]: destroyedRecord[childModel.primaryKey]
        }
      })
  }
}
