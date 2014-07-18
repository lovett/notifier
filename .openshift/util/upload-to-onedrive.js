#!/usr/bin/env node

var request = require('request');
var util = require('util');
var path = require('path');
var fs = require('fs');

var backupFile = process.argv[2];

var credentialsFile = process.env.OPENSHIFT_DATA_DIR + 'onedrive.json';

var clientId = process.env.ONEDRIVE_CLIENT_ID;

var credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'))

var redirectUri = process.env.ONEDRIVE_REDIRECT_URI;

var clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;

// Refresh auth tokens
request.post({
    url: 'https://login.live.com/oauth20_token.srf',
    form: {
        client_id: clientId,
        redirect_uri: redirectUri,
        client_secret: clientSecret,
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token'
    }
}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        fs.writeFileSync(credentialsFile, body);
    }

    credentials = JSON.parse(body);

    fetchRootFolder()
});

function fetchRootFolder() {
    request.get({
        url: 'https://apis.live.net/v5.0/me/skydrive/search',
        qs: {
            q: process.env.ONEDRIVE_BACKUP_DIR,
            limit: 1,
            access_token: credentials.access_token
        }
    }, function (error, response, body) {
        if (error) {
            console.log(error);
        } else {
            var result = JSON.parse(body);
            var destinationFolderId = result.data[0].id;
            
            uploadFile(destinationFolderId, backupFile);
            uploadFile(destinationFolderId, credentialsFile);
        }
    });
}

function uploadFile(folderId, file) {
    var fileName = path.basename(file);
    fs.createReadStream(file).pipe(request.put({
        url: util.format('https://apis.live.net/v5.0/%s/files/%s', folderId, fileName),
        headers: {
            'Content-type': ''
        },
        qs: {
            access_token: credentials.access_token
        }
    }, function (error, response, body) {
        if (error) {
            console.log(error);
        }
    }))
}
