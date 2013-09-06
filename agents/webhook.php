<?php

error_reporting(E_ALL);

chdir(dirname(__DIR__));

require 'vendor/autoload.php';
require 'agents/Agent.php';

$config = parse_ini_file('config.ini', true);

$shortopts = '';
$longopts = array('url:');

$options = getopt($shortopts, $longopts);

if (!array_key_exists('url', $options)) {
    exit("A url must be specified via the --url argument.\n");
}

$endpoint = $options['url'];

$message_handler = function($message) use ($config, $endpoint) {

    $params = array();
    $params['http'] = array();
    $params['http']['method'] = 'POST';
    $params['http']['content'] = $message;
    $params['http']['header'] = 'Content-type: application/json';

    $context = stream_context_create($params);
    $fp = @fopen($endpoint, 'rb', false, $context);

    if ($fp) {
        fclose($fp);
    }
};

$agent = new Agent($config);
$agent->setMessageHandler($message_handler);
$agent->subscribe();