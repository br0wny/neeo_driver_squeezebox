var jayson = require('jayson');
//var inherits = require('super');
var net = require('net');

function SqueezeServer(ipAddress, port, portTelnet) {
	this.ipAddress = ipAddress;
	this.port = port;
	var jsonrpc = `http://${this.ipAddress}:${this.port}/jsonrpc.js`;
	var client = jayson.client.http(jsonrpc);
	client.options.version = 1;

	this.portTelnet = portTelnet;
	this.setNewSongCallback = null;
	var clientTelnet = net.createConnection({
		port: this.portTelnet,
		host: this.ipAddress
	}, () => {
		clientTelnet.write('listen 1\n');
	});
	clientTelnet.on('data', (data) => {
		if(this.setNewSongCallback)
		{
			var stringArray = data.toString().split(' ');
			if(stringArray.length > 3)
			{
				if(stringArray[1] == 'playlist' && stringArray[2] == 'newsong')
				{
					var deviceId = stringArray[0].split('%3A').join(':');
					DebugLog('New Song on: ' + deviceId);
					this.setNewSongCallback(deviceId);
				}
			}
		}
	});

	this.setNewSongCallback = function (callback){
		this.setNewSongCallback = callback;
	}

	this.requestAsync = async function(player, params) {
		return new Promise((resolve, reject) => {
			var finalParams = [];
			finalParams.push(player);
			finalParams.push(params);
			DebugLog('Request: ' + finalParams.join(' '));
			client.request('slim.request', finalParams, null, function (err, reply) {
				if (err)
				{
					reject(reply);
				}
				resolve(reply);
			});
		});
	};

	this.getConnectedPlayers = async function() {
		let res = await this.requestAsync(null, ["players", 0, 100]);
		return Promise.resolve(res.result.players_loop);
	}

	this.getPowerState = async function(playerId) {
		let res = await this.requestAsync(playerId, ["power", "?"]);
		return Promise.resolve(res.result._power);
	};

	this.powerOn = async function(playerId) {
		return this.requestAsync(playerId, ["power", "1"]);
	};

	this.powerOff = async function(playerId) {
		return this.requestAsync(playerId, ["power", "0"]);
	};

	this.play = async function(playerId) {
		return this.requestAsync(playerId, ["play"]);
	};

	this.pause = async function(playerId) {
		return this.requestAsync(playerId, ["pause"]);
	};

	this.stop = async function(playerId) {
		return this.requestAsync(playerId, ["stop"]);
	};

	this.previous = async function(playerId) {
		return this.requestAsync(playerId, ["playlist", "index", "-1"]);
	};

	this.next = async function(playerId) {
		return this.requestAsync(playerId, ["playlist", "index", "+1"]);
	};

	this.playIndex = async function(playerId, index) {
		return this.requestAsync(playerId, ["playlist", "index", index]);
	};

	this.setVolume = async function(playerId, volume) {
		return this.requestAsync(playerId, ["mixer", "volume", volume]);
	};

	this.getVolume = async function(playerId) {
		let res = await this.requestAsync(playerId, ["mixer", "volume", "?"]);
		return Promise.resolve(res.result._volume);
	};

	this.toggleMute = async function(playerId) {
		return this.requestAsync(playerId, ["mixer", "muting"]);
	};

	this.playRandomTrack = async function(playerId) {
		return this.requestAsync(playerId, ["randomplay", "tracks"]);
	};

	this.playArtistAtIndex = async function(playerId, albumId, index) {
		return this.requestAsync(playerId, ["playlistcontrol", "cmd:load", "artist_id:" + albumId, "play_index:" + index]);
	};

	this.playRandomAlbum = async function(playerId) {
		return this.requestAsync(playerId, ["randomplay", "albums"]);
	};

	this.playAlbum = async function(playerId, albumId) {
		return this.requestAsync(playerId, ["playlistcontrol", "cmd:load", "album_id:" + albumId]);
	};

	this.playAlbumAtIndex = async function(playerId, albumId, index) {
		return this.requestAsync(playerId, ["playlistcontrol", "cmd:load", "album_id:" + albumId, "play_index:" + index]);
	};

	this.playTitle = async function(playerId, trackId) {
		return this.requestAsync(playerId, ["playlistcontrol", "cmd:load", "track_id:" + trackId]);
	};

	this.getTitle = async function(playerId) {
		let res = await this.requestAsync(playerId, ["title", "?"]);
		return Promise.resolve(res.result._title);
	};

	this.getArtist = async function(playerId) {
		let res = await this.requestAsync(playerId, ["artist", "?"]);
		return Promise.resolve(res.result._artist);
	};

	this.getAlbum = async function(playerId) {
		let res = await this.requestAsync(playerId, ["album", "?"]);
		return Promise.resolve(res.result._album);
	};

	this.getSongInfo = async function(playerId) {
		let resArtist = await this.requestAsync(playerId, ["artist", "?"]);
		let resAlbum = await this.requestAsync(playerId, ["album", "?"]);
		let resTitle = await this.requestAsync(playerId, ["title", "?"]);
		let url = await this.getCoverUrl(playerId, resArtist.result._artist, resAlbum.result._album, resTitle.result._title);
		return Promise.resolve({
			url,
			artist: resArtist.result._artist || '',
			title: resTitle.result._title || '',
			album: resAlbum.result._album || ''
		});
	};

	this.getCoverUrl = async function(playerId, artist, album, title) {
		artist = removeUnsupportedChar(artist);
		album = removeUnsupportedChar(album);
		title = removeUnsupportedChar(title);
		let resRemoteStream = await this.requestAsync(playerId, ["remote", "?"]);
		if(resRemoteStream.result._remote == 1)
			return `http://${this.ipAddress}:${this.port}/music/current/cover.jpg?player=${playerId}?noCache=true`;
		
		let res = await this.requestAsync(playerId, ["albums", "0", "10", "tags:j", `search:${artist} ${album} ${title}`]);
		DebugLog(JSON.stringify(res.result.albums_loop));
		return `http://${this.ipAddress}:${this.port}/music/${res.result.albums_loop[0].artwork_track_id}/cover.jpg`;
	};

	this.getFavorites = async function(playerId) {
		let res = await this.requestAsync(playerId, ["favorites", "items", "0", "50", "want_url:1"]);
		DebugLog(JSON.stringify(res.result.loop_loop));
		return Promise.resolve(res.result.loop_loop);
	};

	this.getApps = async function(playerId) {
		let res = await this.requestAsync(playerId, ["apps", "0", "50"]);
		DebugLog(JSON.stringify(res.result.appss_loop));
		return Promise.resolve(res.result.appss_loop);
	};

	this.getRadios = async function(playerId) {
		let res = await this.requestAsync(playerId, ["radios", "0", "50"]);
		DebugLog(JSON.stringify(res.result.radioss_loop));
		return Promise.resolve(res.result.radioss_loop);
	};

	this.playFavorite = async function(playerId, favorite) {
		return this.requestAsync(playerId, ["favorites", "playlist", "play", "item_id:" + favorite]);
	};

	this.getCurrentPlaylist = async function(playerId) {
		let resNumTracks = await this.requestAsync(playerId, ["playlist", "tracks", "?"]);
		let resCurrentIndex = await this.requestAsync(playerId, ["playlist", "index", "?"]);
		let playlist = [];
		for (let i = 0; i < resNumTracks.result._tracks; i++) {
			let resRemote = await this.requestAsync(playerId, ["playlist", "remote", i.toString(), "?"]);
			let resArtist = await this.requestAsync(playerId, ["playlist", "artist", i.toString(), "?"]);
			let resTitle = await this.requestAsync(playerId, ["playlist", "title", i.toString(), "?"]);
			
			if(resRemote.result._remote == 0)
			{
				let resAlbum = await this.requestAsync(playerId, ["playlist", "album", i.toString(), "?"]);
				let url = await this.getCoverUrl(playerId, resArtist.result._artist, resAlbum.result._album, resTitle.result._title);

				if(i == resCurrentIndex.result._index)
					resTitle.result._title = "PLAYING " + resTitle.result._title;

				playlist.push({
					artist: resArtist.result._artist,
					title: resTitle.result._title,
					album: resAlbum.result._album,
					index: i,
					url
				});
			}else{
				if(i == resCurrentIndex.result._index)
					resTitle.result._title = "PLAYING " + resTitle.result._title;
				
				playlist.push({
					artist: resArtist.result._artist,
					title: resTitle.result._title,
					album: "",
					index: i,
					url: ""
				});
			}
		}
		DebugLog("Current Playlist: " + JSON.stringify(playlist));
		return playlist;
	};

	this.getDatabaseArtists = async function(playerId) {
		let res = await this.requestAsync(playerId, ["artists", "0", "10000"]);
		DebugLog("Database Artists: " + JSON.stringify(res.result.artists_loop));
		return Promise.resolve(res.result.artists_loop);
	};

	this.getDatabaseAlbumsOfArtist = async function(playerId, artistId) {
		let res = await this.requestAsync(playerId, ["albums", "0", "100", "artist_id:" + artistId, "tags:jl"]);

		let mappedRes = [];
		res.result.albums_loop.map((item) => {
			mappedRes.push({
				id: item.id,
				album: item.album,
				url: `http://${this.ipAddress}:${this.port}/music/${item.artwork_track_id}/cover.jpg`
			});
		});
		DebugLog("Database Albums of Artist: " + JSON.stringify(mappedRes));
		return Promise.resolve(mappedRes);
	};

	this.getDatabaseSongsOfAlbum = async function(playerId, albumId) {
		let res = await this.requestAsync(playerId, ["songs", "0", "10000", "album_id:" + albumId, "sort:albumtrack"]);
		DebugLog("Songs of Album: " + JSON.stringify(res.result.titles_loop));
		return Promise.resolve(res.result.titles_loop);
	};

	this.getDatabaseSongsOfArtist = async function(playerId, artistId) {
		let res = await this.requestAsync(playerId, ["songs", "0", "10000", "artist_id:" + artistId, "sort:albumtrack"]);
		DebugLog("Songs of Artist: " + JSON.stringify(res.result.titles_loop));
		return Promise.resolve(res.result.titles_loop);
	};
};

const removeUnsupportedChar = (str) => {
	return str.replace("–", " ").replace("’", " ");
}

const DebugLog = (output) => {
	console.log("SqueezeServer: " + output);
};

module.exports = SqueezeServer;
