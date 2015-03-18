#!/usr/bin/env node

var needle = require('needle');
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
needle.post('https://login.live.com/oauth20_token.srf', {
    client_id: clientId,
    redirect_uri: redirectUri,
    client_secret: clientSecret,
    refresh_token: credentials.refresh_token,
    grant_type: 'refresh_token'
}, function (error, response) {
    if (!error && response.statusCode == 200) {
        fs.writeFileSync(credentialsFile, response.body);
    }

    credentials = JSON.parse(response.body);

    fetchRootFolder();
});

function apiUrl(path) {
    return 'https://apis.live.net/v5.0' + path;
}

function fetchRootFolder() {
    needle.get(apiUrl('/me/skydrive/search'),  {
        q: process.env.ONEDRIVE_BACKUP_DIR,
        limit: 1,
        access_token: credentials.access_token
    }, function (error, response) {
        if (error) {
            console.log(error);
        } else {
            var result = JSON.parse(response.body);
            var destinationFolderId = result.data[0].id;

            findStaleFiles(destinationFolderId);
            uploadFile(destinationFolderId, backupFile);
            uploadFile(destinationFolderId, credentialsFile);
        }
    });
}

function uploadFile(folderId, file) {
    var fileName = path.basename(file);
    fs.createReadStream(file).pipe(needle.put(apiUrl('/' + folderId + '/files/' + fileName), {
        access_token: credentials.access_token
    }, {
        headers: {
            'Content-type': ''
        }
    }, function (error, response) {
        if (error) {
            console.log(error);
        }
    }));
}

function findStaleFiles(destinationFolderId) {
    needle.get(apiUrl('/' + destinationFolderId + '/files'), {
        access_token: credentials.access_token
    }, function (error, response) {
        var result;
        
        if (error) {
            console.log(error);
        } else {
            result = JSON.parse(response.body);
            
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
    needle.delete(apiUrl('/' + fileId), {
        access_token: credentials.access_token
    }, function (error, response) {
        if (error) {
            console.log(error);
        }
    });
}
