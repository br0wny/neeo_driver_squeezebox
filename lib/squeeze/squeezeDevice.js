const neeoapi = require('neeo-sdk');
const config = require('./config');
const SqueezeServer = require('./server');

const lms = new SqueezeServer(config.lms.ipAddress, config.lms.port, config.lms.portTelnet);

const listLibraryBaseMenu = neeoapi.buildBrowseList({
								title: `Music Library`,
								totalMatchingItems: 1,
								browseIdentifier: ".",
								offset: 0,
								limit: 10
							})
							.addListItem({
								title: "Artists",
								//thumbnailUri: images.icon_music,
								browseIdentifier: JSON.stringify({
									path: "artists"
								})
							});

let updateCallbackReference;
const newSongCallback = async (deviceId) =>{
	let songInfo = await lms.getSongInfo(deviceId);
	if (updateCallbackReference) {
		updateCallbackReference({
			uniqueDeviceId: deviceId,
			component: 'label-artist',
			value: songInfo.artist
		});
		updateCallbackReference({
			uniqueDeviceId: deviceId,
			component: 'label-title',
			value: songInfo.title
		});
		updateCallbackReference({
			uniqueDeviceId: deviceId,
			component: 'label-album',
			value: songInfo.album
		});
		updateCallbackReference({
			uniqueDeviceId: deviceId,
			component: 'albumcover',
			value: songInfo.url
		});
	}
}

lms.setNewSongCallback(newSongCallback);

