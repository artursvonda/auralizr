(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
	var aur = require('./js/auralizr.js'),
		delegate = {},
		auralizr = new aur(delegate),
		peerId,
		calls = {};

	window.auralizr = auralizr;
	var impulseResponses = {
		'mausoleum' : 'https://dl.dropboxusercontent.com/u/957/IRs/converted/h.wav',
		'basement' : 'https://dl.dropboxusercontent.com/u/957/IRs/converted/s1.wav',
		'chapel' : 'https://dl.dropboxusercontent.com/u/957/IRs/converted/sb.wav',
		'stairwell' : 'https://dl.dropboxusercontent.com/u/957/IRs/converted/st.wav'
	}

	if (auralizr.userMediaSupport){
		for( var key in impulseResponses){
			auralizr.load(impulseResponses[key], key, function (key){
				var element = document.getElementsByClassName(key)[0];
				if (element) {
					enableClickFunctionality(element);
					element.innerHTML = '▶';
				}
			});
		}
	}

	var peer = new Peer({key: 'oujeb2lbj7ix80k9', debug: 3, config: {'iceServers': [
		{ url: 'stun:stun.l.google.com:19302' } // Pass in optional STUN and TURN server for maximum network compatibility
	]}});

	delegate.didGetUserStream = function(stream) {
//		var mediaStreamSource = auralizr.audioContext.createMediaStreamSource( stream );
//		mediaStreamSource.connect(merger);

		return false;
	};

	peer.on('open', function(id) {
		peerId = id;
		document.getElementById('peer-id').innerHTML = id;
	});



	var merger = auralizr.audioContext.createChannelMerger();
	merger.connect(auralizr.getConvolver());
//	merger.connect(auralizr.audioContext.destination);


	window.addEventListener('load', function () {
		var form = document.getElementById('connect-form');
		form.addEventListener('submit', function (event) {
			event.preventDefault();
			var peerId = form.getElementsByTagName('input')[0].value;
			if (calls[peerId]) {
				return;
			}

			var call = peer.call(peerId, auralizr.stream);
			connectCall(call);
		});
	});

	peer.on('call', function(call) {
		call.answer(auralizr.stream);
		connectCall(call);
	});

	function connectCall(call) {
		calls[call.id] = {
			call: call
		};
		document.getElementById('peer-list').innerHTML += '<li>Connected ' + peerId + '</li>';
		call.on('stream', function(stream) {
			var peerStream = auralizr.audioContext.createMediaStreamSource(stream);
			var gainNode = auralizr.audioContext.createGainNode();
			gainNode.gain.value = 1;
			peerStream.connect(gainNode);
			gainNode.connect(merger);
			calls[call.id].stream = peerStream;
			peerStream.connect(merger);
			window.stream = stream;
			window.peerStream = peerStream;
			peerStream.connect(auralizr.audioContext.destination);
			audio = new Audio(URL.createObjectURL(stream));
			audio.autoplay = true;
//			document.getElementsByTagName('body')[0].appendChild(audio);
			aud = auralizr.audioContext.createMediaElementSource(audio);
			aud.connect(merger);
		});
		call.on('error', function () {
			console.log(arguments);
		});
		call.on('close', function () {
			console.log(arguments);
		});
	};

	function resetAllSpans() {
		var allPlaces =  [].slice.call(document.getElementsByClassName('place'));
		allPlaces.forEach(function(element) {
			element.classList.remove('enabled');
			if (element.innerHTML === '❚❚')
				element.innerHTML = '▶';
		});
	}

	function enableThisSpan(element){
		element.classList.add('enabled');
		element.innerHTML = '❚❚';
	}

	function enableClickFunctionality(element){
		element.addEventListener('click',function(event){
			auralizr.stop();
			if (element.innerHTML === '▶'){
				resetAllSpans();
				auralizr.use(this.id);
				auralizr.start();
				enableThisSpan(element);
			}else{
				// Pause
				resetAllSpans();
			}
		}, false);
	}

})();

},{"./js/auralizr.js":2}],2:[function(require,module,exports){
;(function(){

	function auralizr(delegate) {
		var self = this;
		this.userMediaSupport = false;
		this.isMicEnabled = false;
		this.irArray = {};
		this.startRequest = false;
		this.stream = null;
		this.delegate = delegate;

		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		this.audioContext = new AudioContext();
		this.convolver = this.audioContext.createConvolver();

		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia ;

		if (! navigator.getUserMedia){
			console.log('Unfortunately, your browser doesn\'t support the getUserMedia API needed for this expiriment. Try using Chrome instead');
			return null;
		}

		this.userMediaSupport = true;

		navigator.getUserMedia( {audio:true}, function (stream) {
			self.isMicEnabled = true;
			self.stream = stream;
			var addStream = true;
			if (self.delegate && self.delegate.didGetUserStream) {
				if (self.delegate.didGetUserStream(stream) === false) {
					addStream = false;
				}
			}
			if (addStream) {
				var mediaStreamSource = self.audioContext.createMediaStreamSource( stream );
				mediaStreamSource.connect(self.convolver);
			}
			if (self.startRequest){
				self.start();
			}
		} , function(){
			console.log("Error getting audio stream from getUserMedia");
		});
	}

	auralizr.prototype.getConvolver= function() {
		return this.convolver;
	};

	auralizr.prototype.load= function(irURL, key, callback) {
		var self = this;

		var ir_request = new XMLHttpRequest();
		ir_request.open("GET", irURL, true);
		ir_request.responseType = "arraybuffer";
		ir_request.onload = function () {
			self.irArray[key] = self.audioContext.createBuffer(ir_request.response, false);
			callback(key);
		};
		ir_request.send();
	};

	auralizr.prototype.isReady= function(key) {
		return this.isMicEnabled && this.irArray.hasOwnProperty(key) && this.irArray[key] !== undefined;
	};

	auralizr.prototype.use= function(key) {
		if ( this.irArray.hasOwnProperty(key) && this.irArray[key] !== undefined)
			this.setBuffer(this.irArray[key]);
	};

	auralizr.prototype.start= function() {
		this.startRequest = true;
		if (!this.isMicEnabled){
			console.log("Couldn't start the auralizr. Mic is not enabled");
			return;
		}
		if( this.convolver.buffer === null){
			console.log("Couldn't start the auralizr. Buffer is not loaded");
			return;
		}

		console.log("Starting auralizr");
		this.convolver.connect(this.audioContext.destination);
		this.startRequest = false;

	};

	auralizr.prototype.setBuffer= function (buffer) {
		this.convolver.buffer = buffer;
	};

	auralizr.prototype.stop= function() {
		this.startRequest = false;
		console.log("Stopping auralizr");
		this.convolver.disconnect();
	};


/**
	 * Expose `auralizr`.
	 */

	if ('undefined' == typeof module) {
		window.auralizr = auralizr;
	} else {
		module.exports = auralizr;
	}

	})();

},{}]},{},[1])