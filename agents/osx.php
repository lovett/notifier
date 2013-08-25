<?php

error_reporting(E_ALL);

chdir(dirname(__DIR__));

require 'vendor/autoload.php';
require 'agents/Agent.php';

$config = parse_ini_file('config.ini', true);

$message_handler = function($message) use ($config) {
    $message = json_decode($message);

    $title = escapeshellarg($message->title);
    $body = escapeshellarg($message->body);

    print "terminal-notifier -message $body -title $title";

    if (!empty($message->url)) {
        $url = escapeshellarg($message->url);
        print " -open $url ";
    }

    print "\n";

    print "say $body\n";
};

$agent = new Agent($config);
$agent->setMessageHandler($message_handler);
$agent->subscribe();