const controllerWithDiscovery = {
	getPowerState: async function getPowerState(deviceId) {
		return await lms.getPowerState(deviceId);
	},
	onButtonPressed: async function onButtonPressed(name, deviceId) {
		try{
			DebugLog(`${name} button pressed on ${deviceId}`);
			switch(name)
			{
				case 'POWER ON':
					lms.powerOn(deviceId);
					break;
				case 'POWER OFF':
					lms.powerOff(deviceId);
					break;
				case 'PLAY':
					lms.play(deviceId);
					break;
				case 'PAUSE':
					lms.pause(deviceId);
					break;
				case 'STOP':
					lms.stop(deviceId);
					break;
				case 'PREVIOUS':
				case 'CHANNEL DOWN':
					lms.previous(deviceId);
					break;
				case 'NEXT':
				case 'CHANNEL UP':
					lms.next(deviceId);
					break;
				case 'MUTE TOGGLE':
					lms.toggleMute(deviceId);
					break;
				case 'VOLUME UP':
					let volumeUp = await lms.getVolume(deviceId);
					volumeUp++;
					if(volumeUp <= 100)
						lms.setVolume(deviceId, volumeUp);
					break;
				case 'VOLUME DOWN':
					let volumeDown = await lms.getVolume(deviceId);
					volumeDown--;
					if(volumeDown >= 0)
						lms.setVolume(deviceId, volumeDown);
					break;
				case 'RANDOM TRACK':
					lms.playRandomTrack(deviceId);
					break;
				case 'RANDOM ALBUM':
					lms.playRandomAlbum(deviceId);
					break;
				default:
					if(config.squeeze.favorites.find((fav) => fav.name === name))
					{
						lms.playFavorite(deviceId, name);
					}
			}
		}
		catch(err)
		{
			DebugLog(`ButtonHanlder-Error: ${err}`);
		}
	},
	getCurrentTitle: async function getCurrentTitle(deviceId) {
		return await lms.getTitle(deviceId);
	},
	getCurrentArtist: async function getCurrentArtist(deviceId) {
		return await lms.getArtist(deviceId);
	},
	getCurrentAlbum: async function getCurrentAlbum(deviceId) {
		return await lms.getAlbum(deviceId);
	},
	getCurrentAlbumCoverUri: async function getCurrentAlbumCoverUri(deviceId) {
		let res = await lms.getSongInfo(deviceId);
		DebugLog(res.url);
		return res.url;
	},
	getCurrentPlaylist: async function getCurrentPlaylist (deviceId, params) {
		const listItems = await lms.getCurrentPlaylist(deviceId);
		const list = neeoapi.buildBrowseList({
			title: "Current Playlist",
			totalMatchingItems: listItems.length,
			browseIdentifier: params.browseIdentifier || '.',
			offset: params.offset || 0,
			limit: params.limit,
		});
		list.prepareItemsAccordingToOffsetAndLimit(listItems).map((item) => {
			list.addListItem({
				title: item.title,
				label: item.artist,
				thumbnailUri: item.url,
				actionIdentifier: JSON.stringify({
					action: "playIndex",
					index: item.index
				})
			});
		});
		return list;
	},
	actionCurrentPlaylist: function actionCurrentPlaylist (deviceId, actionId) {
		const actionIdentifier = JSON.parse(actionId.actionIdentifier);
		if(actionIdentifier.action == "playIndex")
		{
			lms.playIndex(deviceId, actionIdentifier.index);
		}
	},
	getLibraryList: async function getLibraryList (deviceId, params) {
		let browseIdentifier;
		if(params.browseIdentifier)
		{
			browseIdentifier = JSON.parse(params.browseIdentifier);
		}else{
			browseIdentifier = {path: "."};
		}
		console.log ("BROWSEING", browseIdentifier.path);

		if (browseIdentifier.path == "artists" || browseIdentifier.path == ".")
		{
			const listItems = await lms.getDatabaseArtists(deviceId);
			const list = neeoapi.buildBrowseList({
				title: "Artists",
				totalMatchingItems: listItems.length,
				browseIdentifier: params.browseIdentifier || '.',
				offset: params.offset || 0,
				limit: params.limit,
			});
			list.prepareItemsAccordingToOffsetAndLimit(listItems).map((item) => {
				list.addListItem({
					title: item.artist,
					//label: item.artist, ?? MBMB Addition Info?
					//thumbnailUri: item.url,	?? MBMB Cover ?
					browseIdentifier: JSON.stringify({
						path: "artists/albums",
						artistId: item.id,
						artistName: item.artist
					})
				});
			});
			return list;
		}else if (browseIdentifier.path == "artists/albums")
		{
			const listItems = await lms.getDatabaseAlbumsOfArtist(deviceId, browseIdentifier.artistId);
			let numOfItems = listItems.length;
			if(numOfItems > 1)
				numOfItems++;
			const list = neeoapi.buildBrowseList({
				title: browseIdentifier.artistName,
				totalMatchingItems: numOfItems,
				browseIdentifier: params.browseIdentifier || '.',
				offset: params.offset || 0,
				limit: params.limit,
			});
			list.prepareItemsAccordingToOffsetAndLimit(listItems).map((item) => {
				if(numOfItems > 1)
				{
					numOfItems = 0; //Only add one time
					list.addListItem({
						title: "All Albums",
						//label: item.artist, ?? MBMB Addition Info?
						//thumbnailUri: item.url,	?? MBMB Cover ?
						browseIdentifier: JSON.stringify({
							path: "artists/albums/titles",
							artistId: browseIdentifier.artistId,
							artistName: browseIdentifier.artistName,
							albumId: "_all",
							albumName: "All Albums"
						})
					});
				}
				list.addListItem({
					title: item.album,
					//label: item.artist, ?? MBMB Addition Info?
					thumbnailUri: item.url,
					browseIdentifier: JSON.stringify({
						path: "artists/albums/titles",
						artistId: browseIdentifier.artistId,
						artistName: browseIdentifier.artistName,
						albumId: item.id,
						albumName: item.album,
						albumUrl: item.url
					})
				});
			});
			return list;
		}else if (browseIdentifier.path == "artists/albums/titles")
		{
			let listItems;
			let listIdx = 0;
			if(browseIdentifier.albumId == "_all")
				listItems = await lms.getDatabaseSongsOfArtist(deviceId, browseIdentifier.artistId);
			else
				listItems = await lms.getDatabaseSongsOfAlbum(deviceId, browseIdentifier.albumId);
			const list = neeoapi.buildBrowseList({
				title: browseIdentifier.albumName,
				totalMatchingItems: listItems.length,
				browseIdentifier: params.browseIdentifier || '.',
				offset: params.offset || 0,
				limit: params.limit,
			});
			list.prepareItemsAccordingToOffsetAndLimit(listItems).map((item) => {
				if(browseIdentifier.albumId == "_all")
				{
					list.addListItem({
						title: item.title,
						label: item.album,
						thumbnailUri: browseIdentifier.albumUrl,
						actionIdentifier: JSON.stringify({
							path: "artists/albums/titles",
							artistId: browseIdentifier.artistId,
							artistName: browseIdentifier.artistName,
							albumId: browseIdentifier.albumId,
							albumName: browseIdentifier.albumName,
							albumUrl: browseIdentifier.albumUrl,
							titleId: item.id,
							titleName: item.title,
							listIndex: listIdx++
						})
					});
				}else{
					list.addListItem({
						title: item.title,
						//label: item.album,
						thumbnailUri: browseIdentifier.albumUrl,
						actionIdentifier: JSON.stringify({
							path: "artists/albums/titles",
							artistId: browseIdentifier.artistId,
							artistName: browseIdentifier.artistName,
							albumId: browseIdentifier.albumId,
							albumName: browseIdentifier.albumName,
							albumUrl: browseIdentifier.albumUrl,
							titleId: item.id,
							titleName: item.title,
							listIndex: listIdx++
						})
					});
				}
			});
			return list;
		}
		return listLibraryBaseMenu;
	},
	actionLibraryList: function actionLibraryList (deviceId, actionId) {
		let actionIdentifier = JSON.parse(actionId.actionIdentifier);
		if (actionIdentifier.path == "artists/albums/titles")
		{
			if(actionIdentifier.albumId == "_all")
			{
				lms.playArtistAtIndex(deviceId, actionIdentifier.artistId, actionIdentifier.listIndex);
			}else{
				lms.playAlbumAtIndex(deviceId, actionIdentifier.albumId, actionIdentifier.listIndex);
			}
		}
	},
	getFavoritesList: async function getFavoritesList (deviceId, params) {
		const listItems = await lms.getFavorites(deviceId);
		const list = neeoapi.buildBrowseList({
			title: "Favorites",
			totalMatchingItems: listItems.length,
			browseIdentifier: params.browseIdentifier || '.',
			offset: params.offset || 0,
			limit: params.limit,
		});
		list.prepareItemsAccordingToOffsetAndLimit(listItems).map((item) => {
			list.addListItem({
				title: item.name,
				thumbnailUri: item.url,
				actionIdentifier: JSON.stringify({
					action: "playFavorite",
					id: item.name
				})
			});
		});
		return list;
	},
	actionFavoritesList: function actionFavoritesList (deviceId, actionId) {
		const actionIdentifier = JSON.parse(actionId.actionIdentifier);
		if(actionIdentifier.action == "playFavorite")
		{
			lms.playFavorite(deviceId, actionIdentifier.id);
		}
	},
	discoverConectedPlayers: async function discoverConectedPlayers() {
		let players = [];
		try
		{
			lmsPlayers = await lms.getConnectedPlayers();
			lmsPlayers.forEach(player => {
				players.push({
					id: player.playerid,
					name: player.name,
					reachable: player.connected,
				});
			});
			DebugLog(`Discovered players ${JSON.stringify(players)}`);
		}
		catch(e)
		{
			DebugLog(`No players found`);
		}
		return players;
	}
}

