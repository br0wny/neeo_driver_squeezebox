# NEEO driver for Logitech Media Server / Squeezebox

This is a NEEO driver for Logitech Media Server / Squeezebox.

It's a fork from https://github.com/clegendre/neeo_driver_squeezebox with many changes:

 - Async/Await for Req/Res
 - Telnet-Listener for notifications (New Song) --> Current Song info is updated when a new song is played
 - Changed Neeo "DeviceBuilding" use discovery
 - Neeo Brain is discovered automatically (not working on Windows: use neeoSdkOptions in package.json)
 - Added Directorys for Current Playlist/Favorites/Music Library
 - Changed structure to use NEEO CLI


## Instructions
### Step 1
Edit config.js file (devices/config.js) to configure LMS ip address and port.
Edit package.json remove/configure brainHost in neeoSdkOptions.

### Step 2
Install the used packages.
```
npm i
```
Start the driver

```
npm start
```

### Step 3
SqueezeBox Players are dynamically discovered. Search for the device "LMS", choose it and then the discovered players are listed.

### STEP 4
Open player from home screen and add shortcuts:
 - Transport (Play/Stop/Pause)
 - Transport w/o Stop (Play/Pause)
 - Transport Scan (Previous/Next)
 - Play random album
 - Play random track
 - Favorites (Added in config.js / displayed as buttons)
 - Current Song:
   + Artist
   + Title
   + Album
   + Album cover
 - Directorys:
   + Current Playlist
   + Favorites
   + Music Library
