_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g
};

var Blob = Backbone.Model.extend({});
var BlobCollection = Backbone.Collection.extend({model: Blob});
var Stream = Backbone.Model.extend({});
var App = Backbone.Model.extend({});


var BlobView = Backbone.View.extend({
  model: Blob,

  tagName: 'div',

  template: _.template( $('#blob-template').html() ),

  className: 'blob',

  initialize: function() {
    _.bindAll(this, 'render');
    return this;
  },

  render: function() {
    var model = new Blob();
    $(this.el).html(this.template(this.model.toJSON()));
    return this;
  }
});


var StreamView = Backbone.View.extend({
  model: Stream,

  tagName: 'div',

  el: $('#stream'),

  events: {
    'receiveBlob': 'receiveBlob'
  },

  initialize: function() {
    this.blobs = new BlobCollection();

    _.bindAll(this, 'render');
    return this;
  },

  render: function() {
  },

  receiveBlob: function(data) {
    var blob = new Blob(data);
    var view = new BlobView({model: blob});

    this.blobs.add(blob);
    $(this.el).prepend(view.render().el);
  }
});

var AppView = Backbone.View.extend({
  model: App,

  el: $('#content'),

  initialize: function() {
    var stream = new StreamView();
    var socket = io.connect();
    socket.on('connect', function() {
      // w00t
    });
    socket.on('change', function(change) {
      stream.receiveBlob(change);
    });

    this.socket = socket;

    _.bindAll(this, 'render');
    return this;
  },

  render: function() {
    return this;
  },
});