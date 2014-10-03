(function (window, $, Peer, _old, undefined) {
	"use strict";

	// Default config options
    // TODO separate this initialization logic from the passenger core functionality
    // maybe an init.js script or something
	var DEFAULTS = {

			env: 'local', // environment = local | remote

			debug: true,

			local: {
				peer_host: 'localhost',
				peer_port: 9000,
				peer_path: '/',

				http_host: 'http://localhost',
				http_port: 3000
			},

			remote: {
				peer_host: '54.164.53.196', // aws instance (staging)
				peer_port: 9000,
				peer_path: '/',

				http_host: null, // figure this out later
				http_port: null
			},

		},
		_dataCallbacks = [], // hold callback functions for receiving data
		_peer, _singleton;

    // Constructor
    // allows for one passenger initialization using singleton pattern
	function Passenger(options) {
		if (!_singleton) {
			this.config = $.extend(true, {}, DEFAULTS, options); // overrides config defaults
			this.setupConnections();
			this.setUserInfo();

			_singleton = this;
		}

		return _singleton;
	}

	// shortcut for proto
	Passenger.fn = Passenger.prototype;

	// initialize or modify user data
	Passenger.fn.setUserInfo = function (options) {
		this.user = $.extend(true, this.user, options);
	};

    // set a user property: setUserProperty('userid', '2345');
    Passenger.fn.setUserProperty = function (property, value) {
        this.user[property] = value;
    };

    // get a property or all properties from the user (if no property provided)
    // getUserInfo() --> return user object
    // getUserInfo('userid') --> returns user.userid
    Passenger.fn.getUserInfo = function(property) {
        return !property ? this.user : this.user[property];
    };

	// sets the old value of Passenger on the window and returns itself
	Passenger.fn.noConflict = function () {
		window.Passenger = _old;
		return Passenger;
	};

	// accepts a hash of options and overwrites the default configs
	// or the existing connections object on the instance
	Passenger.fn.setupConnections = function (options) {
		this.connections = $.extend(true, this.connections || {
			peer: {
				debug: this.config.debug ? 3 : 0,
				host: this.config[this.config.env].peer_host,
				port: this.config[this.config.env].peer_port,
				path: this.config[this.config.env].peer_path
			},

			httpServer: [
				this.config[this.config.env].http_host,
				this.config[this.config.env].http_port
			].join(':')

		}, options);
	};

	// inistantiates an new Peer object with the given options and
	// establishes 'connection' and 'data' callback functions
	Passenger.fn.initializePeer = function (options) {
		var config = $.extend(true, {}, this.connections.peer, options),
            that = this;

		_peer = new Peer(config);

		// attach handler for receiving connection from another peer
		_peer.on('connection', function (conn) {
            console.log('peer connection----');

			// loop through _dataCallbacks and call each on receiving data
			conn.on('data', function (data) {
                console.log('data------');
				for (var i = 0, fn; fn = _dataCallbacks[i++]; fn(data, conn));
			});

		});

        // once connection is open
        _peer.on('open', function (id) {
            console.log('connection open-----');
            that.setUserProperty('id', id);
            console.log('userid set to ' + id);
        });
	};

	// add data handler function to _dataCallbacks array
	Passenger.fn.onData = function (fn) {
		if ($.isFunction(fn)) {
			_dataCallbacks.push(fn);
		}
	};

	// connect to a peer given its id
	Passenger.fn.connectToPeer = function (remoteId) {
		var conn, that = this;
		if (remoteId !== _peer.id) {
			conn = _peer.connect(remoteId, {
				metadata: this.user
			});

		}
	};

    // called when a username is set.  automatically connect to all peers
	Passenger.fn.connectToAll = function () {
		var that = this;

		// get all peer ids from server and iterate over them, connecting to each
		_peer.listAllPeers(function (peers) {
            var peerId = peers.pop();
            for (var remoteId; remoteId = peers.pop(); that.connectToPeer(remoteId)) {

            }
		});
	};

	Passenger.fn.sendToPeer = function (id, data) {
		var connections = _peer.connections[id],
			i, conn;

		// iterate over connections for a given peer id and send to each
		for (i = 0; conn = connections && connections[i++]; conn.send(data));
	};

	Passenger.fn.sendToAll = function (data) {
		var connections = _peer.connections,
			remoteIds = Object.keys(connections),
			id;

            console.log('DEBUG-----------');
            console.log(this.getUserInfo('username'));
            console.log(this.getUserInfo());
            console.log(connections);

            while (id = remoteIds.pop()) {
                this.sendToPeer(id, data);
            }
	};

	window.Passenger = Passenger;

})(this, this.jQuery, this.Peer, this.Passenger);
