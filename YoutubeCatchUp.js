var fs = require('fs');
var readline = require('readline');
var {google} = require('googleapis');
var OAuth2 = google.auth.OAuth2;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtubecatchup.json
var SCOPES = ['https://www.googleapis.com/auth/youtube'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'youtubecatchup.json';

var playlistFileName = './playlist_details.json';
var playlistFile = require(playlistFileName);

var service = google.youtube('v3');

var AnjunaDeepPlaylistId = "UUbDgBFAketcO26wz-pR6OKA";
var blancPlaylistId = "UU4w5l9jyqursG7wSEdNv3bQ";
var defectedRecordsPlaylistId = "UUnOxaDXBiBXg9Nn9hKWu6aw";
var MiaMendePlaylistId = "UUwfOfj7N-EBPjwnJC6JodKg";
var MotivePlaylistId = "UUR4cuW35eyllwYml5Wwl2WQ";
var MrDeepSensePlaylistId = "UUQKAQuy1Rbj49rJMmiLigTg";
var SelectedPlaylistId = "UUFZ75Bg73NJnJgmeUX9l62g";
var SubSoulPlaylistId = "UUO3GgqahVfFg0w9LY2CBiFQ";

var YCUPlaylistId = "";
var ChannelList = [];

// Load client secrets from a local file.
fs.readFile('client_secrets.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the YouTube API.
  authorize(JSON.parse(content), updatePlaylist);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    console.log('Token stored to ' + TOKEN_PATH);
  });
  console.log('Token stored to ' + TOKEN_PATH);
}

async function updatePlaylist(auth){
    // take input to check if want to add new playlist, or just update current one
    var createNewPlaylist = await GetUserInput('Would you like to add a new playlist (y/n): ');

    if(createNewPlaylist.toLowerCase() === 'y'){
        var playlistName = await GetUserInput('Enter the title of your playlist to add to: ');
        YCUPlaylistId = await GetPlaylistId(auth, playlistName);

        // save playlistid to file
        playlistFile.playlistId = YCUPlaylistId;

        var quitFeed = false;

        while(!quitFeed){
            var channelName = await GetUserInput('Enter the username (username may be different to channel name) of the channel you wish to subscribe to or enter empty string to finish providing channel names: ');

            if(channelName != ""){
                var channelId = await GetChannelUploadsId(auth, channelName);
                ChannelList.push(channelId);
            }else{
                quitFeed = true;
            }
        }

        playlistFile.channelList = ChannelList;

        fs.writeFile(playlistFileName, JSON.stringify(playlistFile, null, 2), function(err){
            if (err) return console.log(err);
            console.log(JSON.stringify(playlistFile));
            console.log('writing to ' + playlistFileName);
        });
    }else{
        // read playlistid from file
        var fileContents = JSON.parse(fs.readFileSync(playlistFileName));
        YCUPlaylistId = fileContents.playlistId;
        ChannelList = fileContents.channelList;
    }

    // need to add the paging for this as there will often be much more than 50 in the playlist.
    var existingVideoIds = await GetPlaylistVideoIds(auth, YCUPlaylistId, 50);
    var channelVideoIds = [];

    for(let channelPlaylistId of ChannelList){
        var result = await GetPlaylistVideoIds(auth, channelPlaylistId, 5);

        for(var res of result){
            var isValid = await IsValidDuration(auth, res, 10);
            if(!existingVideoIds.includes(res) && isValid){
                channelVideoIds.push(res);
            }
        }
    }

    for(let videoId of channelVideoIds){
        var result = await AddToPlaylist(auth, YCUPlaylistId, videoId);
    }
}

async function GetUserInput(question){
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve, reject) => {
        rl.question(question, function(answer) {
            rl.close();
            resolve(answer);
        });
    });
}

async function GetPlaylistVideoIds(auth, playlistId, maxResults){
    // for when the playlist is really full I will have to add a next page token to the request
    // and keep making requests until no next page token is returned
    // this will then give the full list of videos added to the playlist
    // for now we can just use the 50 limit and one request for testing

    return new Promise((resolve, reject) => {
        service.playlistItems.list({
            auth: auth,
            part: 'contentDetails',
            playlistId: playlistId,
            maxResults: maxResults,
        }, function(err, response) {
            if(err) {
                console.log('The API returned an error: ' + err);
                return;
            }

            var result = response.data.items;
            var existingVideoIds = [];
            for(let item of result){
                existingVideoIds.push(item.contentDetails.videoId);
            }

            resolve(existingVideoIds);
        });
    });
}

async function AddToPlaylist(auth, playlistId, videoId){
    return new Promise((resolve, reject) => {
        service.playlistItems.insert({
            auth: auth,
            part: 'snippet,contentDetails',// do I need both of these
            resource: {
                "contentDetails": {
                    "videoId": videoId
                },
                "snippet": {
                    "playlistId": playlistId,
                    "resourceId": {
                        "videoId": videoId,
                        "kind": "youtube#video"
                    }
                }
            }
        }, function(err, response) {
            if(err) {
                console.log('The API returned an error: ' + err);
                return;
            }

            var result = response;

            resolve(result);
        });
    });
}

async function GetVideoDetails(auth, videoId){
    return new Promise((resolve, reject) => {
        service.videos.list({
            auth: auth,
            part: 'contentDetails',
            id: videoId
        }, function(err, response) {
            if(err) {
                console.log('The API returned an error: ' + err);
                return;
            }

            var result = response.data.items[0];

            resolve(result);
        });
    });
}

async function GetPlaylistId(auth, playlistTitle){
    return new Promise((resolve, reject) => {
        service.playlists.list({
            auth: auth,
            part: 'snippet',
            mine: true,
            maxResults: 50
        }, function(err, response){
            if(err){
                console.log('The API returned an error: ' + err);
                return;
            }

            var result = response.data.items;

            for(let playlist of result){
                if(playlist.snippet.title.toLowerCase() === playlistTitle.toLowerCase()){
                    resolve(playlist.id);
                }
            }
        });
    });
}

async function GetChannelUploadsId(auth, channelName){
    // this only works if you have the official channel username
    // channel title may be different
    // will need a request to search the channel name otherwise
    return new Promise((resolve, reject) => {
        service.channels.list({
            auth: auth,
            part: 'contentDetails',
            forUsername: channelName,
            maxResults: 5
        }, function(err, response){
            if(err){
                console.log('The API returned an error: ' + err);
                return;
            }

            var result = response.data.items;
            resolve(result[0].contentDetails.relatedPlaylists.uploads);
        });
    });
}

async function IsValidDuration(auth, videoId, limit){
    var videoDetails = await GetVideoDetails(auth, videoId);
    var duration = videoDetails.contentDetails.duration;
    var regex = /[a-zA-Z]+/g;
    var split = duration.split(regex);

    if(!duration.includes("H")){
        split = split.filter(value => value != "");
        var parsedVal = parseInt(split[0]);
        return (parsedVal <= limit);
    }else{
        return false;
    }
}