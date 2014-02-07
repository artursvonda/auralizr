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
