var cradle = require('cradle');
var events = require('events');
var util = require('util');

function do_nothing() {};

var Database = function Database(config, callback) {
  events.EventEmitter.call(this);
  var self = this;

  if (arguments.length < 2) {
    callback = config || do_nothing;
    config = require('./config');
  }

  this.conn = new (cradle.Connection)(config.couchdb_host, config.couchdb_port);
  this.db = this.conn.database(config.couchdb_db);

  this._maybeCreateDB(function(err, created) {
    if (err) return callback(err);

    // XXX don't get prior changes - only change from this
    // moment on.
    var feed = self.db.changes({include_docs: true});

    feed.on('error', function(err) {
      console.error(err);
      // require clients to handle error? 
      // seems weird, since we're otherwise not an event emitter
      //self.emit('error', err);
    });

    feed.on('change', function(change) {
      self.emit('change', change);
    });

    return callback(null, created);
  });

};
util.inherits(Database, events.EventEmitter);

Database.prototype._maybeCreateDB = function(callback) {
  var self = this;

  // create the db if necessary
  this.db.exists(function(err, exists) {
    if (err) return callback(err);
  
    if (! exists) {
      self.db.create(function(err, created) {

        // data design document puts timestamp in key
        // so you can do startkey/endkey queries
        self.db.save('_design/data', {
          
          // query all by timestamp
          all: {
            map: function(doc) {
                if (doc.timestamp) {
                  emit(doc.timestamp, doc);
                }
              }
            },

          // count all
          count: {
            map: function(doc) {
              emit(doc._id, 1);
            },
            reduce: function(keys, values, rereduce) {
              return sum(values);
            }

          }

        }, function(err, result) {
          return callback(null, created);
        });
      });
    } else {
      // already exists.  fine.
      return callback(null, exists);
    }
  });
};

Database.prototype.save = function save(data, callback) {
  callback = callback || do_nothing;

  this.db.save(data, callback);
};

Database.prototype.saveAll = function saveAll(listOrDict, callback) {
  // Accept either a single dictionary or a list of dictionaries

  // a list of json blobs with timestamps walks like a duck
  if (!! listOrDict.length && !! listOrDict[0].timestamp) {
    var self = this;
    var listLength = listOrDict.length;
    var i = 0;
    listOrDict.forEach(function(data) {
      self.save(data, function(err) {
        // crash on any errors
        if (err) return callback(err);

        // after all items have been saved, return
        i += 1;
        if (i === listLength) {
          return callback(null, "ok");
        }
      });
    });
  } else if (!! listOrDict.timestamp) {
    this.db.save(listOrDict, callback);
  } else {
    callback(new Error("At a minimum, a timestamp is required"));
  }
};

Database.prototype.count = function count(callback) {
  this.db.view('data/count', callback);
};

Database.prototype.fetchRange = function fetchRange(options, callback) {
  if (arguments.length === 1) {
    callback = options;
    options = {};
  }
  this.db.view('data/all', options, callback);
};

module.exports = Database;
