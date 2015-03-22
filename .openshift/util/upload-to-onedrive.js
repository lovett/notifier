#!/usr/bin/env node

// OneDrive API documentation: http://onedrive.github.io
// needle HTTP client documentation: https://github.com/tomas/needle

var needle = require('needle');
var path = require('path');
var fs = require('fs');
var nconf = require('nconf');

var backupFile = process.argv[2];
const API_ROOT = 'https://api.onedrive.com/v1.0';

if (!backupFile) {
    console.log('The file to back up was not specified');
    process.exit(1);
}

/**
 * Application configuration
 * --------------------------------------------------------------------
 * Configuration settings related OneDrive OAuth will be read from
 * environment variables or the env.json file used by the notifier
 * server.
 */
nconf.env();

if (process.env.NODE_ENV) {
    nconf.file('env-' + process.env.NODE_ENV + '.json');
} else {
    nconf.file(path.resolve(__dirname + '/../../env.json'));
}

/**
 * OAuth tokens
 * --------------------------------------------------------------------
 * OAuth tokens are read from a separate JSON file. This file was
 * created by the /authorize/onedrive/finish endpoint.
 *
 * If the file is not readable, authorization has not yet occurred and
 * no backup can occur.
 *
 * If the file is readable, the tokens are made available through nconf.
 */
fs.readFile(nconf.get('ONEDRIVE_AUTH_FILE'), 'utf8', function (err, data) {
    if (err) {
        console.log(err);
        process.exit(1);
    }

    var tokens = JSON.parse(data);

    nconf.set('ONEDRIVE_REFRESH_TOKEN', tokens.refresh_token);
    nconf.set('ONEDRIVE_ACCESS_TOKEN', tokens.access_token);

    refreshAuthToken(function () {
        uploadFile();
        deleteStaleFiles(3);
    });
});

/**
 * Get a new OAuth access token
 * --------------------------------------------------------------------
 * Exchange the current access token for a new one.
 *
 * This is always the first step of a backup run because we don't want
 * expired tokens.
 */
function refreshAuthToken(callback) {
    needle.post('https://login.live.com/oauth20_token.srf', {
        client_id: nconf.get('ONEDRIVE_CLIENT_ID'),
        redirect_uri: nconf.get('ONEDRIVE_REDIRECT'),
        client_secret: nconf.get('ONEDRIVE_CLIENT_SECRET'),
        refresh_token: nconf.get('ONEDRIVE_REFRESH_TOKEN'),
        grant_type: 'refresh_token'
    }, function (err, resp) {
        if (err) {
            console.log(err);
            process.exit(1);
        }

        if (resp.statusCode !== 200) {
            console.log(resp.body);
            process.exit(1);
        }

        fs.writeFile(nconf.get('ONEDRIVE_AUTH_FILE'), JSON.stringify(resp.body), function (err) {
            if (err) {
                console.log(err);
                process.exit(1);
            }

            nconf.set('ONEDRIVE_REFRESH_TOKEN', resp.body.refresh_token);
            nconf.set('ONEDRIVE_ACCESS_TOKEN', resp.body.access_token);
            callback();
        });
    });
}

/**
 * Upload a file to OneDrive
 * --------------------------------------------------------------------
 * The destination folder should have been defined in env.json.
 */
function uploadFile() {
    var endpoint = API_ROOT + '/drive/root:/' + nconf.get('ONEDRIVE_PATH') + '/' + path.basename(backupFile) + ':/content';

    var readStream = fs.createReadStream(backupFile);

    needle.put(endpoint, readStream, getDefaultOptions(), function(err, resp, body) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
    });
}

/**
 * Provide the OneDrive access token to needle requests
 */
function getDefaultOptions() {
    return {
        headers: {
            Authorization: 'bearer ' + nconf.get('ONEDRIVE_ACCESS_TOKEN')
        }
    }
}

/**
 * Delete old backups
 */
function deleteStaleFiles(maxAgeInDays) {
    var endpoint = API_ROOT + '/drive/root:/' + nconf.get('ONEDRIVE_PATH') + ':/children';

    var args = {
        'select': 'id,name,lastModifiedDateTime',
        'orderby': 'lastModifiedDateTime asc'
    }

    needle.request('GET', endpoint, args, getDefaultOptions(), function (err, resp) {
        var now = new Date();
        resp.body.value.forEach(function (item) {
            var ageInDays, deletionEndpoint;

            // only consider sql.gz files
            if (item.name.substring(item.name.length - 6) !== 'sql.gz') {
                return;
            }

            ageInDays = (now - new Date(item.lastModifiedDateTime))/86400000;

            if (ageInDays < maxAgeInDays) {
                return;
            }

            deletionEndpoint = API_ROOT + '/drive/items/' + id;

            needle.delete(endpoint, null, getDefaultOptions(), function (err, resp) {
                if (err) {
                    console.log(err);
                    process.exit(1);
                }
            });
        });
    });
}
