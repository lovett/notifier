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

    print $c("[$date]")->green();
    print ' ';

    if ($message->group == 'reminder') {
        print $c($message->title)->cyan();
        print "\n";
    } else {
        print $c($message->title)->yellow();
        print "\n";
    }

    print $message->body;
    print "\n";

    if (!empty($message->url)) {
        print $c($message->url)->red() . "\n";
    }

    print "\n";
    print "\x07";
};

$agent = new Agent($config);
$agent->setMessageHandler($message_handler);
$agent->getRecentMessages();
$agent->subscribe();
