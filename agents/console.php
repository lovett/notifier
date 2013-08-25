<?php

error_reporting(E_ALL);

chdir(dirname(__DIR__));

require 'vendor/autoload.php';
require 'agents/Agent.php';

use Colors\Color;

$c = new Color();
$config = parse_ini_file('config.ini', true);

$message_handler = function($message) use ($config, $c) {
    $message = json_decode($message);

    $date = new DateTime($message->received);
    $date->setTimeZone(new DateTimeZone($config['agent']['timezone']));
    $date = $date->format('M d \a\t h:i A');

    $date = $c("[$date]")->green();
    printf("%s %s\n%s\n", $date, $message->title, $message->body);
    if (!empty($message->url)) {
        print $message->url . "\n";
    }
    print "\n";
    print "\x07";
};

$agent = new Agent($config);
$agent->setMessageHandler($message_handler);
$agent->getRecentMessages();
$agent->subscribe();
