# trailpack-js-data

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Code Climate][codeclimate-image]][codeclimate-url]

Trailpack for js-data ORM

Loads Application Models (in `api/models`) into the js-data ORM; Integrates with [trailpack-router](https://github.com/trailsjs/trailpack-router) to
generate Footprints for routes.

## Install

```sh
$ npm install --save trailpack-js-data
```

## Configure

```js
// config/main.js
module.exports = {
  packs: [
    // ... other trailpacks
    require('trailpack-js-data')
  ]
}
```

A basic `config/database.js` can be found here : https://github.com/trailsjs/trailpack-js-data/blob/master/archetype/config/database.js

### Models

```js
module.exports = class User extends Model {
  //More about supported schema here : http://www.js-data.io/docs/js-data-schema
  static schema (app) {
    return {
      name: { type: 'string', allowNull: false },
      password: 'string',
      displayName: 'string'
    }
  }

  static config (app) {
    return {
      migrate: 'drop', //override default models configurations if needed
      store: 'sqlite', //override default models configurations if needed
      //More informations about supported models options here : http://docs.sequelizejs.com/en/latest/docs/models-definition/#configuration
      options: {
          relations: {
            hasOne: {
              profile: {
                localField: 'profile',
                foreignKey: 'userId'
              }
            }
          },
          afterCreate: function(resource, attrs, cb){

            cb(null,resource)
          }
        }
      }
    }
  }
}
```

### Query

```js
// api/services/UserService.js
module.exports = class UserService extends Service {
  /**
   * Finds people with the given email.
   * @return Promise
   * @example {
   *    name: 'Ludwig Beethoven',
   *    email: 'someemail@email.com',
   *    favoriteColors: [
   *      { name: 'yellow', hex: 'ffff00' },
   *      { name: 'black', hex: '000000' }
   *     ]
   * }
   */
  findUser (email) {
    //More info about queries here: http://www.js-data.io/docs/query-syntaxlatest/docs/models-usage/
    return this.app.orm.User.find({ where: {email: email} })
  }
}
```

## Footprints query options
Some options can be provide as query param for the `find` method, example `GET /api/v1/user`.

### Populate 
You can add `/api/v1/user?populate=all` to populate all associations or use `/api/v1/user?populate=field1,field2` to populate only some association.

### Pagination
By settings `offset` and `limit` you can do some pagination, example `/api/v1/user?offset=10&limit=10` will return only 10 items started from 10 (id 10 to 20). 

## Contributing
We love contributions! Please check out our [Contributor's Guide](https://github.com/trailsjs/trails/blob/master/CONTRIBUTING.md) for more
information on how our projects are organized and how to get started.


## License
[MIT](https://github.com/trailsjs/trailpack-js-data/blob/master/LICENSE)

## Changelog
[Changelog](https://github.com/trailsjs/trailpack-js-data/blob/master/CHANGELOG.md)

[npm-image]: https://img.shields.io/npm/v/trailpack-js-data.svg?style=flat-square
[npm-url]: https://npmjs.org/package/trailpack-js-data
[ci-image]: https://img.shields.io/travis//trailpack-js-data/master.svg?style=flat-square
[ci-url]: https://travis-ci.org//trailpack-js-data
[daviddm-image]: http://img.shields.io/david//trailpack-js-data.svg?style=flat-square
[daviddm-url]: https://david-dm.org//trailpack-js-data
[codeclimate-image]: https://img.shields.io/codeclimate/github//trailpack-js-data.svg?style=flat-square
[codeclimate-url]: https://codeclimate.com/github//trailpack-js-data

