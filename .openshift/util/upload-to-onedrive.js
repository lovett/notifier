#!/usr/bin/env node

var request = require('request');
var util = require('util');
var path = require('path');
var fs = require('fs');

var backupFile = process.argv[2];

var credentialsFile = process.env.OPENSHIFT_DATA_DIR + 'onedrive.json';

var clientId = process.env.ONEDRIVE_CLIENT_ID;

var credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));

var redirectUri = process.env.ONEDRIVE_REDIRECT_URI;

var clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;

var now = new Date();

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

    fetchRootFolder();
});

function apiUrl(path) {
    return 'https://apis.live.net/v5.0' + path;
}

function fetchRootFolder() {
    request.get({
        url: apiUrl('/me/skydrive/search'),
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

            findStaleFiles(destinationFolderId);
            uploadFile(destinationFolderId, backupFile);
            uploadFile(destinationFolderId, credentialsFile);
        }
    });
}

function uploadFile(folderId, file) {
    var fileName = path.basename(file);
    fs.createReadStream(file).pipe(request.put({
        url: apiUrl('/' + folderId + '/files/' + fileName),
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
    }));
}

function findStaleFiles(destinationFolderId) {
    request.get({
        url: apiUrl('/' + destinationFolderId + '/files'),
        qs: {
            access_token: credentials.access_token
        }
    }, function (error, response, body) {
        var result;
        
        if (error) {
            console.log(error);
        } else {
            result = JSON.parse(body);
            
            result.data.forEach(function (file) {

                // only consider sql.gz files
                if (file.name.substring(file.name.length - 6) !== 'sql.gz') {
                    return;
                }
                
                var ageInDays = (now - new Date(file.created_time))/86400/1000;

                if (ageInDays > 3) {
                    deleteFile(file.id);
                }
            });
        }
    });
}

function deleteFile(fileId) {
    request.del({
        url: apiUrl('/' + fileId),
        qs: {
            access_token: credentials.access_token
        }
    }, function (error, response, body) {
        if (error) {
            console.log(error);
        }
    });
}