var squeezeDevice = neeoapi.buildDevice('LMS')
	.setManufacturer('Logitech')
	.setType('MUSICPLAYER')

	.addPowerStateSensor( { getter: controllerWithDiscovery.getPowerState})
	.addButtonGroup('POWER')
	.addButtonGroup('TRANSPORT')
	.addButtonGroup('TRANSPORT SCAN')
	.addButtonGroup('VOLUME')
	.addButton({
		name: 'RANDOM TRACK',
		label: 'Play random track'
	})
	.addButton({
		name: 'RANDOM ALBUM',
		label: 'Play random album'
	})
	.addButtonHandler(controllerWithDiscovery.onButtonPressed)
	.addTextLabel({
		name: 'label-title',
		label: 'Title'
	}, controllerWithDiscovery.getCurrentTitle)
	.addTextLabel({
		name: 'label-artist',
		label: 'Artist'
	}, controllerWithDiscovery.getCurrentArtist)
	.addTextLabel({
		name: 'label-album',
		label: 'Album'
	}, controllerWithDiscovery.getCurrentAlbum)
	.addImageUrl({
		name: 'albumcover',
		size: 'large'
	}, controllerWithDiscovery.getCurrentAlbumCoverUri)
	.registerSubscriptionFunction((updateCallback) => {
		updateCallbackReference = updateCallback;
	})
	.addDirectory({
		name: 'Current Playlist',
		label: 'Current Playlist'
	}, {
		getter: controllerWithDiscovery.getCurrentPlaylist,
		action: controllerWithDiscovery.actionCurrentPlaylist
	})
	.addDirectory({
		name: 'Music Library',
		label: 'Music Library'
	}, {
		getter: controllerWithDiscovery.getLibraryList,
		action: controllerWithDiscovery.actionLibraryList
	})
	.addDirectory({
		name: 'Favorites',
		label: 'Favorites'
	}, {
		getter: controllerWithDiscovery.getFavoritesList,
		action: controllerWithDiscovery.actionFavoritesList
	})
	.enableDiscovery({
		headerText: 'Add network players you want to control',
		description: 'The players have to be switched on'
	}, controllerWithDiscovery.discoverConectedPlayers);

config.squeeze.favorites.forEach( fav => squeezeDevice.addButton({
	name: fav.name,
	label: fav.name
}));

const DebugLog = (output) => {
	console.log("SqueezeDriver: " + output);
}

module.exports = {
	squeezeDevice
}